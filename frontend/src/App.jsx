import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { db, auth } from "./firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, updateDoc, query, where } from "firebase/firestore";
import NotoSansDevanagari from "./assets/NotoSansDevanagari-Regular.ttf?base64";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCallback } from "react";
import womenIllustration from "./assets/women-illustration.png";
import { autoFillSchemeForm, generateFormPreview, downloadFormData } from "./autoFillUtils.js";
import { getAvailableSchemes } from "./formTemplates.js";

/*
 * HACKATHON AUTO-APPROVAL SYSTEM
 * 
 * This project has been configured with auto-approval for hackathon demonstration purposes.
 * All new user registrations are automatically approved, allowing judges to immediately
 * access and test the application features without waiting for manual admin approval.
 * 
 * Key changes made:
 * - New users are created with "approved" status instead of "pending"
 * - Login system accepts both "approved" and "pending" users
 * - Admin dashboard shows auto-approval status
 * - UI indicators inform users about the auto-approval system
 */

// Print font-face and print styles for Hindi PDF/print
const printFontStyles = `
@font-face {
  font-family: 'NotoSansDevanagariPrint';
  src: url(data:font/ttf;base64,${NotoSansDevanagari}) format('truetype');
  font-weight: normal;
  font-style: normal;
}
@media print {
  body * { visibility: hidden !important; }
  #printable-log, #printable-log * { visibility: visible !important; }
  #printable-log {
    position: absolute;
    left: 0; top: 0; width: 100vw; min-height: 100vh;
    background: #fff; color: #000;
    font-family: 'NotoSansDevanagariPrint', Arial, sans-serif !important;
    padding: 2rem;
    font-size: 1.2rem;
    box-sizing: border-box;
  }
}
`;

// Add at the top, after imports
async function translateToHindi(text) {
  if (!text.trim()) return text;
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=hi&dt=t&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    return data[0]?.map(item => item[0]).join('') || text;
  } catch (e) {
    return text; // fallback to original if error
  }
}

// Add admin email (change as needed)
const ADMIN_EMAIL = "admin@yourdomain.com";

// Auto approval system for hackathon demonstration
const AUTO_APPROVAL_ENABLED = true;

// Add a simple AdminDashboard component
function AdminDashboard({ user, handleSignOut }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch pending users
  const fetchPendingUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = [];
      usersSnap.forEach(docu => {
        const data = docu.data();
        if (data.status === 'pending') {
          users.push({ id: docu.id, ...data });
        }
      });
      setPendingUsers(users);
    } catch (e) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // Approve user
  const handleApprove = async (uid) => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'approved' });
      fetchPendingUsers();
    } catch (e) {
      setError('Failed to approve user');
    }
  };

  // Reject user
  const handleReject = async (uid) => {
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'rejected' });
      fetchPendingUsers();
    } catch (e) {
      setError('Failed to reject user');
    }
  };

  if (!user || user.email !== ADMIN_EMAIL) {
    return <div style={{ padding: 40 }}>Access denied.</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#fff', padding: 0, margin: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px 0 40px' }}>
        <h2 style={{ margin: 0, fontWeight: 500, fontSize: '2rem', letterSpacing: '0.01em', textAlign: 'left' }}>ADMIN DASHBOARD</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 400 }}>Welcome {user.email}</span>
          <button onClick={handleSignOut} style={{ background: '#FFB900', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 24px', fontWeight: 'bold', fontSize: '1.08rem', cursor: 'pointer', marginLeft: '1rem' }}>Sign Out</button>
        </div>
      </div>
      {AUTO_APPROVAL_ENABLED && (
        <div style={{ 
          background: '#e8f5e8', 
          border: '2px solid #4caf50', 
          borderRadius: '8px', 
          padding: '16px', 
          margin: '16px 40px', 
          textAlign: 'center',
          color: '#2e7d32',
          fontWeight: '500'
        }}>
          🎯 <strong>Hackathon Mode:</strong> Auto-approval system is enabled for demonstration purposes. 
          All new registrations are automatically approved.
        </div>
      )}
      <div style={{ margin: '32px 40px 0 40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #f43397' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid orange', padding: '12px 0', fontSize: '1.1rem', fontWeight: 500, background: '#fff' }}>User mail</th>
              <th style={{ border: '1px solid orange', padding: '12px 0', fontSize: '1.1rem', fontWeight: 500, background: '#fff' }}>Approve/reject</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="2" style={{ textAlign: 'center', padding: 32, border: '1px solid orange' }}>Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan="2" style={{ textAlign: 'center', padding: 32, border: '1px solid orange', color: 'red' }}>{error}</td></tr>
            ) : pendingUsers.length === 0 ? (
              <tr><td colSpan="2" style={{ textAlign: 'center', padding: 32, border: '1px solid orange' }}>
                {AUTO_APPROVAL_ENABLED ? 'No pending users (Auto-approval enabled)' : 'No pending users'}
              </td></tr>
            ) : (
              pendingUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ border: '1px solid orange', padding: '16px 8px', fontSize: '1rem' }}>{u.email}</td>
                  <td style={{ border: '1px solid orange', padding: '16px 8px' }}>
                    <button onClick={() => handleApprove(u.id)} style={{ background: '#43a047', color: 'white', border: 'none', borderRadius: 4, padding: '6px 18px', marginRight: 12, fontWeight: 500, cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => handleReject(u.id)} style={{ background: '#e53935', color: 'white', border: 'none', borderRadius: 4, padding: '6px 18px', fontWeight: 500, cursor: 'pointer' }}>Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// AI Assistant Function URL
const AI_ASSISTANT_URL = 'https://us-central1-ai-health-assistant-7b5af.cloudfunctions.net/aiAssistantV2';

// Place this at the top level, after imports and before function App()
function GovtSchemeSuggestions({ user, cleanCorruptedPatientData }) {
  const [selectedPatientId, setSelectedPatientId] = React.useState('');
  const [selectedPatient, setSelectedPatient] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [schemeSuggestions, setSchemeSuggestions] = React.useState(null);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [patients, setPatients] = React.useState([]);
  
  // Auto-fill form states
  const [selectedScheme, setSelectedScheme] = React.useState('');
  const [isAutoFilling, setIsAutoFilling] = React.useState(false);
  const [autoFilledForm, setAutoFilledForm] = React.useState(null);
  const [formError, setFormError] = React.useState('');
  const [showFormPreview, setShowFormPreview] = React.useState(false);
  const [showAutoFillPopup, setShowAutoFillPopup] = React.useState(false);

  React.useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        if (!user) return;
        const q = query(collection(db, 'voiceLogs'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const patientList = [];
        querySnapshot.forEach((doc) => {
          patientList.push({ id: doc.id, ...doc.data() });
        });
        setPatients(patientList);
      } catch (err) {
        setError('मरीजों की सूची लोड नहीं हो सकी।');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatients();
  }, [user]);

  React.useEffect(() => {
    if (selectedPatientId) {
      const patient = patients.find(p => p.id === selectedPatientId);
      setSelectedPatient(patient || null);
      setSchemeSuggestions(null);
      setError('');
    }
  }, [selectedPatientId, patients]);

  const handleSuggestSchemes = async () => {
    if (!selectedPatient) return;
    
    // If suggestions already exist, hide them
    if (schemeSuggestions) {
      setSchemeSuggestions(null);
      return;
    }
    
    setIsSuggesting(true);
    setSchemeSuggestions(null);
    setError('');
    try {
      const prompt = `मरीज की जानकारी:\nनाम: ${selectedPatient.name || ''}\nआयु: ${selectedPatient.age || ''}\nलिंग: ${selectedPatient.gender || ''}\nगाँव: ${selectedPatient.village || ''}\nपरिवार के सदस्य: ${selectedPatient.familyMembers || ''}\n5 साल से कम बच्चे: ${selectedPatient.childrenUnder5 || ''}\nगर्भवती महिलाएं: ${selectedPatient.pregnantWomen || ''}\nमासिक आय: ${selectedPatient.income || ''}\nबीपीएल कार्ड: ${selectedPatient.bplCard || ''}\nआधार नंबर: ${selectedPatient.aadharNumber || ''}\nशिक्षा स्तर: ${selectedPatient.educationLevel || ''}\nमुख्य लक्षण: ${selectedPatient.symptom || ''}\n\nऊपर दी गई जानकारी के आधार पर, मरीज/परिवार के लिए कौन-कौन सी भारत सरकार की स्वास्थ्य या सामाजिक कल्याण योजनाएँ उपयुक्त हैं, बताएं। हर योजना के लिए सिर्फ नाम और एक लाइन में क्यों उपयुक्त है (हिंदी में) दें। विस्तार से नहीं, सिर्फ सूची दें।`;
      const response = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, type: 'govt_scheme_suggestion' })
      });
      const data = await response.json();
      setSchemeSuggestions(data.answer || 'कोई सुझाव नहीं मिला।');
      // Save suggestion to Firestore
      if (user && selectedPatient && data.answer) {
        try {
          await addDoc(collection(db, 'govtSchemeSuggestions'), {
            userId: user.uid,
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            village: selectedPatient.village || '',
            suggestion: data.answer,
            timestamp: new Date()
          });
        } catch (e) {
          console.error('Failed to save scheme suggestion:', e);
        }
      }
    } catch (err) {
      setError('योजनाएँ लाने में त्रुटि हुई।');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleDownload = () => {
    if (!schemeSuggestions || !selectedPatient) return;
    const text = `मरीज का नाम: ${selectedPatient.name || ''}\nगाँव: ${selectedPatient.village || ''}\n\nAI द्वारा सुझाई गई सरकारी योजनाएँ:\n${schemeSuggestions}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Govt_Schemes_${selectedPatient.name || 'patient'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Auto-fill form functions
  const handleAutoFillForm = async () => {
    if (!selectedPatient || !selectedScheme) return;
    
    setIsAutoFilling(true);
    setFormError('');
    setAutoFilledForm(null);
    setShowFormPreview(false);
    
    try {
      const result = await autoFillSchemeForm(selectedScheme, selectedPatient);
      setAutoFilledForm(result);
      setShowFormPreview(true);
    } catch (error) {
      setFormError('फॉर्म भरने में त्रुटि हुई: ' + error.message);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleDownloadForm = () => {
    if (!autoFilledForm || !selectedPatient) return;
    
    try {
      downloadFormData(autoFilledForm.formData, autoFilledForm.template, selectedPatient.name);
    } catch (error) {
      setFormError('फॉर्म डाउनलोड में त्रुटि: ' + error.message);
    }
  };

  const handleSchemeChange = (e) => {
    setSelectedScheme(e.target.value);
    setAutoFilledForm(null);
    setFormError('');
    setShowFormPreview(false);
  };

  const openAutoFillPopup = () => {
    setShowAutoFillPopup(true);
  };

  const closeAutoFillPopup = () => {
    setShowAutoFillPopup(false);
    setSelectedScheme('');
    setAutoFilledForm(null);
    setFormError('');
    setShowFormPreview(false);
  };

  return (
    <>
      {/* Main content */}
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#f8eafd', border: '2.5px solid #77107D', borderRadius: 18, padding: '2rem', boxShadow: '0 4px 24px #77107D22' }}>
        <h2 style={{ color: '#77107D', textAlign: 'center', marginBottom: '2rem' }}>Govt Scheme Suggestions</h2>
      {isLoading ? (
        <div>मरीज लोड हो रहे हैं...</div>
      ) : (
        <>
          <label style={{ fontWeight: 700, color: '#77107D' }}>मरीज चुनें:</label>
          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1.5px solid #e1b6e7', marginBottom: '1.5rem', fontSize: '1rem' }}
          >
            <option value="">-- मरीज चुनें --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.village || ''})</option>
            ))}
          </select>
          {selectedPatient && (
            <div style={{ background: '#fff', border: '1.5px solid #e1b6e7', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
              <button
                className="big-btn"
                style={{ 
                  background: schemeSuggestions ? '#f44336' : '#2196f3', 
                  color: '#fff', 
                  width: '100%', 
                  fontWeight: 700, 
                  fontSize: '1.1rem', 
                  margin: '0.5rem 0',
                  cursor: 'pointer'
                }}
                onClick={handleSuggestSchemes}
                disabled={isSuggesting}
              >
                {isSuggesting ? 'Schemes are being suggested...' : 
                 schemeSuggestions ? '👁️ Hide Schemes' : 'Suggest Govt Schemes'}
              </button>
              {schemeSuggestions && (
                <div style={{ background: '#e3f2fd', border: '1.5px solid #2196f3', borderRadius: '8px', padding: '1rem', color: '#0d47a1', fontFamily: 'NotoSansDevanagari, Arial, sans-serif', whiteSpace: 'pre-line', marginTop: '0.5rem', fontSize: '1.05rem' }}>
                  <b>AI द्वारा सुझाई गई योजनाएँ:</b>
                  <div>{schemeSuggestions}</div>
                  <button
                    className="big-btn"
                    style={{ background: '#4caf50', color: '#fff', marginTop: '1rem', fontWeight: 700 }}
                    onClick={handleDownload}
                  >
                    डाउनलोड/प्रिंट करें
                  </button>
                </div>
              )}
              {error && <div style={{ color: 'red', marginTop: '0.5rem' }}>{error}</div>}

              {/* Auto-fill Form Section */}
              <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                background: '#fff3e0', 
                border: '2px solid #ff9800', 
                borderRadius: '12px' 
              }}>
                <h3 style={{ 
                  color: '#e65100', 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem' 
                }}>
                  📋 Auto-fill Government Forms
                </h3>
                
                <button
                  className="big-btn"
                  style={{ 
                    background: '#ff9800', 
                    color: '#fff', 
                    width: '100%', 
                    fontWeight: 700, 
                    fontSize: '1.1rem', 
                    marginBottom: '1rem',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    cursor: 'pointer'
                  }}
                  onClick={openAutoFillPopup}
                >
                  🚀 Auto-fill Form खोलें
                </button>
                
                <p style={{ 
                  color: '#e65100', 
                  fontSize: '0.95rem', 
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  सरकारी फॉर्म को आसानी से भरने के लिए बटन पर क्लिक करें
                </p>

              {/* Data Cleanup Button */}
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '8px' 
              }}>
                <h4 style={{ color: '#856404', marginBottom: '0.5rem' }}>
                  🧹 Data Cleanup
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#856404', marginBottom: '1rem' }}>
                  Clean corrupted patient data in the database. This will fix issues with PDF generation.
                </p>
                <button
                  className="big-btn"
                  style={{ 
                    background: '#ffc107', 
                    color: '#000', 
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.8rem 1.5rem',
                    cursor: 'pointer'
                  }}
                  onClick={cleanCorruptedPatientData}
                >
                  🧹 Clean Corrupted Data
                </button>
              </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    
    {/* Auto-fill Form Popup */}
    {showAutoFillPopup && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '90%',
          maxHeight: '90%',
          overflow: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            onClick={closeAutoFillPopup}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '2rem',
              height: '2rem',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
          
          <h3 style={{ 
            color: '#e65100', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            paddingRight: '3rem'
          }}>
            📋 Auto-fill Government Forms
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 700, color: '#e65100', display: 'block', marginBottom: '0.5rem' }}>
              योजना चुनें:
            </label>
            <select
              value={selectedScheme}
              onChange={handleSchemeChange}
              style={{ 
                width: '100%', 
                padding: '0.7rem', 
                borderRadius: 8, 
                border: '1.5px solid #ffcc80', 
                fontSize: '1rem',
                background: '#fff'
              }}
            >
              <option value="">-- योजना चुनें --</option>
              {getAvailableSchemes().map(scheme => (
                <option key={scheme.key} value={scheme.key}>
                  {scheme.name} - {scheme.description}
                </option>
              ))}
            </select>
          </div>

          {selectedScheme && (
            <button
              className="big-btn"
              style={{ 
                background: '#ff9800', 
                color: '#fff', 
                width: '100%', 
                fontWeight: 700, 
                fontSize: '1.1rem', 
                marginBottom: '1rem',
                border: 'none',
                borderRadius: '8px',
                padding: '0.8rem',
                cursor: isAutoFilling ? 'not-allowed' : 'pointer'
              }}
              onClick={handleAutoFillForm}
              disabled={isAutoFilling}
            >
              {isAutoFilling ? '🤖 फॉर्म भर रहा है...' : '🤖 फॉर्म Auto-fill करें'}
            </button>
          )}

          {autoFilledForm && showFormPreview && (
            <div style={{ 
              background: '#e8f5e8', 
              border: '1.5px solid #4caf50', 
              borderRadius: '8px', 
              padding: '1rem', 
              color: '#2e7d32',
              marginTop: '1rem'
            }}>
              <h4 style={{ 
                color: '#2e7d32', 
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ✅ फॉर्म तैयार है!
              </h4>
              <p style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
                फॉर्म सफलतापूर्वक भर गया है। नीचे फॉर्म का प्रीव्यू देखें।
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  className="big-btn"
                  style={{ 
                    background: '#4caf50', 
                    color: '#fff', 
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.8rem 1.5rem',
                    cursor: 'pointer',
                    flex: 1
                  }}
                  onClick={handleDownloadForm}
                >
                  📄 फॉर्म डाउनलोड करें
                </button>
                <button
                  className="big-btn"
                  style={{ 
                    background: '#2196f3', 
                    color: '#fff', 
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.8rem 1.5rem',
                    cursor: 'pointer',
                    flex: 1
                  }}
                  onClick={() => setShowFormPreview(!showFormPreview)}
                >
                  {showFormPreview ? '👁️ प्रीव्यू छिपाएं' : '👁️ प्रीव्यू दिखाएं'}
                </button>
              </div>
              
              {/* Form Preview */}
              {showFormPreview && (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: generateFormPreview(autoFilledForm.formData, autoFilledForm.template) 
                  }}
                  style={{ 
                    marginTop: '1rem'
                  }}
                />
              )}
            </div>
          )}

          {formError && (
            <div style={{ 
              color: '#d32f2f', 
              marginTop: '1rem', 
              padding: '0.8rem', 
              background: '#ffebee', 
              borderRadius: '8px',
              border: '1px solid #ffcdd2'
            }}>
              {formError}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

function App() {
  // All hooks at the top
  const medicalAnalysisRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  let finalTranscript = "";
  const [reminders, setReminders] = useState([]);
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastDocId, setLastDocId] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [showReminders, setShowReminders] = useState(false);
  const [isSpeakingReminders, setIsSpeakingReminders] = useState(false);
  const [printLog, setPrintableLog] = useState(null);
  const [jitsiMeetingId, setJitsiMeetingId] = useState("");
  const [isInJitsiCall, setIsInJitsiCall] = useState(false);
  const [jitsiConnectionStatus, setJitsiConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [jitsiErrorMessage, setJitsiErrorMessage] = useState("");
  const jitsiContainerRef = useRef(null);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [user, loading] = useAuthState(auth);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const inputTextColor = '#f43397';
  // Add a new state to track the selected feature
  const [selectedFeature, setSelectedFeature] = useState('patientInfo');
  const [callActive, setCallActive] = useState(false);

  // AI Health Assistant states
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiListening, setIsAiListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiInterimTranscript, setAiInterimTranscript] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const aiRecognitionRef = useRef(null);
  const aiSpeechRef = useRef(null);
  const aiChatRef = useRef(null);
  // Add missing aiAnswer state
  const [aiAnswer, setAiAnswer] = useState("");
  // Add missing aiAudio state for AI assistant audio playback
  const [aiAudio, setAiAudio] = useState(null);

  // Medical Document Analysis states
  const [medicalDocumentType, setMedicalDocumentType] = useState('');
  const [uploadedMedicalImage, setUploadedMedicalImage] = useState(null);
  const [medicalAnalysis, setMedicalAnalysis] = useState(null);
  const [isMedicalAnalyzing, setIsMedicalAnalyzing] = useState(false);
  const [medicalAnalysisError, setMedicalAnalysisError] = useState('');
  
  // Medical Analysis Popup and Diet Plan states
  const [showMedicalAnalysisPopup, setShowMedicalAnalysisPopup] = useState(false);
  const [showDietPlanPopup, setShowDietPlanPopup] = useState(false);
  const [dietPlanFromAnalysis, setDietPlanFromAnalysis] = useState('');
  const [isGeneratingDietPlan, setIsGeneratingDietPlan] = useState(false);

  // At the top of App, after other useState/useRef hooks:
  const [voiceLogFormState, setVoiceLogFormState] = useState({});
  const [voiceLogReviewMode, setVoiceLogReviewMode] = useState(false);
  const [voiceLogSaving, setVoiceLogSaving] = useState(false);
  const [voiceLogEditAllMode, setVoiceLogEditAllMode] = useState(false);
  const [voiceLogEditAllDraft, setVoiceLogEditAllDraft] = useState({});
  // AI-powered patient entry states (only mode now)
  const [aiPatientEntryTranscript, setAiPatientEntryTranscript] = useState("");
  const [aiPatientEntryInterim, setAiPatientEntryInterim] = useState("");
  const [isAiPatientEntryListening, setIsAiPatientEntryListening] = useState(false);
  const [isAiPatientEntryProcessing, setIsAiPatientEntryProcessing] = useState(false);
  const aiPatientEntryRecognitionRef = useRef(null);
  const aiAudioRef = useRef(null);
  // 1. Add state at the top of the component
  const [remindersSubFeature, setRemindersSubFeature] = useState('check'); // 'check', 'view', 'add'

  // 1. Add new state for Patient Info submenu
  const [patientInfoSubFeature, setPatientInfoSubFeature] = useState('entry'); // 'entry' or 'history'

  // Always keep 'Voice Log' and 'Check Reminders' at the top, move clicked feature (if not those) to third position
  const fixedTopFeatures = ['patientInfo', 'reminders'];
  const [featureButtonsState, setFeatureButtonsState] = useState([
    { key: 'patientInfo', label: '🩺 Patient info' },
    { key: 'reminders', label: '📅 Reminders' },
    { key: 'medicalAnalysis', label: '📋 Medical Analysis' },
    { key: 'reports', label: '📊 ASHA Reports' },
    { key: 'govtSchemes', label: '🏛️ Govt Scheme Suggestions' },
  ]);

  // Add a ref to track if speaking should continue
  const speakingRef = useRef(false);

  // Add a loading state for translation
  const [isTranslating, setIsTranslating] = useState(false);

  // At the top of App, after other useState/useRef hooks:
  const [isReminderListening, setIsReminderListening] = useState(false);
  const [reminderInterimTranscript, setReminderInterimTranscript] = useState("");
  const reminderRecognitionRef = useRef(null);

  // Add state for admin mode and dashboard
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  // In App component, add state for admin dashboard page
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Add state for login type
  const [loginType, setLoginType] = useState('user'); // 'user' or 'admin'

  // Add state to track if user is pending approval
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const hasSetDefaultFeature = useRef(false);

  useEffect(() => {
    if (user && !hasSetDefaultFeature.current) {
      setSelectedFeature('patientInfo');
      setPatientInfoSubFeature('entry');
      hasSetDefaultFeature.current = true;
    }
    if (!user) {
      hasSetDefaultFeature.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (selectedFeature !== 'aiAssistant') {
      setAiAudio(null);
    }
  }, [selectedFeature]);

  
  // Update the useEffect to fetch reminders when reminders submenu is active
  useEffect(() => {
    const fetchReminders = async () => {
      if (selectedFeature === 'reminders' && user) {
        const querySnapshot = await getDocs(collection(db, "reminders"));
        const rems = [];
        querySnapshot.forEach((doc) => {
          rems.push({ id: doc.id, ...doc.data() });
        });
        setReminders(rems.filter(rem => rem.userId === user.uid));
      }
    };
    fetchReminders();
  }, [selectedFeature, remindersSubFeature, user]);

  // Add this useEffect to fetch history when 'history' is selected
  useEffect(() => {
    const fetchHistory = async () => {
      if ((selectedFeature === 'history' || (selectedFeature === 'patientInfo' && patientInfoSubFeature === 'history')) && user) {
        const q = query(collection(db, "voiceLogs"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const logs = [];
        querySnapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        setHistory(logs.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
      }
    };
    fetchHistory();
  }, [selectedFeature, patientInfoSubFeature, user]);

  // Simple video call using iframe approach
  useEffect(() => {
    // No need to load external scripts for iframe approach
    console.log('Video call ready - using iframe approach');
  }, []);

  // Cleanup video call when component unmounts or feature changes
  useEffect(() => {
    return () => {
      if (jitsiContainerRef.current) {
        jitsiContainerRef.current.innerHTML = '';
      }
      stopAllMediaTracks(); // Always stop media tracks when leaving feature
    };
  }, [selectedFeature]);

  // Ensure container is ready when video call is selected
  useEffect(() => {
    if (selectedFeature === 'videoCall') {
      console.log('Video call feature selected');
    }
  }, [selectedFeature]);

  // Add this useEffect to fetch reminders when 'viewReminders' is selected
  useEffect(() => {
    const fetchViewReminders = async () => {
      if (selectedFeature === 'viewReminders' && user) {
        const q = query(collection(db, "reminders"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const rems = [];
        querySnapshot.forEach((doc) => {
          rems.push({ id: doc.id, ...doc.data() });
        });
        setReminders(rems);
      }
    };
    fetchViewReminders();
  }, [selectedFeature, user]);

  // Auto-scroll chat for AI Assistant
  useEffect(() => {
    if (aiChatRef.current && (aiMessages.length > 0 || isAiProcessing)) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages, isAiProcessing]);



  // Load AI conversations when AI Assistant is selected
  useEffect(() => {
    const loadAiConversations = async () => {
      if (selectedFeature === 'aiAssistant' && user && aiMessages.length === 0) {
        try {
          const q = query(collection(db, "aiConversations"), where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const conversations = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
              // Add user message
              conversations.push({
                id: doc.id + '_user',
                text: data.userMessage,
                sender: 'user',
                timestamp: data.timestamp
              });
              // Add AI message
              conversations.push({
                id: doc.id + '_ai',
                text: data.aiResponse,
                sender: 'ai',
                timestamp: data.timestamp
              });
          });
          // Sort by timestamp and set messages
          conversations.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
          setAiMessages(conversations);
        } catch (error) {
          console.error('Failed to load AI conversations:', error);
        }
      }
    };
    loadAiConversations();
  }, [selectedFeature, user]);

  // Print handler using window.print
  const handlePrint = (log) => {
    setPrintableLog(log);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintableLog(null), 500); // Clean up after print
    }, 100); // Wait for DOM update
  };

  // Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsAuthLoading(true);
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match");
      setIsAuthLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user doc in Firestore with status 'approved' (auto approval)
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        status: "approved"
      });
      setAuthSuccess("Registration successful! Auto-approval enabled - you can now login.");
      setIsRegister(false);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsAuthLoading(true);
    try {
      // Prevent admin from logging in as user and user as admin
      if (loginType === 'admin' && email !== ADMIN_EMAIL) {
        setAuthError("Only the admin can log in as admin.");
        setIsAuthLoading(false);
        return;
      }
      if (loginType === 'user' && email === ADMIN_EMAIL) {
        setAuthError("Admin cannot log in as a user.");
        setIsAuthLoading(false);
        return;
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Check user status in Firestore (auto approval enabled)
      const userDoc = await getDocs(collection(db, "users"));
      let found = false;
      let approved = false;
      userDoc.forEach((docu) => {
        if (docu.data().uid === userCredential.user.uid) {
          found = true;
          // Auto approval: all users are automatically approved
          if (docu.data().status === "approved" || docu.data().status === "pending" || (loginType === 'admin' && userCredential.user.email === ADMIN_EMAIL)) {
            approved = true;
          }
        }
      });
      if (!found) {
        setAuthError("User record not found. Contact admin.");
        await signOut(auth);
      } else if (!approved) {
        setAuthError("Account not approved by admin yet.");
        await signOut(auth);
      } else {
        setAuthSuccess("Login successful!");
        if (loginType === 'admin' && userCredential.user.email === ADMIN_EMAIL) {
          setIsAdminMode(true);
        }
      }
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsAdminMode(false); // Hide admin login block after logout
    } catch (error) {
      setAuthError(error.message);
    }
  };

  // Loading screen JSX
  const loadingScreen = (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>Loading...</div>
        <div style={{ width: '50px', height: '50px', border: '3px solid #ffffff3d', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
      </div>
    </div>
  );

  // Auth screen JSX
  const authScreen = (
    <div className="auth-screen-bg" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Playful floating background shapes */}
      <div className="playful-bg">
        <span className="shape1"></span>
        <span className="shape2"></span>
        <span className="shape3"></span>
        <span className="shape4"></span>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: window.innerWidth < 900 ? 'column' : 'row',
        alignItems: window.innerWidth < 900 ? 'center' : 'stretch',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '1100px',
        background: 'transparent',
        boxSizing: 'border-box',
        gap: window.innerWidth < 900 ? '2.5rem' : '3.5rem',
        padding: window.innerWidth < 900 ? '2vw 0' : '2vw 0',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          flex: window.innerWidth < 900 ? 'unset' : 1.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #77107D 0%, #f3e6f5 100%)',
          minWidth: 0,
          marginBottom: window.innerWidth < 900 ? '2.5rem' : 0,
          borderRadius: '36px',
          boxShadow: '0 12px 48px 0 rgba(119,16,125,0.20)',
          border: '5px solid #f3e6f5',
          padding: window.innerWidth < 900 ? '1.5rem' : '2.2rem',
          flexDirection: 'column',
        }}>
          <img
            src={womenIllustration}
            alt="Asha+ Women Illustration"
            className="auth-illustration-img"
            style={{
              maxWidth: '99vw',
              maxHeight: window.innerWidth < 900 ? '55vh' : '420px',
              width: 'auto',
              height: 'auto',
              borderRadius: '28px',
              boxShadow: '0 8px 32px rgba(244,51,151,0.13)',
              background: '#fff',
              border: '2.5px solid #fff6fa',
              objectFit: 'contain',
              display: 'block',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              transition: 'transform 0.25s cubic-bezier(.4,2,.6,1), box-shadow 0.25s cubic-bezier(.4,2,.6,1)',
              cursor: 'pointer',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.07)';
              e.currentTarget.style.boxShadow = '0 0 32px 8px #f4339740, 0 8px 32px rgba(244,51,151,0.18)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(244,51,151,0.13)';
            }}
          />
        </div>
        <div className="glass-card" style={{
          flex: 1,
          borderRadius: '28px',
          boxShadow: '0 8px 32px rgba(119, 16, 125, 0.13)',
          padding: '2.5rem 2.5rem 2rem 2.5rem',
          maxWidth: '410px',
          width: '95vw',
          textAlign: 'center',
          border: '2.5px solid #f3e6f5',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #77107D 0%, #f3e6f5 100%)',
        }}>
          <h1 style={{
            color: '#77107D',
            fontWeight: 900,
            fontSize: '2.5rem',
            marginBottom: '0.5rem',
            letterSpacing: '0.01em',
            fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif'
          }}>Asha+</h1>
          <p style={{ color: 'black', marginBottom: '2.2rem', fontWeight: 500, fontSize: '1.08rem', textDecoration: 'underline' }}>
            {isRegister ? "Create an account" : "Login with your email and password"}
          </p>
          {isRegister && AUTO_APPROVAL_ENABLED && (
            <div style={{ 
              background: '#e8f5e8', 
              border: '2px solid #4caf50', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '1rem',
              textAlign: 'center',
              color: '#2e7d32',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              🎯 <strong>Hackathon Mode:</strong> Auto-approval enabled - instant access after registration
            </div>
          )}
          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {!isRegister && (
              <select
                value={loginType}
                onChange={e => setLoginType(e.target.value)}
                style={{
                  width: '92%',
                  padding: '0.7rem 1.2rem',
                  margin: '0.7rem 0',
                  borderRadius: '999px',
                  border: '2px solid #ffd1e3',
                  fontSize: '1.08rem',
                  background: '#fff0f6',
                  fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif',
                  outline: 'none',
                  transition: 'border 0.18s',
                  color: inputTextColor,
                }}
                disabled={isAuthLoading}
              >
                <option value="user">Login as User</option>
                <option value="admin">Login as Admin</option>
              </select>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => { setEmail(e.target.value); setAuthError(""); setAuthSuccess(""); }}
              required
              style={{
                width: '92%',
                padding: '0.9rem 1.2rem',
                margin: '0.7rem 0',
                borderRadius: '999px',
                border: '2px solid #ffd1e3',
                fontSize: '1.08rem',
                background: '#fff0f6',
                fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif',
                outline: 'none',
                transition: 'border 0.18s',
                color: inputTextColor,
              }}
              onFocus={e => e.target.style.border = '2px solid #f43397'}
              onBlur={e => e.target.style.border = '2px solid #ffd1e3'}
              disabled={isAuthLoading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(""); setAuthSuccess(""); }}
              required
              style={{
                width: '92%',
                padding: '0.9rem 1.2rem',
                margin: '0.7rem 0',
                borderRadius: '999px',
                border: '2px solid #ffd1e3',
                fontSize: '1.08rem',
                background: '#fff0f6',
                fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif',
                outline: 'none',
                transition: 'border 0.18s',
                color: inputTextColor,
              }}
              onFocus={e => e.target.style.border = '2px solid #f43397'}
              onBlur={e => e.target.style.border = '2px solid #ffd1e3'}
              disabled={isAuthLoading}
            />
            {/* Forgot Password Link (only for login, not register) */}
            {!isRegister && (
              <div style={{ textAlign: 'right', width: '92%', margin: '0 auto 0.5rem auto' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#77107D',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                    padding: 0,
                  }}
                  onClick={async () => {
                    const emailPrompt = window.prompt('Enter your email to reset password:');
                    if (emailPrompt) {
                      setAuthError("");
                      setAuthSuccess("");
                      try {
                        const { sendPasswordResetEmail } = await import('firebase/auth');
                        await sendPasswordResetEmail(auth, emailPrompt);
                        setAuthSuccess('Password reset email sent! Check your inbox.');
                      } catch (err) {
                        setAuthError(err.message || 'Failed to send reset email.');
                      }
                    }
                  }}
                  disabled={isAuthLoading}
                >
                  Forgot Password?
                </button>
              </div>
            )}
            {isRegister && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setAuthError(""); setAuthSuccess(""); }}
                required
                style={{
                  width: '92%',
                  padding: '0.9rem 1.2rem',
                  margin: '0.7rem 0',
                  borderRadius: '999px',
                  border: '2px solid #ffd1e3',
                  fontSize: '1.08rem',
                  background: '#fff0f6',
                  fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif',
                  outline: 'none',
                  transition: 'border 0.18s',
                  color: inputTextColor,
                }}
                onFocus={e => e.target.style.border = '2px solid #f43397'}
                onBlur={e => e.target.style.border = '2px solid #ffd1e3'}
                disabled={isAuthLoading}
              />
            )}
            {authError && <div style={{ color: 'red', marginBottom: '10px' }}>{authError}</div>}
            {authSuccess && <div style={{ color: 'green', marginBottom: '10px' }}>{authSuccess}</div>}
            <button
              type="submit"
              style={{
                background: '#FFB900',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                padding: '1.1rem 0',
                fontSize: '1.18rem',
                fontWeight: 800,
                cursor: isAuthLoading ? 'not-allowed' : 'pointer',
                margin: '1.2rem 0 0.5rem 0',
                width: '100%',
                boxShadow: '0 4px 18px rgba(244,51,151,0.10)',
                letterSpacing: '0.04em',
                transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                opacity: isAuthLoading ? 0.7 : 1,
              }}
              onMouseOver={e => e.target.style.background = '#ff69b4'}
              onMouseOut={e => e.target.style.background = '#f43397'}
              disabled={isAuthLoading}
            >
              {isAuthLoading ? (isRegister ? "Registering..." : "Logging in...") : (isRegister ? "Register" : "Login")}
            </button>
          </form>
          <div style={{ marginTop: '18px', fontSize: '1.05rem' }}>
            {isRegister ? (
              <span>Already have an account? <button style={{ color: '#f43397', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} onClick={() => { setIsRegister(false); setAuthError(""); setAuthSuccess(""); setEmail(""); setPassword(""); setConfirmPassword(""); }}>Login</button></span>
            ) : (
              <span>Don't have an account? <button style={{ color: '#f43397', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }} onClick={() => { setIsRegister(true); setAuthError(""); setAuthSuccess(""); setEmail(""); setPassword(""); setConfirmPassword(""); }}>Register</button></span>
            )}
          </div>
        </div>
      </div>
      {/* Show admin login if isAdminMode and not logged in as admin */}
      {isAdminMode && (!user || user.email !== ADMIN_EMAIL) ? (
        <div className="glass-card" style={{ margin: '2rem auto', maxWidth: 400, padding: 32, textAlign: 'center' }}>
          <h2>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '90%', margin: 8, padding: 8 }} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '90%', margin: 8, padding: 8 }} />
            <button type="submit" style={{ background: '#77107D', color: 'white', borderRadius: 8, padding: '8px 24px', border: 'none', fontWeight: 'bold', marginTop: 12 }}>Login</button>
          </form>
          <button onClick={() => setIsAdminMode(false)} style={{ marginTop: 16, background: '#f3e6f5', color: '#77107D', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 'bold' }}>Back</button>
          {authError && <div style={{ color: 'red', marginTop: 8 }}>{authError}</div>}
        </div>
      ) : null}
      {/* Show admin dashboard if isAdminMode and logged in as admin */}
      {isAdminMode && user && user.email === ADMIN_EMAIL ? (
        <AdminDashboard user={user} handleSignOut={handleSignOut} />
      ) : null}
    </div>
  );

  // Add these above mainAppContent
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sorry, your browser does not support Speech Recognition.");
      return;
    }
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "hi-IN"; // Change as needed

      recognitionRef.current.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript((prev) => prev + final);
        setInterimTranscript(interim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Add this above mainAppContent
  const saveTranscriptToFirestore = async (transcript) => {
    try {
      const docRef = await addDoc(collection(db, "voiceLogs"), {
        transcript: transcript,
        timestamp: new Date(),
        userId: user && user.uid ? user.uid : null
      });
      setLastDocId(docRef.id);
      // Optionally show a success message here
    } catch (e) {
      alert("Error saving transcript: " + e.message);
    }
  };

  // Function to clean corrupted patient data in database
  const cleanCorruptedPatientData = async () => {
    if (!user) return;
    
    try {
      console.log('Starting corrupted data cleanup...');
      
      // Get all patients from voiceLogs collection (where patient data is actually stored)
      const patientsRef = collection(db, 'voiceLogs');
      const q = query(patientsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      console.log(`Found ${querySnapshot.docs.length} patient records to check`);
      
      let cleanedCount = 0;
      
      for (const doc of querySnapshot.docs) {
        const patientData = doc.data();
        console.log(`Checking patient ${doc.id}:`, patientData);
        
        // Only process records that have patient-related fields
        const hasPatientFields = patientData.name || patientData.age || patientData.gender || patientData.village;
        if (!hasPatientFields) {
          console.log(`Skipping ${doc.id} - no patient fields found`);
          continue;
        }
        
        const cleanedData = validateAndCleanPatientData(patientData);
        console.log(`Cleaned data for ${doc.id}:`, cleanedData);
        
        // Check if any data was cleaned - more robust comparison
        const hasChanges = Object.keys(cleanedData).some(key => {
          const originalValue = patientData[key];
          const cleanedValue = cleanedData[key];
          
          // Handle different data types
          if (originalValue === null && cleanedValue === null) return false;
          if (originalValue === undefined && cleanedValue === null) return false;
          if (originalValue === '' && cleanedValue === null) return false;
          
          // String comparison for most fields
          const originalStr = String(originalValue || '').trim();
          const cleanedStr = String(cleanedValue || '').trim();
          
          const changed = originalStr !== cleanedStr;
          if (changed) {
            console.log(`Field "${key}" changed: "${originalStr}" -> "${cleanedStr}"`);
          }
          return changed;
        });
        
        if (hasChanges) {
          console.log(`Cleaning patient ${doc.id}:`, patientData, '->', cleanedData);
          
          // Update the document with cleaned data
          await updateDoc(doc.ref, cleanedData);
          cleanedCount++;
        } else {
          console.log(`No changes needed for patient ${doc.id}`);
        }
      }
      
      console.log(`Cleaned ${cleanedCount} patient records`);
      alert(`Successfully cleaned ${cleanedCount} patient records`);
      
      // Refresh the patients list by reloading the page
      window.location.reload();
      
    } catch (error) {
      console.error('Error cleaning corrupted data:', error);
      alert('Error cleaning corrupted data. Please try again.');
    }
  };

    // Function to validate and clean patient data before saving
  const validateAndCleanPatientData = (data) => {
    const cleaned = {};
    
    // Define validation rules for each field
    const validationRules = {
      name: {
        validate: (value) => {
          if (!value || typeof value !== 'string') return false;
          // Check for corrupted patterns
          if (value.includes('$') && value.includes('?') && value.includes('>')) return false;
          if (value.includes('$') && value.includes('&') && value.includes('>')) return false;
          if (value.length < 2) return false;
          return true;
        },
        clean: (value) => value ? value.trim() : null
      },
      age: {
        validate: (value) => {
          if (!value) return false;
          const numValue = parseInt(value);
          return !isNaN(numValue) && numValue >= 0 && numValue <= 150; // Allow 0 and up to 150
        },
        clean: (value) => {
          const numValue = parseInt(value);
          return !isNaN(numValue) ? numValue : null;
        }
      },
      gender: {
        validate: (value) => {
          if (!value || typeof value !== 'string') return false;
          // More flexible gender validation - accept any non-empty string
          return value.trim().length > 0;
        },
        clean: (value) => {
          if (!value) return null;
          const lowerValue = value.toLowerCase().trim();
          if (lowerValue.includes('male') || lowerValue.includes('पुरुष') || lowerValue.includes('m')) return 'पुरुष';
          if (lowerValue.includes('female') || lowerValue.includes('महिला') || lowerValue.includes('f')) return 'महिला';
          return value.trim(); // Keep original value if not matching standard formats
        }
      },
      village: {
        validate: (value) => {
          if (!value || typeof value !== 'string') return false;
          // Check for corrupted patterns
          if (value.includes('$') && value.includes('?') && value.includes('>')) return false;
          return value.trim().length > 0;
        },
        clean: (value) => value ? value.trim() : null
      },
      familyMembers: {
        validate: (value) => {
          if (!value) return false;
          const numValue = parseInt(value);
          return !isNaN(numValue) && numValue >= 0 && numValue <= 100; // Allow 0 and up to 100
        },
        clean: (value) => {
          const numValue = parseInt(value);
          return !isNaN(numValue) ? numValue : null;
        }
      },
      income: {
        validate: (value) => {
          if (!value) return false;
          // Allow any reasonable income value
          return true;
        },
        clean: (value) => value ? value.toString().trim() : null
      },
      bplCard: {
        validate: (value) => {
          if (!value) return false;
          // More flexible BPL validation - accept any non-empty string
          return value.toString().trim().length > 0;
        },
        clean: (value) => {
          if (!value) return null;
          const lowerValue = value.toString().toLowerCase().trim();
          if (lowerValue.includes('yes') || lowerValue.includes('हाँ') || lowerValue.includes('true') || lowerValue.includes('y')) return 'हाँ';
          if (lowerValue.includes('no') || lowerValue.includes('नहीं') || lowerValue.includes('false') || lowerValue.includes('n')) return 'नहीं';
          return value.toString().trim(); // Keep original value if not matching standard formats
        }
      },
      aadharNumber: {
        validate: (value) => {
          if (!value) return false;
          // More flexible Aadhaar validation - accept any reasonable length
          const cleanValue = value.toString().replace(/\D/g, '');
          return cleanValue.length >= 10 && cleanValue.length <= 12; // Allow 10-12 digits
        },
        clean: (value) => {
          if (!value) return null;
          return value.toString().replace(/\D/g, ''); // Remove non-digits
        }
      },
      educationLevel: {
        validate: (value) => {
          if (!value) return false;
          return value.toString().trim().length > 0;
        },
        clean: (value) => value ? value.toString().trim() : null
      },
      symptom: {
        validate: (value) => {
          if (!value) return false;
          return value.toString().trim().length > 0;
        },
        clean: (value) => value ? value.toString().trim() : null
      }
    };
    
    // Apply validation and cleaning to each field
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const value = data[field];
      
      if (rule.validate(value)) {
        cleaned[field] = rule.clean(value);
      } else {
        // Instead of setting to null, try to clean the value anyway
        const cleanedValue = rule.clean(value);
        if (cleanedValue !== null && cleanedValue !== '') {
          cleaned[field] = cleanedValue;
          console.log(`Field ${field} was invalid but cleaned: "${value}" -> "${cleanedValue}"`);
        } else {
          cleaned[field] = null;
          console.log(`Invalid data for field ${field}:`, value);
        }
      }
    });
    
    return cleaned;
  };

  const handleAiPatientEntry = async (transcript) => {
    setIsAiPatientEntryProcessing(true);
    try {
      console.log('Processing transcript:', transcript);
      
      const response = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: `Extract patient information from this Hindi text and return ONLY a valid JSON object. Follow these rules exactly:
1. Use ONLY these exact keys: name, age, gender, address, symptom, duration, notes
2. If any field is not mentioned, use null (not "null" as string)
3. For age, use only numbers (e.g., 25 not "25")
4. For gender, use "पुरुष" for male, "महिला" for female, "अन्य" for other
5. Do not include any explanations, markdown, or extra text
6. Return ONLY the JSON object

Example format:
{"name": "राम कुमार", "age": 35, "gender": "पुरुष", "address": "दिल्ली", "symptom": "बुखार", "duration": "2 दिन", "notes": null}

Text to analyze: ${transcript}` 
        })
      });
      
      const data = await response.json();
      console.log('AI Patient Entry Response:', data);
      
      if (data.answer) {
        try {
          // Try to parse the response as JSON
          console.log('Attempting to parse AI response as JSON:', data.answer);
          
          // Clean the response to extract just the JSON part
          let jsonString = data.answer.trim();
          
          console.log('Raw AI response:', jsonString);
          
          // Remove any markdown formatting
          if (jsonString.includes('```json')) {
            jsonString = jsonString.split('```json')[1].split('```')[0];
          } else if (jsonString.includes('```')) {
            jsonString = jsonString.split('```')[1];
          }
          
          // Extract JSON object from the response
          const jsonStart = jsonString.indexOf('{');
          const jsonEnd = jsonString.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            jsonString = jsonString.substring(jsonStart, jsonEnd);
          }
          
          // Basic JSON cleaning
          jsonString = jsonString.replace(/"(\w+)"\s*:\s*"([^"]*)"/g, '"$1": "$2"');
          jsonString = jsonString.replace(/"(\w+)"\s*:\s*(\d+)/g, '"$1": $2');
          jsonString = jsonString.replace(/"(\w+)"\s*:\s*null/g, '"$1": null');
          
          // Remove trailing commas
          jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
          
          console.log('Cleaned JSON string:', jsonString);
          
          console.log('Final cleaned JSON string:', jsonString);
          
          let patientData;
          try {
            patientData = JSON.parse(jsonString);
            console.log('JSON parsing successful:', patientData);
          } catch (parseError) {
            console.error('JSON parse failed, trying manual extraction:', parseError);
            console.log('Failed JSON string:', jsonString);
            // If JSON parsing still fails, extract manually
            patientData = extractPatientInfoFromText(jsonString);
            console.log('Manual extraction result:', patientData);
            
            // If manual extraction also fails, use the original transcript
            if (!patientData || Object.values(patientData).every(val => val === null)) {
              console.log('Manual extraction failed, using original transcript');
              patientData = extractPatientInfoFromText(transcript);
            }
            
                      // Final fallback - if everything fails, create a basic structure
          if (!patientData || Object.values(patientData).every(val => val === null)) {
            console.log('All extraction methods failed, creating basic structure');
            patientData = {
              name: null,
              age: null,
              gender: null,
              address: null,
              symptom: null,
              duration: null,
              notes: null
            };
          }
          
          // Ensure all required fields exist
          const requiredFields = ['name', 'age', 'gender', 'address', 'symptom', 'duration', 'notes'];
          requiredFields.forEach(field => {
            if (!(field in patientData)) {
              patientData[field] = null;
            }
          });
          }
          
          console.log('Successfully parsed patient data:', patientData);
          
          // Debug: Check the structure of patientData
          console.log('patientData type:', typeof patientData);
          console.log('patientData keys:', Object.keys(patientData));
          console.log('patientData values:', Object.values(patientData));
          
          // Create a clean form state object
          const formData = {
            name: patientData.name || null,
            age: patientData.age || null,
            gender: patientData.gender || null,
            address: patientData.address || null,
            symptom: patientData.symptom || null,
            duration: patientData.duration || null,
            notes: patientData.notes || null,
            village: patientData.address || null
          };
          
          // Validate and clean the form data
          Object.keys(formData).forEach(key => {
            // Convert age to number if it's a string
            if (key === 'age' && typeof formData[key] === 'string' && !isNaN(formData[key])) {
              formData[key] = parseInt(formData[key]);
            }
            // Clean up null values
            if (formData[key] === 'null' || formData[key] === '') {
              formData[key] = null;
            }
            // Ensure gender is properly formatted
            if (key === 'gender' && formData[key] === 'm') {
              formData[key] = 'पुरुष';
            } else if (key === 'gender' && formData[key] === 'f') {
              formData[key] = 'महिला';
            }
          });
          
          // Clean up the values
          Object.keys(formData).forEach(key => {
            if (formData[key] === 'null' || formData[key] === '') {
              formData[key] = null;
            }
            // Convert age to number if it's a string
            if (key === 'age' && typeof formData[key] === 'string' && !isNaN(formData[key])) {
              formData[key] = parseInt(formData[key]);
            }
          });
          
          console.log('Final form data to be set:', formData);
          
          // Validate and clean the data before setting
          const validatedData = validateAndCleanPatientData(formData);
          console.log('Validated and cleaned data:', validatedData);
          
          // Debug: Check if formData is actually an object
          console.log('Type of formData:', typeof formData);
          console.log('Is formData an object?', typeof formData === 'object' && formData !== null);
          console.log('formData keys:', Object.keys(formData));
          
          // Set the form state with the validated data
          setVoiceLogFormState(validatedData);
          
          // Force a re-render and check the state
          setTimeout(() => {
            console.log('Form state after update:', formData);
            console.log('Current voiceLogFormState:', voiceLogFormState);
          }, 100);
          
          setVoiceLogReviewMode(true);
          setAiPatientEntryTranscript("");
          setAiPatientEntryInterim("");
          
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError);
          console.log('AI response was:', data.answer);
          
          // If parsing fails, try to extract information using regex
          console.log('Attempting text extraction...');
          const extractedData = extractPatientInfoFromText(data.answer);
          console.log('Extracted data from text:', extractedData);
          
          // Ensure we have a clean object with all required fields
          const cleanFormData = {
            name: extractedData.name || null,
            age: extractedData.age || null,
            gender: extractedData.gender || null,
            address: extractedData.address || null,
            symptom: extractedData.symptom || null,
            duration: extractedData.duration || null,
            notes: extractedData.notes || null,
            village: extractedData.address || null
          };
          
          console.log('Setting form data from text extraction:', cleanFormData);
          setVoiceLogFormState(cleanFormData);
          setVoiceLogReviewMode(true);
          setAiPatientEntryTranscript("");
          setAiPatientEntryInterim("");
        }
      } else {
        console.error('No answer received from AI');
        alert('AI did not provide a response. Please try again.');
      }
    } catch (error) {
      console.error('AI Patient Entry Error:', error);
      alert('Failed to process patient information. Please try again.');
    } finally {
      setIsAiPatientEntryProcessing(false);
    }
  };

  // Helper function to extract patient info from text if JSON parsing fails
  const extractPatientInfoFromText = (text) => {
    const extracted = {
      name: null,
      age: null,
      gender: null,
      address: null,
      symptom: null,
      duration: null,
      notes: null
    };

    // Convert to lowercase for better matching
    const lowerText = text.toLowerCase();
    
    // Extract name - look for patterns like "नाम", "मेरा नाम", "name"
    const namePatterns = [
      /(?:मेरा नाम|नाम|name)\s*(?:है|is)?\s*([a-zA-Z\u0900-\u097F\s]+)/i,
      /([a-zA-Z\u0900-\u097F\s]+)\s*(?:हूं|है|am|is)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 1 && !name.includes('साल') && !name.includes('year')) {
          extracted.name = name;
          break;
        }
      }
    }

    // Extract age - look for patterns like "25 साल", "25 years", "आयु 25"
    const agePatterns = [
      /(\d+)\s*(?:साल|years?|year)/i,
      /(?:आयु|age)\s*(\d+)/i,
      /(\d+)\s*(?:का|का हूं|का हूँ)/i
    ];
    
    for (const pattern of agePatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        extracted.age = match[1];
        break;
      }
    }

    // Extract gender - look for patterns like "पुरुष", "महिला", "male", "female"
    const genderPatterns = [
      /(पुरुष|male|m)/i,
      /(महिला|female|f)/i,
      /(अन्य|other)/i
    ];
    
    for (const pattern of genderPatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        extracted.gender = match[1];
        break;
      }
    }

    // Extract symptoms - look for common Hindi symptom words
    const symptomKeywords = [
      'बुखार', 'fever', 'दर्द', 'pain', 'खांसी', 'cough', 'सर्दी', 'cold',
      'सिरदर्द', 'headache', 'पेटदर्द', 'stomach pain', 'उल्टी', 'vomiting',
      'दस्त', 'diarrhea', 'थकान', 'fatigue', 'कमजोरी', 'weakness'
    ];
    
    for (const keyword of symptomKeywords) {
      if (lowerText.includes(keyword)) {
        // Extract the sentence containing the symptom
        const sentences = text.split(/[।.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            extracted.symptom = sentence.trim();
            break;
          }
        }
        if (extracted.symptom) break;
      }
    }

    // Extract duration - look for time patterns
    const durationPatterns = [
      /(\d+)\s*(?:दिन|days?|day)/i,
      /(\d+)\s*(?:सप्ताह|weeks?|week)/i,
      /(\d+)\s*(?:महीना|months?|month)/i,
      /(\d+)\s*(?:घंटे|hours?|hour)/i
    ];
    
    for (const pattern of durationPatterns) {
      const match = lowerText.match(pattern);
      if (match && match[1]) {
        const timeUnit = lowerText.match(/(दिन|days?|day|सप्ताह|weeks?|week|महीना|months?|month|घंटे|hours?|hour)/i);
        if (timeUnit) {
          extracted.duration = `${match[1]} ${timeUnit[0]}`;
          break;
        }
      }
    }

    // Extract address - look for address-related keywords
    const addressKeywords = ['पता', 'address', 'रहता', 'live', 'घर', 'home', 'गाँव', 'village'];
    for (const keyword of addressKeywords) {
      if (lowerText.includes(keyword)) {
        const sentences = text.split(/[।.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            extracted.address = sentence.trim();
            break;
          }
        }
        if (extracted.address) break;
      }
    }

    // Extract notes - any additional information
    const notesKeywords = ['अतिरिक्त', 'additional', 'और', 'and', 'भी', 'also'];
    for (const keyword of notesKeywords) {
      if (lowerText.includes(keyword)) {
        const sentences = text.split(/[।.!?]/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            extracted.notes = sentence.trim();
            break;
          }
        }
        if (extracted.notes) break;
      }
    }

    return extracted;
  };

  // Start AI patient entry listening
  const startAiPatientEntryListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    aiPatientEntryRecognitionRef.current = new SpeechRecognition();
    aiPatientEntryRecognitionRef.current.continuous = true;
    aiPatientEntryRecognitionRef.current.interimResults = true;
    aiPatientEntryRecognitionRef.current.lang = 'hi-IN';
    
    aiPatientEntryRecognitionRef.current.onstart = () => {
      setIsAiPatientEntryListening(true);
      setAiPatientEntryInterim("");
    };
    
    aiPatientEntryRecognitionRef.current.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setAiPatientEntryInterim(interim);
      if (final) {
        setAiPatientEntryTranscript(prev => prev + final);
      }
    };
    
    aiPatientEntryRecognitionRef.current.onerror = (event) => {
      console.error('AI Patient Entry Speech recognition error:', event.error);
      setIsAiPatientEntryListening(false);
    };
    
    aiPatientEntryRecognitionRef.current.onend = () => {
      setIsAiPatientEntryListening(false);
    };
    
    try {
      aiPatientEntryRecognitionRef.current.start();
    } catch (error) {
      console.error('Error starting AI patient entry speech recognition:', error);
      setIsAiPatientEntryListening(false);
    }
  };

  // Stop AI patient entry listening
  const stopAiPatientEntryListening = () => {
    try {
      if (aiPatientEntryRecognitionRef.current) {
        aiPatientEntryRecognitionRef.current.stop();
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    } finally {
      setIsAiPatientEntryListening(false);
    }
  };

  // Reset AI patient entry mode
  const resetAiPatientEntry = () => {
    // First stop listening if it's active
    if (isAiPatientEntryListening && aiPatientEntryRecognitionRef.current) {
      aiPatientEntryRecognitionRef.current.stop();
    }
    
    setAiPatientEntryTranscript("");
    setAiPatientEntryInterim("");
    setIsAiPatientEntryListening(false);
    setIsAiPatientEntryProcessing(false);
    
    // Also clear the form state
    setVoiceLogFormState({});
    setVoiceLogReviewMode(false);
  };

  // Test function to verify form filling works
  const testFormFilling = () => {
    const testData = {
      name: "तान्या सिंह",
      age: 25,
      gender: "महिला",
      address: "लालपुर",
      symptom: "फीवर",
      duration: "कल रात से",
      notes: "बुखार है"
    };
    
    console.log('Testing form filling with:', testData);
    setVoiceLogFormState(testData);
    setVoiceLogReviewMode(true);
  };

  // Test AI JSON generation
  const testAiJsonGeneration = async () => {
    const testTranscript = "मेरा नाम राम कुमार है, मैं 35 साल का हूं, मुझे बुखार है 2 दिन से";
    console.log('Testing AI JSON generation with:', testTranscript);
    
    try {
      const response = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: `Extract patient information from this Hindi text and return ONLY a valid JSON object. Follow these rules exactly:
1. Use ONLY these exact keys: name, age, gender, address, symptom, duration, notes
2. If any field is not mentioned, use null (not "null" as string)
3. For age, use only numbers (e.g., 25 not "25")
4. For gender, use "पुरुष" for male, "महिला" for female, "अन्य" for other
5. Do not include any explanations, markdown, or extra text
6. Return ONLY the JSON object

Example format:
{"name": "राम कुमार", "age": 35, "gender": "पुरुष", "address": "दिल्ली", "symptom": "बुखार", "duration": "2 दिन", "notes": null}

Text to analyze: ${testTranscript}` 
        })
      });
      
      const data = await response.json();
      console.log('AI Test Response:', data);
      
      if (data.answer) {
        console.log('Raw AI response:', data.answer);
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(data.answer.trim());
          console.log('Successfully parsed JSON:', parsed);
        } catch (parseError) {
          console.error('JSON parse failed:', parseError);
          console.log('Failed to parse:', data.answer);
        }
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  // Simple video call functions using iframe
  const startJitsiCall = (meetingId) => {
    console.log('=== STARTING VIDEO CALL ===');
    console.log('Meeting ID:', meetingId);
    console.log('User:', user);
    console.log('Container ref:', jitsiContainerRef.current);
    
    // Reset connection status
    setJitsiConnectionStatus('connecting');
    setJitsiErrorMessage("");
    
    try {
      // Create container if it doesn't exist
      if (!jitsiContainerRef.current) {
        console.log('Creating container dynamically');
        const container = document.createElement('div');
        container.id = 'jitsi-container';
        container.style.width = '100%';
        container.style.height = '600px';
        container.style.borderRadius = '18px';
        container.style.overflow = 'hidden';
        container.style.border = '2px solid #e1b6e7';
        container.style.background = '#f8f9fa';
        
        // Try multiple approaches to find where to place the container
        let containerPlaced = false;
        
        // Approach 1: Find placeholder
        const placeholder = document.querySelector('#jitsi-container-placeholder');
        if (placeholder) {
          console.log('Approach 1: Placeholder found, replacing with container');
          placeholder.style.display = 'none';
          placeholder.parentNode.insertBefore(container, placeholder.nextSibling);
          jitsiContainerRef.current = container;
          containerPlaced = true;
        }
        
        // Approach 2: Find video call box
        if (!containerPlaced) {
          const videoCallBox = document.querySelector('.video-call-box');
          if (videoCallBox) {
            console.log('Approach 2: Video call box found, appending container');
            videoCallBox.appendChild(container);
            jitsiContainerRef.current = container;
            containerPlaced = true;
          }
        }
        
        // Approach 3: Find any div with video call content
        if (!containerPlaced) {
          const videoCallDivs = document.querySelectorAll('div');
          for (let div of videoCallDivs) {
            if (div.textContent && div.textContent.includes('Video Consultation')) {
              console.log('Approach 3: Found video call div, appending container');
              div.appendChild(container);
              jitsiContainerRef.current = container;
              containerPlaced = true;
              break;
            }
          }
        }
        
        // Approach 4: Create container in body as last resort
        if (!containerPlaced) {
          console.log('Approach 4: Creating container in body as fallback');
          document.body.appendChild(container);
          jitsiContainerRef.current = container;
          containerPlaced = true;
        }
        
        if (!containerPlaced) {
          console.error('Failed to place container anywhere');
          setJitsiConnectionStatus('error');
          setJitsiErrorMessage('Could not create video call container. Please try again.');
          alert('Could not create video call container. Please try again.');
          return;
        }
      }

      const roomName = meetingId || `asha-plus-${Date.now()}`;
      console.log('Creating room:', roomName);
      
      // Create iframe for Jitsi Meet with improved connection settings
      const iframe = document.createElement('iframe');
      
      // Simplified URL with better connection parameters
      const jitsiUrl = `https://meet.jit.si/${roomName}?userInfo.displayName=${encodeURIComponent(user?.displayName || user?.email || 'Patient')}&userInfo.email=${encodeURIComponent(user?.email || '')}&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&config.enableClosePage=true&config.enableWelcomePage=false&config.p2p.enabled=true&config.websocket=wss://meet.jit.si/xmpp-websocket&config.clientNode=http://meet.jit.si&config.enableRemb=true&config.enableTcc=true&config.openBridgeChannel=websocket&config.resolution=720&config.constraints.video.height.ideal=720&config.constraints.video.height.max=720&config.constraints.video.height.min=180&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","desktop","fullscreen","hangup","chat","settings","raisehand","filmstrip","tileview"]&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_POWERED_BY=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.AUTHENTICATION_ENABLE=false&interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=true&interfaceConfig.SHOW_MEETING_TIMER=true&interfaceConfig.SHOW_MEETING_NAME=true&interfaceConfig.SHOW_PARTICIPANT_COUNT=true&config.websocketKeepAlive=30&config.websocketKeepAliveUrl=https://meet.jit.si/ping&config.maxFullResolutionParticipants=2&config.startBitrate=800&config.disableAudioLevels=false&config.enableLayerSuspension=true&config.maxChannelOccupants=10`;
      
      iframe.src = jitsiUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '18px';
      iframe.allow = 'camera; microphone; fullscreen; speaker; display-capture';
      
      // Add comprehensive event listeners
      iframe.onload = () => {
        console.log('✅ Video call iframe loaded successfully');
        setJitsiConnectionStatus('connected');
        // Add a small delay to ensure iframe is fully ready
        setTimeout(() => {
          console.log('🎥 Video call iframe is ready for interaction');
        }, 1000);
      };
      
      iframe.onerror = (error) => {
        console.error('❌ Video call iframe error:', error);
        setJitsiConnectionStatus('error');
        setJitsiErrorMessage('Failed to load video call. Please check your internet connection and try again.');
        alert('Failed to load video call. Please check your internet connection and try again.');
      };
      
      // Add message listener for iframe communication
      window.addEventListener('message', (event) => {
        if (event.origin === 'https://meet.jit.si') {
          console.log('📨 Message from Jitsi:', event.data);
          if (event.data.type === 'connection-error') {
            console.error('🔴 Connection error from Jitsi:', event.data);
            setJitsiConnectionStatus('error');
            setJitsiErrorMessage('Connection error: ' + (event.data.message || 'Unknown error'));
            alert('Connection error: ' + (event.data.message || 'Unknown error'));
          }
        }
      });
      
      // Clear container and add iframe
      jitsiContainerRef.current.innerHTML = '';
      jitsiContainerRef.current.appendChild(iframe);
      
      console.log('✅ Video call iframe created successfully');
      setIsInJitsiCall(true);
      setJitsiMeetingId(roomName);
      console.log('=== VIDEO CALL STARTED SUCCESSFULLY ===');
      
      // Add retry mechanism for connection issues
      setTimeout(() => {
        if (iframe.contentWindow && iframe.contentWindow.location.href.includes('error')) {
          console.warn('⚠️ Detected potential connection issue, attempting retry...');
          setJitsiConnectionStatus('connecting');
          // Retry with a simpler URL
          const retryUrl = `https://meet.jit.si/${roomName}`;
          iframe.src = retryUrl;
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error starting video call:', error);
      setJitsiConnectionStatus('error');
      setJitsiErrorMessage('Failed to start video call: ' + error.message);
      alert('Failed to start video call: ' + error.message);
    }
  };

  const endJitsiCall = () => {
    if (jitsiContainerRef.current) {
      jitsiContainerRef.current.innerHTML = '';
    }
    
    // Show placeholder again
    const placeholder = document.querySelector('#jitsi-container-placeholder');
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
    
    setIsInJitsiCall(false);
    setJitsiMeetingId("");
    setJitsiConnectionStatus('disconnected');
    setJitsiErrorMessage("");
    // Ensure patient entry is visible after ending call
    setSelectedFeature('patientInfo');
    setPatientInfoSubFeature('entry');
    console.log('Video call ended');
  };

  // Sidebar button definitions
  const featureButtons = [
    { key: 'voiceLog', label: '📝 Patient Entry' },
    { key: 'askAI', label: '💬 Ask AI' },
    { key: 'reminders', label: '📅 Reminders' },
    { key: 'history', label: 'View Patient History' },
  ];

  // Speak all overdue reminders using Web Speech API
  const speakOverdueReminders = () => {
    if (!('speechSynthesis' in window)) {
      alert('Sorry, your browser does not support speech synthesis.');
      return;
    }
    window.speechSynthesis.cancel();
    const now = new Date();
    const overdueReminders = reminders.filter(rem => !rem.done && rem.date && ((now - new Date(rem.date)) / (1000 * 60 * 60 * 24) >= 7));
    
    // Function to get female voice with better detection
    const getFemaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      
      // First try to find Hindi female voice with more specific names
      let femaleVoice = voices.find(voice => 
        (voice.lang.includes('hi') || voice.lang.includes('hi-IN')) && 
        (voice.name.toLowerCase().includes('female') ||
         voice.name.toLowerCase().includes('woman') ||
         voice.name.toLowerCase().includes('girl') ||
         voice.name.toLowerCase().includes('priya') ||
         voice.name.toLowerCase().includes('neha') ||
         voice.name.toLowerCase().includes('meera') ||
         voice.name.toLowerCase().includes('sita') ||
         voice.name.toLowerCase().includes('radha') ||
         voice.name.toLowerCase().includes('laxmi'))
      );
      
      // If no Hindi female voice, try any female voice
      if (!femaleVoice) {
        femaleVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('girl') ||
          voice.name.toLowerCase().includes('priya') ||
          voice.name.toLowerCase().includes('neha') ||
          voice.name.toLowerCase().includes('meera') ||
          voice.name.toLowerCase().includes('sita') ||
          voice.name.toLowerCase().includes('radha') ||
          voice.name.toLowerCase().includes('laxmi') ||
          voice.name.toLowerCase().includes('sarah') ||
          voice.name.toLowerCase().includes('emma') ||
          voice.name.toLowerCase().includes('sophie')
        );
      }
      
      // If still no female voice, try to find any voice that sounds female
      if (!femaleVoice) {
        femaleVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('google') && voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('microsoft') && voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('siri') ||
          voice.name.toLowerCase().includes('alexa')
        );
      }
      
      // If still no female voice, use any Hindi voice
      if (!femaleVoice) {
        femaleVoice = voices.find(voice => 
          voice.lang.includes('hi') || voice.lang.includes('hi-IN')
        );
      }
      
      console.log('Selected voice:', femaleVoice ? `${femaleVoice.name} (${femaleVoice.lang})` : 'No voice found');
      return femaleVoice;
    };
    
    // Wait for voices to load if needed
    const speakWithFemaleVoice = () => {
      if (overdueReminders.length === 0) {
        const hindiUtter = new SpeechSynthesisUtterance('कोई लंबित रिमाइंडर नहीं है।');
        hindiUtter.lang = 'hi-IN';
        // Set female voice for reminders
        const femaleVoice = getFemaleVoice();
        if (femaleVoice) {
          hindiUtter.voice = femaleVoice;
        }
        // Force female-like voice settings
        hindiUtter.pitch = 1.2; // Higher pitch for female voice
        hindiUtter.rate = 0.9; // Slightly slower for clarity
        hindiUtter.volume = 1.0;
        window.speechSynthesis.speak(hindiUtter);
        setIsSpeakingReminders(true);
        setTimeout(() => setIsSpeakingReminders(false), 1800);
        return;
      }
      let idx = 0;
      setIsSpeakingReminders(true);
      speakingRef.current = true;
      const speakNext = () => {
        if (!speakingRef.current || idx >= overdueReminders.length) {
          setIsSpeakingReminders(false);
          return;
        }
        const rem = overdueReminders[idx];
        
        // Convert date to Hindi format with natural pronunciation
        const formatDateInHindi = (dateString) => {
          try {
            const date = new Date(dateString);
            const day = date.getDate();
            const month = date.getMonth();
            const year = date.getFullYear();
            
            // Hindi month names
            const hindiMonths = [
              'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
              'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
            ];
            
            // Convert day to Hindi words for better pronunciation
            const convertDayToHindi = (dayNum) => {
              if (dayNum === 1) return 'पहली';
              if (dayNum === 2) return 'दूसरी';
              if (dayNum === 3) return 'तीसरी';
              if (dayNum === 4) return 'चौथी';
              if (dayNum === 5) return 'पांचवीं';
              if (dayNum === 6) return 'छठी';
              if (dayNum === 7) return 'सातवीं';
              if (dayNum === 8) return 'आठवीं';
              if (dayNum === 9) return 'नौवीं';
              if (dayNum === 10) return 'दसवीं';
              if (dayNum === 11) return 'ग्यारहवीं';
              if (dayNum === 12) return 'बारहवीं';
              if (dayNum === 13) return 'तेरहवीं';
              if (dayNum === 14) return 'चौदहवीं';
              if (dayNum === 15) return 'पंद्रहवीं';
              if (dayNum === 16) return 'सोलहवीं';
              if (dayNum === 17) return 'सत्रहवीं';
              if (dayNum === 18) return 'अठारहवीं';
              if (dayNum === 19) return 'उन्नीसवीं';
              if (dayNum === 20) return 'बीसवीं';
              if (dayNum === 21) return 'इक्कीसवीं';
              if (dayNum === 22) return 'बाईसवीं';
              if (dayNum === 23) return 'तेईसवीं';
              if (dayNum === 24) return 'चौबीसवीं';
              if (dayNum === 25) return 'पच्चीसवीं';
              if (dayNum === 26) return 'छब्बीसवीं';
              if (dayNum === 27) return 'सत्ताईसवीं';
              if (dayNum === 28) return 'अट्ठाईसवीं';
              if (dayNum === 29) return 'उनतीसवीं';
              if (dayNum === 30) return 'तीसवीं';
              if (dayNum === 31) return 'इकतीसवीं';
              return dayNum.toString(); // fallback
            };
            
            // Convert year to natural Hindi pronunciation
            const convertYearToHindi = (yearNum) => {
              if (yearNum === 2024) return 'दो हजार चौबीस';
              if (yearNum === 2025) return 'दो हजार पच्चीस';
              if (yearNum === 2026) return 'दो हजार छब्बीस';
              if (yearNum === 2023) return 'दो हजार तेईस';
              if (yearNum === 2022) return 'दो हजार बाईस';
              if (yearNum === 2021) return 'दो हजार इक्कीस';
              if (yearNum === 2020) return 'दो हजार बीस';
              
              // For other years, use a more natural approach
              const yearStr = yearNum.toString();
              if (yearStr.startsWith('20')) {
                const lastTwoDigits = yearStr.substring(2);
                const lastTwoNum = parseInt(lastTwoDigits);
                if (lastTwoNum <= 30) {
                  const hindiNumbers = ['बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस'];
                  return `दो हजार ${hindiNumbers[lastTwoNum - 20]}`;
                }
              }
              
              // Fallback: convert each digit
              const hindiDigits = ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ'];
              let result = '';
            for (let i = 0; i < yearStr.length; i++) {
              const digit = parseInt(yearStr[i]);
                result += hindiDigits[digit];
                if (i < yearStr.length - 1) result += ' ';
              }
              return result;
            };
            
            const dayInHindi = convertDayToHindi(day);
            const yearInHindi = convertYearToHindi(year);
            
            // Return in format: "पांचवीं जुलाई दो हजार पच्चीस"
            return `${dayInHindi} ${hindiMonths[month]} ${yearInHindi}`;
          } catch (error) {
            return dateString; // fallback to original if error
          }
        };
        
        const formattedDate = formatDateInHindi(rem.date);
        const text = `रिमाइंडर: ${rem.text}, तारीख: ${formattedDate}`;
        const utter = new window.SpeechSynthesisUtterance(text);
        utter.lang = 'hi-IN';
        // Set female voice for reminders
        const femaleVoice = getFemaleVoice();
        if (femaleVoice) {
          utter.voice = femaleVoice;
        }
        // Force female-like voice settings
        utter.pitch = 1.2; // Higher pitch for female voice
        utter.rate = 0.9; // Slightly slower for clarity
        utter.volume = 1.0;
        utter.onend = () => {
          idx++;
          speakNext();
        };
        utter.onerror = () => {
          idx++;
          speakNext();
        };
        window.speechSynthesis.speak(utter);
      };
      speakNext();
    };
    
    // Check if voices are loaded, if not wait for them
    const loadVoicesAndSpeak = () => {
      // Force voices to load
      window.speechSynthesis.getVoices();
      
      // Wait a bit for voices to load
      setTimeout(() => {
        speakWithFemaleVoice();
      }, 100);
    };
    
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = loadVoicesAndSpeak;
    } else {
      loadVoicesAndSpeak();
    }
  };

  const stopSpeakingReminders = () => {
    speakingRef.current = false;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingReminders(false);
  };

  // AI Health Assistant Functions
  const startAiListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = true; // Enable interim results for real-time transcription
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      // Show both interim and final in the textarea for real-time effect
      setAiInput((prev) => {
        // If previous ends with interim, replace it, else just append
        let base = prev;
        // Remove previous interim if present
        if (base.endsWith(aiInterimTranscript)) {
          base = base.slice(0, -aiInterimTranscript.length);
        }
        return (base + final + interim).trim();
      });
      setAiInterimTranscript(interim);
      setIsAiListening(true);
    };
    recognition.onend = () => setIsAiListening(false);
    recognition.onerror = () => setIsAiListening(false);
    recognitionRef.current = recognition;
    setIsAiListening(true);
    recognition.start();
  };

  const stopAiListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsAiListening(false);
    }
  };

  // Add after other useState hooks
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // Refactor speakAiResponse to accept messageId
  const speakAiResponse = (text, messageId) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
      setSpeakingMessageId(null);
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => {
        setIsAiSpeaking(true);
        setSpeakingMessageId(messageId);
      };
      utterance.onend = () => {
        setIsAiSpeaking(false);
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        setIsAiSpeaking(false);
        setSpeakingMessageId(null);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAiSubmit = async (eOrInput) => {
    let inputText = "";
    if (typeof eOrInput === "string") {
      inputText = eOrInput;
    } else {
      eOrInput.preventDefault();
      inputText = aiInput;
    }
    console.log('handleAiSubmit called with:', inputText);
    if (!inputText.trim()) return;
    setIsAiProcessing(true);
    setAiAnswer("");
    setAiAudio(null);
    // Add user message to chat
    setAiMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        text: inputText,
        sender: "user",
        timestamp: new Date()
      }
    ]);
    try {
      console.log('Sending fetch request to:', AI_ASSISTANT_URL);
      const response = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: inputText })
      });
      console.log('Fetch response status:', response.status);
      const data = await response.json();
      console.log('Fetch response data:', data);
      setAiAnswer(data.answer || "");
      setAiInput("");
      if (data.audioContent) {
        setAiAudio(`data:audio/mp3;base64,${data.audioContent}`);
      }
      // Add AI message to chat
      const newMessageId = Date.now() + 1;
      setAiMessages(prev => [
        ...prev,
        {
          id: newMessageId,
          text: data.answer || "",
          sender: "ai",
          timestamp: new Date()
        }
      ]);
      // Save chat history to Firestore
      await addDoc(collection(db, "aiConversations"), {
        userId: user.uid,
        userMessage: inputText,
        aiResponse: data.answer || "",
        timestamp: new Date()
      });
    } catch (err) {
      console.error('AI assistant fetch error:', err);
      setAiAnswer('AI assistant failed to respond.');
      setAiMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          text: 'AI assistant failed to respond.',
          sender: "ai",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsAiProcessing(false);
    }
    // In handleAiSubmit, after sending the question, clear aiInput
    setAiInput("");
  };



  const generateAiHealthResponse = async (userInput) => {
    try {
      // Enhanced prompt for comprehensive health assistance
      const enhancedPrompt = `आप एक अनुभवी स्वास्थ्य सलाहकार हैं। निम्नलिखित क्षेत्रों में विस्तृत जानकारी प्रदान करें:

**स्वास्थ्य प्रश्न:** ${userInput}

**आपका जवाब इन क्षेत्रों को कवर करे:**
1. **मुख्य जानकारी:** स्पष्ट और सरल हिंदी में समस्या का विवरण
2. **संभावित कारण:** समस्या के कारण और जोखिम कारक
3. **लक्षण:** क्या देखना चाहिए और कब चिंता करनी चाहिए
4. **उपचार सुझाव:** घरेलू उपचार, जीवनशैली में बदलाव
5. **आहार सलाह:** क्या खाना चाहिए और क्या नहीं
6. **डॉक्टर से कब मिलें:** आपातकालीन संकेत और चिकित्सकीय सलाह
7. **रोकथाम:** भविष्य में इससे बचने के तरीके
8. **गर्भावस्था/बच्चे:** अगर प्रासंगिक हो तो विशेष सावधानियां

**विशेष निर्देश:**
- सरल हिंदी में जवाब दें
- बुलेट पॉइंट्स का उपयोग करें
- आपातकालीन संकेतों पर जोर दें
- स्थानीय संदर्भ (भारतीय आहार, जलवायु) का ध्यान रखें
- ASHA workers के लिए उपयोगी सलाह दें

कृपया विस्तृत और व्यावहारिक जवाब दें।`;

      const response = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: enhancedPrompt,
          type: 'comprehensive_health_advice',
          userId: user?.uid || 'anonymous',
          context: {
            userRole: 'ASHA_Worker',
            language: 'Hindi',
            region: 'India',
            specialization: 'Rural_Healthcare'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating AI health response:', error);
      return 'माफ़ करें, कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।';
    }
  };

  // Medical Document Analysis Functions
  const analyzeMedicalDocument = async () => {
    if (!uploadedMedicalImage || !medicalDocumentType) {
      setMedicalAnalysisError('कृपया एक छवि अपलोड करें और दस्तावेज़ का प्रकार चुनें');
      return;
    }

    setIsMedicalAnalyzing(true);
    setMedicalAnalysisError('');
    setMedicalAnalysis(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Image = e.target.result.split(',')[1];
          
                    let prompt = '';
          switch(medicalDocumentType) {
            case 'prescription':
              prompt = `Analyze this prescription image and provide detailed information in Hindi:

1. **Medicine Details:**
   - Medicine names and dosages
   - How many times per day
   - Before/after meals
   - Duration of treatment

2. **Patient Instructions:**
   - How to take each medicine
   - Important precautions
   - Side effects to watch for
   - What to avoid while taking

3. **Follow-up:**
   - When to see doctor again
   - Tests needed
   - Lifestyle changes required

4. **Emergency Signs:**
   - When to contact doctor immediately
   - Warning symptoms

Explain everything in simple Hindi that a patient can understand. Format the response with clear sections and bullet points.`;
              break;
            case 'labReport':
              prompt = `Analyze this lab report image and provide detailed information in Hindi:

1. **Test Results:**
   - What each test measures
   - Normal vs abnormal values
   - What high/low values mean
   - Critical values if any

2. **Health Implications:**
   - What the results indicate
   - Potential health conditions
   - Risk factors identified
   - Severity level

3. **Patient Actions:**
   - What to do next
   - Lifestyle changes needed
   - Follow-up tests required
   - When to see doctor

4. **Diet Recommendations:**
   - Foods to eat/avoid
   - Supplements if needed
   - Hydration requirements

5. **Emergency Signs:**
   - When to seek immediate medical attention

Explain in simple Hindi with actionable advice. Format with clear sections.`;
              break;
            case 'medicine':
              prompt = `Analyze this medicine package/label image and provide detailed information in Hindi:

1. **Medicine Information:**
   - Generic and brand names
   - Active ingredients
   - Medicine type (tablet/syrup/injection)
   - Manufacturer details

2. **Dosage Instructions:**
   - How much to take
   - How often
   - Best time to take
   - With or without food
   - Duration of treatment

3. **Important Warnings:**
   - Side effects
   - Contraindications
   - Drug interactions
   - Pregnancy/breastfeeding safety
   - Age restrictions

4. **Storage Instructions:**
   - How to store
   - Temperature requirements
   - Expiry date importance
   - Keep away from children

5. **Emergency Information:**
   - What to do in case of overdose
   - When to stop taking
   - Allergic reaction signs

Provide clear, patient-friendly instructions in Hindi. Format with clear sections.`;
              break;
            default:
              setMedicalAnalysisError('अमान्य दस्तावेज़ प्रकार');
              setIsMedicalAnalyzing(false);
        return;
      }

          console.log('=== FRONTEND: Sending request ===');
          console.log('Sending request with prompt length:', prompt.length);
          console.log('Document type:', medicalDocumentType);
          console.log('Image size:', base64Image.length);

          if (!prompt || prompt.trim() === '') {
            throw new Error('Prompt is empty. Please select a document type.');
          }

          const requestBody = {
            question: prompt, // Use 'question' instead of 'message' for backward compatibility
            type: 'medical_document_analysis',
            image: base64Image,
            documentType: medicalDocumentType,
            userId: user?.uid || 'anonymous'
          };

          console.log('Request body keys:', Object.keys(requestBody));
          console.log('Prompt preview:', prompt.substring(0, 100) + '...');
          console.log('Full request body:', JSON.stringify(requestBody, null, 2));

          // First, let's test if the function is reachable
          console.log('Testing function connectivity...');
          try {
            const testResponse = await fetch(AI_ASSISTANT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: 'Test message',
                type: 'health_advice'
              }),
            });
            console.log('Test response status:', testResponse.status);
            const testData = await testResponse.text();
            console.log('Test response:', testData);
          } catch (testError) {
            console.error('Test request failed:', testError);
          }

          const response = await fetch(AI_ASSISTANT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          const data = await response.json();
          
          // Save to Firestore
          if (user?.uid) {
            try {
              await addDoc(collection(db, 'medicalAnalyses'), {
                userId: user.uid,
                documentType: medicalDocumentType,
                analysis: data.response,
                timestamp: new Date(),
                imageUrl: base64Image.substring(0, 100) + '...' // Store truncated version
              });
            } catch (firestoreError) {
              console.error('Error saving to Firestore:', firestoreError);
              // Continue even if Firestore save fails
            }
          }

          setMedicalAnalysis(data.response);
        } catch (error) {
          console.error('Error in reader.onload:', error);
          setMedicalAnalysisError(`दस्तावेज़ का विश्लेषण करने में त्रुटि: ${error.message}`);
        } finally {
          setIsMedicalAnalyzing(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        setMedicalAnalysisError('फ़ाइल पढ़ने में त्रुटि');
        setIsMedicalAnalyzing(false);
      };
      
      reader.readAsDataURL(uploadedMedicalImage);
    } catch (error) {
      console.error('Error analyzing medical document:', error);
      setMedicalAnalysisError('दस्तावेज़ का विश्लेषण करने में त्रुटि। कृपया फिर से कोशिश करें।');
      setIsMedicalAnalyzing(false);
    }
  };

  const clearMedicalAnalysis = () => {
    setMedicalDocumentType('');
    setUploadedMedicalImage(null);
    setMedicalAnalysis(null);
    setMedicalAnalysisError('');
    setShowMedicalAnalysisPopup(false);
    setShowDietPlanPopup(false);
    setDietPlanFromAnalysis('');
  };

  // Generate diet plan based on medical analysis
  const generateDietPlanFromAnalysis = async (analysisData) => {
    setIsGeneratingDietPlan(true);
    try {
      // Check if AI_ASSISTANT_URL is available
      if (!AI_ASSISTANT_URL) {
        console.error('AI_ASSISTANT_URL is not defined');
        setDietPlanFromAnalysis('माफ़ करें, AI सर्विस उपलब्ध नहीं है। कृपया बाद में कोशिश करें।');
        setIsGeneratingDietPlan(false);
        return;
      }

      // Create a comprehensive prompt for diet plan generation based on medical analysis
      const dietPlanPrompt = `आप एक अनुभवी आहार विशेषज्ञ और पोषण सलाहकार हैं। निम्नलिखित मेडिकल विश्लेषण के आधार पर एक व्यक्तिगत आहार योजना बनाएं:

**मेडिकल विश्लेषण डेटा:**
${analysisData}

**आपका कार्य:**
1. **मेडिकल स्थिति का मूल्यांकन:** रिपोर्ट में दिए गए लक्षणों और परिणामों का विश्लेषण
2. **आहार प्रतिबंध:** क्या नहीं खाना चाहिए (मेडिकल स्थिति के अनुसार)
3. **अनुशंसित आहार:** क्या खाना चाहिए (विस्तृत सूची)
4. **दैनिक आहार योजना:**
   - सुबह का नाश्ता (समय और मात्रा सहित)
   - दोपहर का भोजन (समय और मात्रा सहित)
   - शाम का नाश्ता (समय और मात्रा सहित)
   - रात का भोजन (समय और मात्रा सहित)
5. **पेय पदार्थ:** क्या पीना चाहिए और क्या नहीं
6. **जीवनशैली सुझाव:** व्यायाम और दैनिक दिनचर्या
7. **सावधानियां:** विशेष ध्यान रखने योग्य बातें
8. **फॉलो-अप:** कब और कैसे डॉक्टर से मिलना चाहिए

**आपका जवाब इन क्षेत्रों को कवर करे:**
- स्पष्ट और सरल हिंदी में
- मेडिकल स्थिति के अनुसार व्यक्तिगत सुझाव
- विस्तृत आहार योजना
- सावधानियां और सुझाव
- नियमित फॉलो-अप की सलाह

कृपया एक संपूर्ण और व्यावहारिक आहार योजना प्रदान करें जो मेडिकल स्थिति के अनुसार हो।`;

      const response = await fetch(AI_ASSISTANT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: dietPlanPrompt
        })
      });

      if (response.ok) {
        const data = await response.json();
        const dietPlan = data.response || data.message || 'आहार योजना तैयार की जा रही है...';
        setDietPlanFromAnalysis(dietPlan);
        setShowDietPlanPopup(true); // Show popup after diet plan is generated
      } else {
        // Fallback response for common medical conditions
        const fallbackDietPlan = `**मेडिकल विश्लेषण के आधार पर आहार योजना:**

**सामान्य सुझाव:**
- ताजा और पौष्टिक भोजन खाएं
- नियमित समय पर भोजन करें
- पर्याप्त पानी पीएं (8-10 गिलास दिन में)
- तेल और मसाले कम करें

**दैनिक आहार योजना:**
- **सुबह (7-8 बजे):** दूध, रोटी, फल
- **दोपहर (1-2 बजे):** दाल, चावल, सब्जी, रोटी
- **शाम (5-6 बजे):** चाय, बिस्किट या फल
- **रात (8-9 बजे):** हल्का भोजन, दूध

**सावधानियां:**
- डॉक्टर की सलाह का पालन करें
- नियमित जांच करवाएं
- स्वस्थ जीवनशैली अपनाएं

कृपया अपने डॉक्टर से सलाह लें क्योंकि यह सामान्य सुझाव हैं।`;
        setDietPlanFromAnalysis(fallbackDietPlan);
        setShowDietPlanPopup(true); // Show popup for fallback diet plan too
      }
    } catch (error) {
      console.error('Error generating diet plan:', error);
      setDietPlanFromAnalysis('आहार योजना बनाने में त्रुटि। कृपया बाद में कोशिश करें।');
      setShowDietPlanPopup(true); // Show popup even for error message
    } finally {
      setIsGeneratingDietPlan(false);
    }
  };

  const handleMedicalImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit to match Gemini API
        setMedicalAnalysisError('छवि का आकार 4MB से कम होना चाहिए');
        return;
      }
      setUploadedMedicalImage(file);
      setMedicalAnalysisError('');
    }
  };

  // Move the 'voiceLog' case code into a helper function
  const renderFeatureContent_voiceLog = () => {
    // Enhanced ASHA Worker form fields with comprehensive sections
    const formFields = [
      { key: 'name', label: 'नाम', required: true },
      { key: 'age', label: 'आयु', required: true },
      { key: 'gender', label: 'लिंग (पुरुष/महिला/अन्य)', required: true },
      { key: 'village', label: 'गाँव/वार्ड', required: true },
      { key: 'familyMembers', label: 'परिवार के सदस्य', required: false },
      { key: 'childrenUnder5', label: '5 साल से कम बच्चे', required: false },
      { key: 'pregnantWomen', label: 'गर्भवती महिलाएं', required: false },
      { key: 'income', label: 'मासिक आय', required: false },
      { key: 'bplCard', label: 'बीपीएल कार्ड', required: false },
      { key: 'aadharNumber', label: 'आधार नंबर', required: false },
      { key: 'educationLevel', label: 'शिक्षा स्तर', required: false },
      { key: 'symptom', label: 'मुख्य लक्षण', required: true }
    ];

    // Save to Firestore
    const handleSave = async () => {
      setVoiceLogSaving(true);
      try {
        await addDoc(collection(db, "voiceLogs"), {
          ...voiceLogFormState,
          transcript: aiPatientEntryTranscript,
          userId: user ? user.uid : null,
          timestamp: new Date(),
        });
        setVoiceLogSaving(false);
        setVoiceLogReviewMode(false);
        setVoiceLogFormState({});
        setAiPatientEntryTranscript("");
        setAiPatientEntryInterim("");
        alert('Patient information saved successfully!');
      } catch (e) {
        setVoiceLogSaving(false);
        alert('Failed to save patient information.');
      }
    };

    // Render
    if (voiceLogEditAllMode) {
      return (
        <div className="transcript-box" style={{ width: '500px', maxWidth: '98vw', minWidth: '320px', margin: '0 auto', border: '2.5px solid #77107D', borderRadius: 18, background: '#f8eafd', boxShadow: '0 4px 24px #77107D22', padding: window.innerWidth < 600 ? '0.7rem 0.2rem' : '2rem 2.5rem', fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}>
          <h3>फॉर्म संपादित करें</h3>
          <form onSubmit={e => { e.preventDefault(); setVoiceLogFormState(voiceLogEditAllDraft); setVoiceLogEditAllMode(false); setVoiceLogReviewMode(true); }}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {formFields.map((field) => (
                <li key={field.key} style={{ marginBottom: 18 }}>
                  <b>{field.label.replace('क्या है?', '')}:</b>
                  <input
                    type="text"
                    value={voiceLogEditAllDraft[field.key] || ''}
                    onChange={e => setVoiceLogEditAllDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.label}
                    style={{ marginLeft: 8, padding: '0.5rem', borderRadius: 6, border: '1.5px solid #e1b6e7', fontSize: '1.05rem', width: '70%' }}
                  />
                </li>
              ))}
            </ul>
            <button
              className="big-btn"
              style={{ background: '#4caf50', color: '#fff', marginRight: 16 }}
              type="submit"
            >
              Save
        </button>
            <button
              className="big-btn"
                  style={{ background: '#f06292', color: '#fff' }}
                  type="button"
                  onClick={() => setVoiceLogEditAllMode(false)}
                >
                  Back to Review
                </button>
              </form>
            </div>
          );
        }

        if (voiceLogReviewMode) {
          return (
            <div className="transcript-box" style={{ width: '500px', maxWidth: '98vw', minWidth: '320px', margin: '0 auto', border: '2.5px solid #77107D', borderRadius: 18, background: '#f8eafd', boxShadow: '0 4px 24px #77107D22', padding: window.innerWidth < 600 ? '0.7rem 0.2rem' : '2rem 2.5rem', fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}>
              <h3>फॉर्म की समीक्षा करें</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {formFields.map((field) => (
                  <li key={field.key} style={{ marginBottom: 12 }}>
                    <b>{field.label.replace('क्या है?', '')}:</b> {voiceLogFormState[field.key] || <span style={{ color: '#aaa' }}>—</span>}
                  </li>
                ))}
              </ul>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <button
                className="big-btn"
                  style={{ 
                    flex: 1,
                    background: '#4caf50', 
                    color: '#fff'
                  }}
                onClick={handleSave}
                disabled={voiceLogSaving}
              >
                {voiceLogSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="big-btn"
                  style={{ 
                    flex: 1,
                    background: '#f06292', 
                    color: '#fff'
                  }}
                onClick={() => {
                  setVoiceLogEditAllDraft(voiceLogFormState); // start editing with current values
                  setVoiceLogEditAllMode(true);
              }}
                disabled={voiceLogSaving}
              >
                Edit
            </button>
                <button
                  className="big-btn"
                  style={{ 
                    flex: 1,
                    background: '#607D8B', 
                    color: '#fff'
                  }}
                  onClick={() => {
                    setVoiceLogReviewMode(false);
                    setVoiceLogFormState({});
                    setAiPatientEntryTranscript("");
                    setAiPatientEntryInterim("");
                  }}
                  disabled={voiceLogSaving}
                >
                  पीछे
            </button>
              </div>
            </div>
          );
        }

        return (
          <div className="transcript-box" style={{ width: '500px', maxWidth: '98vw', minWidth: '320px', margin: '0 auto', border: '2.5px solid #77107D', borderRadius: 18, background: '#f8eafd', boxShadow: '0 4px 24px #77107D22', padding: window.innerWidth < 600 ? '0.7rem 0.2rem' : '2rem 2.5rem', fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: '#77107D',
              borderBottom: '3px solid #e1b6e7',
              paddingBottom: '0.4rem',
              marginBottom: '1.2rem',
              letterSpacing: '0.01em',
              fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif',
              background: '#f3e6f5',
              borderRadius: '10px 10px 0 0',
              textAlign: 'center',
              boxShadow: '0 2px 8px #e1b6e733'
            }}>मरीज की जानकारी (AI Powered)</h2>
            
            {/* AI Mode Interface */}
            <div>
              <div style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: '#77107D' }}>
                <b>🤖 AI:</b> कृपया मरीज के बारे में बताएं (नाम, आयु, लिंग, लक्षण, आदि)
            </div>
              
              {/* Text Input for Manual Entry */}
              <div style={{ marginBottom: '1rem' }}>
                <textarea
                  placeholder="यहाँ टेक्स्ट लिखें या बोलें..."
                  value={aiPatientEntryTranscript + aiPatientEntryInterim}
                  onChange={(e) => setAiPatientEntryTranscript(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: '2px solid #77107D',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
            </div>
              
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, justifyContent: 'space-between' }}>
                              <button
                  className="big-btn"
                  style={{ 
                    flex: 1,
                    background: isAiPatientEntryListening ? '#FFB900' : '#77107D', 
                    color: '#fff',
                    fontSize: '1rem'
                  }}
                  onClick={isAiPatientEntryListening ? stopAiPatientEntryListening : startAiPatientEntryListening}
                  disabled={false}
                >
                  {isAiPatientEntryListening ? '🛑 रोकें' : '🎤 बोलें'}
              </button>
                <button
                  className="big-btn"
                  style={{ 
                    flex: 1,
                    background: '#4caf50', 
                    color: '#fff',
                    fontSize: '1rem'
                  }}
                  onClick={() => {
                    // Stop listening before processing AI
                    if (isAiPatientEntryListening) {
                      stopAiPatientEntryListening();
                    }
                    handleAiPatientEntry(aiPatientEntryTranscript);
                  }}
                  disabled={!aiPatientEntryTranscript.trim() || isAiPatientEntryProcessing}
                >
                  {isAiPatientEntryProcessing ? '🤖 AI प्रोसेसिंग...' : '🤖 AI से भरें'}
                </button>
              <button
                className="big-btn"
                  style={{ 
                    flex: 1,
                    background: '#f06292', 
                    color: '#fff',
                    fontSize: '1rem'
                  }}
                onClick={() => {
                    resetAiPatientEntry();
                  }}
                  disabled={false}
                >
                  🗑️ साफ़ करें
              </button>
            </div>

              {aiPatientEntryInterim && (
                <div style={{ 
                  background: '#fffbe6', 
                  border: '1.5px solid #FFB900', 
                  borderRadius: 8, 
                  padding: 10, 
                  marginBottom: 10 
                }}>
                  <b>सुन रहा हूं:</b> {aiPatientEntryInterim}
                </div>
              )}

              {aiPatientEntryTranscript && (
                <div style={{ 
                  background: '#f3e6f5', 
                  border: '1.5px solid #e1b6e7', 
                  borderRadius: 8, 
                  padding: 10, 
                  marginBottom: 10,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <b>आपकी बात:</b> {aiPatientEntryTranscript}
                </div>
              )}

              {isAiPatientEntryProcessing && (
                <div style={{ 
                  background: '#e8f5e8', 
                  border: '1.5px solid #4caf50', 
                  borderRadius: 8, 
                  padding: 10, 
                  marginBottom: 10,
                  textAlign: 'center'
                }}>
                  <b>🤖 AI जानकारी निकाल रहा है...</b>
                </div>
              )}
            </div>
          </div>
        );
      }


  const renderFeatureContent_history = () => {
    return (
      <div className="history-box" style={{ background: '#F3E6F5', border: '2.5px solid #77107D', boxShadow: '0 8px 32px 0 #77107D22', maxWidth: window.innerWidth < 600 ? '100%' : '500px', width: '100%', margin: '0 auto', borderRadius: '18px', padding: window.innerWidth < 600 ? '0.7rem 0.2rem' : '2rem 2.5rem' }}>
        <h3 style={{ color: '#77107D' }}>Patient History</h3>
        {history.length === 0 ? (
          <p>No logs found.</p>
        ) : (
          <ul style={{ paddingLeft: 0 }}>
            {history.map((log, idx) => (
              <li key={log.id} style={{
                marginBottom: "1rem",
                background: "#fff",
                color: '#222',
                border: "2px solid #77107D",
                borderRadius: "18px",
                boxShadow: "0 2px 8px #77107D22",
                padding: window.innerWidth < 600 ? "0.8em 0.5em" : "1.2em 1.5em",
                fontWeight: 500,
                listStyle: "none",
                display: "block",
                maxWidth: '700px',
                width: '100%',
                boxSizing: 'border-box',
                overflowX: 'auto',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}>
                <div><b>Date:</b> {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : "Unknown"}</div>
                <div style={{ margin: "0.2em 0 0.5em 0" }}><b>Patient Name:</b> {log.name || "—"}</div>
                <div style={{ margin: "0.2em 0 0.5em 0" }}><b>Transcript:</b> {log.transcript || "—"}</div>
                <button
                  style={{
                    background: "#FFB900",
                    color: "#77107D",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.3em 1.1em",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "1em",
                    marginRight: "0.5em"
                  }}
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, "voiceLogs", log.id));
                      setHistory(history.filter((item) => item.id !== log.id));
                      console.log("Deleted log with id:", log.id);
                    } catch (e) {
                      console.error("Failed to delete log:", e);
                      alert("Failed to delete log: " + e.message);
                    }
                  }}
                >
                  Delete
                </button>
                <button
                  style={{
                    background: "#4caf50",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.3em 1.1em",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "1em"
                  }}
                  onClick={() => handlePrint(log)}
                >
                  Print/Save as PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // ASHA Reports Generation Component
  function ReportsFeature() {
    const [reportType, setReportType] = useState('monthly');
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reportVillage, setReportVillage] = useState('');
    const [generatedReport, setGeneratedReport] = useState(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [reportData, setReportData] = useState(null);
    const reportRef = useRef(null);
    const [showAshaReportPopup, setShowAshaReportPopup] = useState(false);

    const generateASHAReport = async () => {
      setIsGeneratingReport(true);
      try {
        // Fetch only current user's patient data from Firestore (fixed for user isolation)
        const q = query(collection(db, "voiceLogs"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const allPatients = [];
        querySnapshot.forEach((doc) => {
          allPatients.push({ id: doc.id, ...doc.data() });
        });

        // Filter data based on selected criteria
        let filteredData = allPatients;
        
        if (reportVillage) {
          filteredData = filteredData.filter(patient => 
            patient.village && patient.village.toLowerCase().includes(reportVillage.toLowerCase())
          );
        }

        if (reportType === 'monthly') {
          const selectedMonth = new Date(reportMonth + '-01');
          filteredData = filteredData.filter(patient => {
            if (!patient.timestamp) return false;
            const patientDate = patient.timestamp.toDate ? patient.timestamp.toDate() : new Date(patient.timestamp);
            return patientDate.getMonth() === selectedMonth.getMonth() && 
                   patientDate.getFullYear() === selectedMonth.getFullYear();
          });
        }

        // Calculate report statistics
        const reportStats = {
          totalPatients: filteredData.length,
          ageGroups: {
            '0-5': filteredData.filter(p => p.age && p.age <= 5).length,
            '6-18': filteredData.filter(p => p.age && p.age > 5 && p.age <= 18).length,
            '19-60': filteredData.filter(p => p.age && p.age > 18 && p.age <= 60).length,
            '60+': filteredData.filter(p => p.age && p.age > 60).length
          },
          genderDistribution: {
            'पुरुष': filteredData.filter(p => p.gender === 'पुरुष').length,
            'महिला': filteredData.filter(p => p.gender === 'महिला').length,
            'अन्य': filteredData.filter(p => p.gender === 'अन्य').length
          },
          riskLevels: {
            'निम्न': filteredData.filter(p => p.riskLevel === 'निम्न').length,
            'मध्यम': filteredData.filter(p => p.riskLevel === 'मध्यम').length,
            'उच्च': filteredData.filter(p => p.riskLevel === 'उच्च').length
          },
          commonSymptoms: {},
          villages: {},
          referrals: filteredData.filter(p => p.referralNeeded === 'हाँ').length,
          pregnantWomen: filteredData.filter(p => p.pregnantWomen && p.pregnantWomen > 0).length,
          childrenUnder5: filteredData.filter(p => p.childrenUnder5 && p.childrenUnder5 > 0).length
        };

        // Calculate common symptoms
        filteredData.forEach(patient => {
          if (patient.symptom) {
            const symptoms = patient.symptom.split(',').map(s => s.trim());
            symptoms.forEach(symptom => {
              reportStats.commonSymptoms[symptom] = (reportStats.commonSymptoms[symptom] || 0) + 1;
            });
          }
        });

        // Calculate village distribution
        filteredData.forEach(patient => {
          if (patient.village) {
            reportStats.villages[patient.village] = (reportStats.villages[patient.village] || 0) + 1;
          }
        });

        // Generate AI-powered analysis
        const aiPrompt = `Analyze this ASHA worker's personal data and provide insights in Hindi:\n\nTotal Patients: ${reportStats.totalPatients}\nAge Groups: ${JSON.stringify(reportStats.ageGroups)}\nGender Distribution: ${JSON.stringify(reportStats.genderDistribution)}\nRisk Levels: ${JSON.stringify(reportStats.riskLevels)}\nReferrals: ${reportStats.referrals}\nPregnant Women: ${reportStats.pregnantWomen}\nChildren Under 5: ${reportStats.childrenUnder5}\nCommon Symptoms: ${JSON.stringify(reportStats.commonSymptoms)}\nVillages: ${JSON.stringify(reportStats.villages)}\n\nProvide:\n1. Key health trends for this ASHA worker's patients\n2. Priority areas for intervention\n3. Recommendations for government schemes\n4. Resource allocation suggestions\n5. Follow-up action items`;

        const aiResponse = await fetch(AI_ASSISTANT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: aiPrompt,
            type: 'asha_report_analysis'
          })
        });

        const aiData = await aiResponse.json();
        const aiAnalysis = aiData.answer || 'AI analysis not available';

        const finalReport = {
          reportType,
          reportMonth,
          reportVillage,
          generatedDate: new Date().toLocaleDateString('hi-IN'),
          statistics: reportStats,
          aiAnalysis,
          rawData: filteredData
        };

        setReportData(finalReport);
        setGeneratedReport(finalReport);
        setShowAshaReportPopup(true);

      } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report. Please try again.');
      } finally {
        setIsGeneratingReport(false);
      }
    };

    const downloadReport = async () => {
      if (!generatedReport) return;
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      const input = reportRef.current;
      if (!input) return;
      // Use html2canvas to capture the report section
      html2canvas(input, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        // Calculate image dimensions to fit A4
        const imgWidth = pageWidth - 40;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let y = 20;
        pdf.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight);
        pdf.save(`ASHA_Report_${generatedReport.reportMonth}_${generatedReport.reportVillage || 'All'}.pdf`);
      });
    };

    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: '#F3E6F5',
        border: '2.5px solid #77107D',
        borderRadius: '18px',
        padding: '2rem',
        boxShadow: '0 8px 32px 0 rgba(119,16,125,0.10)'
      }}>
        <h2 style={{ 
          color: '#77107D', 
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '1.8rem'
        }}>
          📊 मेरी ASHA कार्यकर्ता रिपोर्ट जनरेट करें
        </h2>

        {/* Report Configuration */}
        <div style={{ 
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '2px solid #e1b6e7'
        }}>
          <h3 style={{ color: '#77107D', marginBottom: '1rem' }}>रिपोर्ट कॉन्फ़िगरेशन</h3>
          <p style={{ 
            color: '#666', 
            fontSize: '0.9rem', 
            marginBottom: '1rem',
            fontStyle: 'italic'
          }}>
            💡 यह रिपोर्ट आपके द्वारा दर्ज किए गए मरीजों के डेटा पर आधारित है
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem', 
            marginBottom: '1rem' 
          }}>
            <div style={{ minWidth: '0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                रिपोर्ट प्रकार:
              </label>
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '2px solid #e1b6e7',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="monthly">मासिक रिपोर्ट</option>
                <option value="allTime">सभी समय की रिपोर्ट</option>
              </select>
            </div>

            {reportType === 'monthly' && (
              <div style={{ minWidth: '0' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  महीना चुनें:
                </label>
                <input 
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    border: '2px solid #e1b6e7',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            <div style={{ minWidth: '0' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                गाँव (वैकल्पिक):
              </label>
              <input 
                type="text"
                placeholder="गाँव का नाम"
                value={reportVillage}
                onChange={(e) => setReportVillage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '2px solid #e1b6e7',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <button
            onClick={generateASHAReport}
            disabled={isGeneratingReport}
            style={{
              width: '100%',
              padding: '1rem',
              background: isGeneratingReport ? '#ccc' : '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: isGeneratingReport ? 'not-allowed' : 'pointer'
            }}
          >
            {isGeneratingReport ? '🔄 रिपोर्ट जनरेट हो रही है...' : '📊 रिपोर्ट जनरेट करें'}
          </button>
        </div>

        {/* ASHA Report Popup Modal */}
        {showAshaReportPopup && generatedReport && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '18px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px 0 #77107D22',
              padding: '2rem',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowAshaReportPopup(false)}
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  background: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1001
                }}
              >✕</button>
              {/* The report content (copied from the inline rendering) */}
              <div ref={reportRef} style={{ 
                background: '#fff',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '2px solid #4caf50'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{ color: '#4caf50', margin: 0 }}>📊 जनरेट की गई रिपोर्ट</h3>
                  <button
                    onClick={downloadReport}
                    style={{
                      background: '#FFB900',
                      color: '#77107D',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.8rem 1.5rem',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    📥 डाउनलोड करें
                  </button>
                </div>

                {/* Report Summary */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: '#77107D', marginBottom: '1rem' }}>सारांश</h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                  }}>
                    <div style={{ 
                      background: '#f3e6f5', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#77107D' }}>
                        {generatedReport.statistics.totalPatients}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>कुल मरीज</div>
                    </div>
                    <div style={{ 
                      background: '#f3e6f5', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#77107D' }}>
                        {generatedReport.statistics.referrals}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>रेफरल</div>
                    </div>
                    <div style={{ 
                      background: '#f3e6f5', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#77107D' }}>
                        {generatedReport.statistics.pregnantWomen}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>गर्भवती महिलाएं</div>
                    </div>
                    <div style={{ 
                      background: '#f3e6f5', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#77107D' }}>
                        {generatedReport.statistics.childrenUnder5}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>5 साल से कम बच्चे</div>
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: '#77107D', marginBottom: '1rem' }}>🤖 AI विश्लेषण</h4>
                  <div style={{
                    background: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e1b6e7',
                    whiteSpace: 'pre-line',
                    fontFamily: 'NotoSansDevanagari, Arial, sans-serif',
                    lineHeight: '1.6'
                  }}>
                    {generatedReport.aiAnalysis}
                  </div>
                </div>

                {/* Detailed Statistics */}
                <div>
                  <h4 style={{ color: '#77107D', marginBottom: '1rem' }}>विस्तृत आंकड़े</h4>
                  {/* Age Distribution */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ color: '#666', marginBottom: '0.5rem' }}>आयु वितरण:</h5>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '0.5rem'
                    }}>
                      <div>0-5 साल: {generatedReport.statistics.ageGroups['0-5']}</div>
                      <div>6-18 साल: {generatedReport.statistics.ageGroups['6-18']}</div>
                      <div>19-60 साल: {generatedReport.statistics.ageGroups['19-60']}</div>
                      <div>60+ साल: {generatedReport.statistics.ageGroups['60+']}</div>
                    </div>
                  </div>

                  {/* Risk Levels */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ color: '#666', marginBottom: '0.5rem' }}>जोखिम स्तर:</h5>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '0.5rem'
                    }}>
                      <div>निम्न जोखिम: {generatedReport.statistics.riskLevels['निम्न']}</div>
                      <div>मध्यम जोखिम: {generatedReport.statistics.riskLevels['मध्यम']}</div>
                      <div>उच्च जोखिम: {generatedReport.statistics.riskLevels['उच्च']}</div>
                    </div>
                  </div>

                  {/* Common Symptoms */}
                  {Object.keys(generatedReport.statistics.commonSymptoms).length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h5 style={{ color: '#666', marginBottom: '0.5rem' }}>सामान्य लक्षण:</h5>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.5rem'
                      }}>
                        {Object.entries(generatedReport.statistics.commonSymptoms)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 10)
                          .map(([symptom, count]) => (
                            <div key={symptom}>{symptom}: {count}</div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Feature content renderers
  const renderFeatureContent = () => {
    switch (selectedFeature) {
      case 'patientInfo':
        return (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <button
                  className="big-btn"
                  style={{
                    fontSize: '1.08rem',
                    background: patientInfoSubFeature === 'entry' ? '#FFB900' : '#f3e6f5',
                    color: '#77107D',
                    border: patientInfoSubFeature === 'entry' ? '2.5px solid #77107D' : '2px solid #e1b6e7',
                    fontWeight: 700,
                    minWidth: '180px',
                  }}
                  onClick={() => setPatientInfoSubFeature('entry')}
                >
                  Patient Entry
                </button>
                <button
                  className="big-btn"
                  style={{
                    fontSize: '1.08rem',
                    background: patientInfoSubFeature === 'history' ? '#FFB900' : '#f3e6f5',
                    color: '#77107D',
                    border: patientInfoSubFeature === 'history' ? '2.5px solid #77107D' : '2px solid #e1b6e7',
                    fontWeight: 700,
                    minWidth: '180px',
                  }}
                  onClick={() => setPatientInfoSubFeature('history')}
                >
                  Patient History
                </button>
              </div>
              {patientInfoSubFeature === 'entry' ? renderFeatureContent_voiceLog() : renderFeatureContent_history()}
            </div>
          </div>
        );
      case 'voiceLog':
        return renderFeatureContent_voiceLog();
      case 'history':
        return renderFeatureContent_history();
      case 'medicalAnalysis':
        return (
          <div style={{ 
            border: '2px solid #e1b6e7', 
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px 0 rgba(119,16,125,0.10)',
            maxWidth: '800px',
            margin: '0 auto',
            width: '100%'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: '#77107D',
              borderRadius: '15px',
              color: '#fff'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>
                📋 AI मेडिकल दस्तावेज़ विश्लेषण
              </h3>
              <button
                onClick={clearMedicalAnalysis}
                style={{
                  background: '#FFB900',
                  color: '#77107D',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                🗑️ साफ़ करें
              </button>
            </div>

            {/* Document Type Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold',
                color: '#77107D'
              }}>
                📄 दस्तावेज़ का प्रकार चुनें:
              </label>
              <select 
                value={medicalDocumentType}
                onChange={(e) => setMedicalDocumentType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1b6e7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: '#fff'
                }}
              >
                <option value="">दस्तावेज़ का प्रकार चुनें</option>
                <option value="prescription">🏥 प्रिस्क्रिप्शन (डॉक्टर का पर्चा)</option>
                <option value="labReport">🧪 लैब रिपोर्ट (टेस्ट रिपोर्ट)</option>
                <option value="medicine">💊 दवा पैकेज (मेडिसिन पैक)</option>
              </select>
            </div>

            {/* Image Upload */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold',
                color: '#77107D'
              }}>
                📷 दस्तावेज़ की छवि अपलोड करें:
              </label>
              
              {/* Image Instructions */}
              <div style={{ 
                marginBottom: '1rem',
                padding: '1rem',
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>📋 छवि अपलोड करने के निर्देश:</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#856404' }}>
                  <li><strong>🏥 प्रिस्क्रिप्शन:</strong> डॉक्टर का पर्चा स्पष्ट रूप से दिखाएं</li>
                  <li><strong>🧪 लैब रिपोर्ट:</strong> टेस्ट रिपोर्ट का पूरा पेज अपलोड करें</li>
                  <li><strong>💊 दवा पैकेज:</strong> दवा का लेबल या पैकेज स्पष्ट रूप से दिखाएं</li>
                  <li><strong>📱 छवि गुणवत्ता:</strong> अच्छी रोशनी में स्पष्ट फोटो लें</li>
                  <li><strong>📏 फाइल आकार:</strong> 4MB से कम होना चाहिए</li>
                  <li><strong>📄 फाइल प्रकार:</strong> JPG, PNG, या JPEG स्वीकार्य हैं</li>
                </ul>
              </div>
              
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleMedicalImageUpload}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #e1b6e7',
                  borderRadius: '8px',
                  background: '#fff'
                }}
              />
              {uploadedMedicalImage && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem',
                  background: '#e8f5e8',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}>
                  ✅ अपलोड किया गया: {uploadedMedicalImage.name}
                </div>
              )}
            </div>

            {/* Error Display */}
            {medicalAnalysisError && (
              <div style={{ 
                marginBottom: '1rem',
                padding: '1rem',
                background: '#ffebee',
                border: '1px solid #f44336',
                borderRadius: '8px',
                color: '#c62828'
              }}>
                ❌ {medicalAnalysisError}
              </div>
            )}

            {/* Analysis Button */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={analyzeMedicalDocument}
                disabled={!uploadedMedicalImage || !medicalDocumentType || isMedicalAnalyzing}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isMedicalAnalyzing ? '#ccc' : '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: isMedicalAnalyzing ? 'not-allowed' : 'pointer'
                }}
              >
                {isMedicalAnalyzing ? '🤖 विश्लेषण कर रहा है...' : '🤖 दस्तावेज़ का विश्लेषण करें'}
              </button>
            </div>

            {/* Analysis Results */}
            {medicalAnalysis && (
              <>
                <div style={{ 
                  background: '#fff',
                  border: '2px solid #4caf50',
                  borderRadius: '15px',
                  padding: '1.5rem',
                  marginTop: '1rem'
                }}>
                  <h4 style={{ 
                    color: '#4caf50', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📊 AI विश्लेषण परिणाम:
                  </h4>
                  <div style={{
                    whiteSpace: 'pre-line',
                    fontFamily: 'NotoSansDevanagari, Arial, sans-serif',
                    lineHeight: '1.6',
                    fontSize: '1rem',
                    color: '#333',
                    maxHeight: '200px',
                    overflow: 'hidden'
                  }}>
                    {medicalAnalysis.length > 300 ? medicalAnalysis.substring(0, 300) + '...' : medicalAnalysis}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    marginTop: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => setShowMedicalAnalysisPopup(true)}
                      style={{ 
                        background: '#2196F3', 
                        color: '#fff', 
                        padding: '0.8rem 1.5rem', 
                        borderRadius: '8px', 
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      📋 पूरा विश्लेषण देखें
                    </button>
                    
                    <button
                      onClick={() => {
                        generateDietPlanFromAnalysis(medicalAnalysis);
                        // Popup will be shown automatically after diet plan is generated
                      }}
                      disabled={isGeneratingDietPlan}
                      style={{ 
                        background: isGeneratingDietPlan ? '#ccc' : '#FF9800', 
                        color: '#fff', 
                        padding: '0.8rem 1.5rem', 
                        borderRadius: '8px', 
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: isGeneratingDietPlan ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {isGeneratingDietPlan ? '🥗 आहार योजना बन रही है...' : '🥗 आहार योजना बनाएं'}
                    </button>
                    

                  </div>
                </div>
                

              </>
            )}
          </div>
        );

      case 'aiAssistant':
        // Find the last AI message
        const lastAiMessage = aiMessages.filter(m => m.sender === 'ai').pop();
        return (
          <div style={{ 
            background: '#F3E6F5', 
            border: '2px solid #e1b6e7', 
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px 0 rgba(119,16,125,0.10)',
            height: '75vh',
            maxWidth: '700px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '120px' // Add bottom margin to avoid overlap with floating icons
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '1rem',
              padding: '1rem',
              background: '#77107D',
              borderRadius: '15px',
              color: '#fff'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>
                🤖 AI स्वास्थ्य सहायक
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setAiMessages([])}
                  style={{
                    background: '#FFB900',
                    color: '#77107D',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🗑️ साफ़ करें
                </button>
              </div>
            </div>

           

            {/* Chat Messages */}
            <div
              ref={aiChatRef}
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                background: '#fff', 
                borderRadius: '15px',
                padding: '1rem',
                border: '1px solid #e1b6e7',
                marginBottom: '1rem'
              }}
            >
              {aiMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                  <h4 style={{ color: '#77107D', marginBottom: '1rem' }}>स्वागत है!</h4>
                  <p>मैं आपकी स्वास्थ्य संबंधी समस्याओं में मदद कर सकता हूं</p>
                  
                  {/* Emergency Health Alerts */}
                  <div style={{ 
                    marginTop: '1.5rem', 
                    padding: '1rem', 
                    background: '#fff3cd', 
                    border: '1px solid #ffeaa7', 
                    borderRadius: '8px',
                    textAlign: 'left'
                  }}>
                    <h5 style={{ color: '#856404', marginBottom: '0.5rem' }}>🚨 आपातकालीन स्वास्थ्य संकेत:</h5>
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: 0,
                      fontSize: '0.9rem',
                      color: '#856404'
                    }}>
                      <li>• तेज बुखार (104°F से ऊपर)</li>
                      <li>• सांस लेने में तकलीफ</li>
                      <li>• गर्भावस्था में रक्तस्राव</li>
                      <li>• बच्चे में दौरे या बेहोशी</li>
                      <li>• गंभीर चोट या दर्द</li>
                    </ul>
                    <p style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.8rem', 
                      color: '#856404',
                      fontStyle: 'italic'
                    }}>
                      इन लक्षणों के दिखने पर तुरंत डॉक्टर से संपर्क करें
                    </p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.5rem', 
                    justifyContent: 'center',
                    marginTop: '1rem'
                  }}>
                    {[
                      'बुखार', 'सिरदर्द', 'खांसी', 'पेट दर्द', 
                      'ब्लड प्रेशर', 'डायबिटीज', 'गर्भावस्था', 
                      'बच्चों की देखभाल', 'पोषण', 'टीकाकरण',
                      'मासिक धर्म', 'मानसिक स्वास्थ्य'
                    ].map((symptom) => (
                      <button
                        key={symptom}
                        onClick={() => handleAiSubmit(symptom)}
                        style={{
                          background: '#f3e6f5',
                          border: '1px solid #e1b6e7',
                          borderRadius: '20px',
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          color: '#77107D',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#e1b6e7';
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#f3e6f5';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                aiMessages.map((message, idx) => {
                  return (
                    <div
                      key={message.id}
                      style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        borderRadius: '15px',
                        background: message.sender === 'user' ? '#e3f2fd' : '#f3e6f5',
                        border: message.sender === 'user' ? '1px solid #bbdefb' : '1px solid #e1b6e7',
                        maxWidth: '85%',
                        marginLeft: message.sender === 'user' ? 'auto' : '0',
                        marginRight: message.sender === 'user' ? '0' : 'auto',
                        position: 'relative',
                      }}
                    >
                      <div style={{
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        color: message.sender === 'user' ? '#1976d2' : '#77107D',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {message.sender === 'user' ? '👤 आप' : '🤖 AI सहायक'}
                      </div>
                      <div style={{
                        whiteSpace: 'pre-line',
                        fontFamily: 'NotoSansDevanagari, Arial, sans-serif',
                        lineHeight: '1.6',
                        fontSize: '1rem'
                      }}>
                        {message.text}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        marginTop: '0.5rem',
                        textAlign: 'right'
                      }}>
                        {message.timestamp
                          ? (message.timestamp.toDate
                              ? message.timestamp.toDate().toLocaleTimeString()
                              : new Date(message.timestamp.seconds ? message.timestamp.seconds * 1000 : message.timestamp).toLocaleTimeString())
                          : ""}
                      </div>
                    </div>
                  );
                })
              )}
              {isAiProcessing && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: '#f3e6f5',
                  border: '1px solid #e1b6e7',
                  textAlign: 'center',
                  color: '#77107D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{ animation: 'spin 1s linear infinite' }}>🤖</div>
                  <div>AI सोच रहा है...</div>
                </div>
              )}
            </div>

            {aiAudio && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                <button
                  onClick={() => {
                    if (!isAiSpeaking) {
                      if (aiAudioRef.current) {
                        aiAudioRef.current.currentTime = 0;
                        aiAudioRef.current.play();
                        setIsAiSpeaking(true);
                      }
                    } else {
                      if (aiAudioRef.current) {
                        aiAudioRef.current.pause();
                        aiAudioRef.current.currentTime = 0;
                      }
                      setIsAiSpeaking(false);
                      setAiAudio(null); // Hide the audio player
                      setAiInput(""); // Clear the text area
                    }
                  }}
                  style={{
                    background: isAiSpeaking ? '#f06292' : '#77107D',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1.2rem',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isAiSpeaking ? '0 0 8px #f0629240' : '0 2px 8px #77107D22',
                    transition: 'background 0.18s, box-shadow 0.18s',
                  }}
                >
                  {isAiSpeaking ? '⏹️ Stop' : '🔊 Play'}
                </button>
                <span style={{ color: '#77107D', fontWeight: 600 }}>
                  {isAiSpeaking ? 'Playing AI response...' : 'Play AI response'}
                </span>
                <audio
                  ref={aiAudioRef}
                  src={aiAudio}
                  onEnded={() => setIsAiSpeaking(false)}
                  style={{ display: 'none' }}
                />
              </div>
            )}

            {/* Input Area */}
            <div style={{ 
              background: '#fff', 
              borderRadius: '15px', 
              padding: '1rem',
              border: '1px solid #e1b6e7'
            }}>
              {/* Text Input */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="अपना स्वास्थ्य प्रश्न यहाँ लिखें या बोलें..."
                  rows={2}
                  style={{
                    flex: 1,
                    minHeight: '50px',
                    maxHeight: '100px',
                    padding: '0.8rem',
                    borderRadius: '10px',
                    border: '2px solid #e1b6e7',
                    fontSize: '1rem',
                    fontFamily: 'NotoSansDevanagari, Arial, sans-serif',
                    resize: 'vertical',
                    overflow: 'auto',
                    lineHeight: 1.5
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && aiInput.trim()) {
                      e.preventDefault();
                      await handleAiSubmit(aiInput);
                    }
                  }}
                />
                
                {/* Voice Input Button */}
                <button
                  onClick={isAiListening ? stopAiListening : startAiListening}
                  style={{
                    background: isAiListening ? '#FFB900' : '#77107D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  title={isAiListening ? "बोलना बंद करें" : "आवाज से पूछें"}
                >
                  {isAiListening ? '🛑' : '🎤'}
                </button>
                
                {/* Clear Text Button */}
                <button
                  onClick={() => {
                    setAiInput("");
                    setAiInterimTranscript("");
                    if (isAiListening) {
                      stopAiListening();
                    }
                  }}
                  style={{
                    background: aiInput.trim() ? '#FFB900' : '#ccc',
                    color: '#77107D',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: aiInput.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: aiInput.trim() ? 1 : 0.5
                  }}
                  title="टेक्स्ट साफ़ करें"
                  disabled={!aiInput.trim()}
                >
                  🗑️
                </button>
                
                <button
                  onClick={() => handleAiSubmit(aiInput)}
                  disabled={!aiInput.trim() || isAiProcessing}
                  style={{ 
                    background: '#4caf50', 
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.8rem 1.5rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '1rem',
                    minWidth: '80px'
                  }}
                >
                  {isAiProcessing ? '⏳' : 'पूछें'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'reminders':
        return (
          <>
        {/* Remove Reminders button for 'view' and 'add' subpages */}
        {remindersSubFeature !== 'view' && remindersSubFeature !== 'add' && (
        <button
          className="big-btn"
          onClick={isSpeakingReminders ? stopSpeakingReminders : speakOverdueReminders}
          style={{ background: isSpeakingReminders ? '#FFB900' : '#77107D', color: '#fff', marginBottom: '1.2rem' }}
        >
          {isSpeakingReminders ? '🛑 Stop Speaking' : '📅 Reminders'}
        </button>
        )}
        {showReminders && (
          <div className="reminder-box" style={{ background: '#F3E6F5', border: '2.5px solid #77107D', boxShadow: '0 8px 32px 0 #77107D22', maxWidth: window.innerWidth < 600 ? '100%' : '500px', width: '100%', margin: '0 auto', borderRadius: '18px', padding: window.innerWidth < 600 ? '0.7rem 0.2rem' : '2rem 2.5rem' }}>
            <h3 style={{ color: '#77107D' }}>लंबित रिमाइंडर</h3>
            {(() => {
              const now = new Date();
              const overdueReminders = reminders.filter(rem => !rem.done && rem.date && ((now - new Date(rem.date)) / (1000 * 60 * 60 * 24) >= 7));
              if (overdueReminders.length === 0) {
                return <p>कोई लंबित रिमाइंडर नहीं है।</p>;
              }
              return (
                <ul style={{ paddingLeft: 0 }}>
                  {overdueReminders
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(rem => {
                      const isOverdue = !rem.done && rem.date && ((new Date() - new Date(rem.date)) / (1000 * 60 * 60 * 24) >= 7);
                      return (
                        <li key={rem.id} style={{
                          marginBottom: "1rem",
                          background: isOverdue ? 'var(--meesho-light)' : '#fff',
                          color: isOverdue ? '#77107D' : '#222',
                          border: '2px solid #77107D',
                          borderRadius: "18px",
                          boxShadow: "0 2px 8px #77107D22",
                          padding: window.innerWidth < 600 ? "0.8em 0.5em" : "1.2em 1.5em",
                          fontWeight: isOverdue ? 700 : 500,
                          listStyle: "none",
                          display: "block",
                          maxWidth: window.innerWidth < 600 ? '98vw' : '500px',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflowX: 'auto',
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}>
                          <div><b>दिनांक:</b> {rem.date}</div>
                          <div style={{ margin: "0.2em 0 0.5em 0" }}><b>नोट:</b> {rem.text}</div>
                  <button
                    style={{
                              background: "#FFB900",
                              color: "#77107D",
                      border: "none",
                              borderRadius: "8px",
                              padding: "0.3em 1.1em",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "1em"
                    }}
                    onClick={async () => {
                              await deleteDoc(doc(db, "reminders", rem.id));
                              setReminders(reminders.filter(r => r.id !== rem.id));
                    }}
                  >
                    Delete
                  </button>
                </li>
                      );
                    })}
            </ul>
              );
            })()}
        </div>
      )}
          </>
        );
      case 'doctorSupport':
        return (
          <div style={{ 
            display: 'flex', 
            gap: '2rem', 
            justifyContent: 'center', 
            alignItems: 'flex-start', 
            width: '100%', 
            minHeight: '60vh', 
            background: 'linear-gradient(120deg, #f8f6fb 0%, #fff 100%)', 
            padding: 0, 
            boxSizing: 'border-box',
            border: '2px solid #c77dff', // Revert to lighter border
            borderRadius: '16px',
            margin: '0.5rem 0',
            marginBottom: '120px' // Add bottom margin to avoid overlap with floating icons
          }}>
            {/* Left Panel */}
            <div style={{ minWidth: 340, maxWidth: 400, flex: '0 0 400px', display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'stretch' }}>
              {/* Header Card */}
              <div style={{
                background: 'linear-gradient(135deg, #77107D 0%, #c77dff 100%)',
                borderRadius: '12px 12px 0 0',
                padding: '1.2rem 1.5rem 0.7rem 1.5rem',
                color: '#fff',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                border: '1.5px solid #c77dff', // Revert to lighter border
                borderBottom: 'none',
                fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.5rem', fontWeight: 700 }}>
                  <span role="img" aria-label="video">🎥</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Doctor Support</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 400, marginTop: 4, opacity: 0.95 }}>
                  Connect with your doctor for a secure video consultation
                </div>
              </div>
              {/* Main Card */}
              <div style={{
                background: '#fff',
                borderRadius: '0 0 12px 12px',
                border: '1.5px solid #c77dff',
                borderTop: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: 340,
                fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif',
                padding: '1.2rem 1.5rem 1.5rem 1.5rem',
              }}>
                <div style={{
                  background: '#77107D',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '54px',
                  height: '54px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 0 0.7rem 0',
                }}>
                  🎥
                </div>
                <h3 style={{ color: '#77107D', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}>Start Doctor Support</h3>
                <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.3', textAlign: 'center' }}>
                  Enter a meeting ID to join an existing consultation, or leave empty to create a new one.
                </p>
                <input
                  type="text"
                  value={jitsiMeetingId}
                  onChange={e => setJitsiMeetingId(e.target.value)}
                  placeholder="Meeting ID (optional)"
                  style={{
                    width: '100%',
                    maxWidth: 220,
                    padding: '0.4rem 0.7rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c77dff',
                    fontSize: '0.95rem',
                    marginBottom: '1.1rem',
                    outline: 'none',
                    color: '#77107D',
                    background: '#fff',
                    textAlign: 'center',
                    fontWeight: 600
                  }}
                />
                {/* Action buttons row */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', justifyContent: 'center', margin: '0.7rem 0', flexWrap: 'nowrap', maxWidth: '100%' }}>
                  <button
                    className="big-btn"
                    type="button"
                    onClick={() => startJitsiCall(jitsiMeetingId)}
                    style={{
                      background: '#43a047',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minWidth: '90px',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🎥</span>
                    Start Doctor Support
                  </button>
                  <button
                    className="big-btn"
                    type="button"
                    onClick={() => startJitsiCall()}
                    style={{
                      background: '#6a1b9a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minWidth: '90px',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🆕</span>
                    Create New Meeting
                  </button>
                  <button
                    className="big-btn"
                    type="button"
                    onClick={() => alert(`Container: ${!!jitsiContainerRef.current}\nPlaceholder: ${!!document.querySelector('#jitsi-container-placeholder')}`)}
                    style={{
                      background: '#FFB900',
                      color: '#77107D',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minWidth: '90px',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🛠️</span>
                    Debug
                  </button>
                  <button
                    className="big-btn"
                    type="button"
                    onClick={() => alert('Test button works! Doctor support buttons should also work.')}
                    style={{
                      background: '#ff6b6b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minWidth: '90px',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>🧪</span>
                    Test Button
                  </button>
                </div>
                {/* Cut Call button, only show when in call */}
                {isInJitsiCall && (
                  <button
                    type="button"
                    onClick={endJitsiCall}
                    style={{
                      background: '#e53935',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minWidth: '90px',
                      marginTop: '0.7rem',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>📴</span>
                    Cut Call
                  </button>
                )}
              </div>
            </div>
            {/* Right Panel */}
            <div style={{ flex: 1, minWidth: 320, background: '#fff', border: '1.5px solid #c77dff', borderRadius: '12px', minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', position: 'relative' }}>
              <div id="jitsi-container-placeholder" style={{ 
                width: '100%', 
                height: '100%',
                minHeight: 320,
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a259c7',
                fontSize: '1.35rem',
                fontWeight: 600,
                letterSpacing: 0.2,
                border: '2px solid #c77dff', // Revert to lighter border
              }}>
                {jitsiConnectionStatus === 'connecting' && <><span role="img" aria-label="connecting">📞</span> Connecting to doctor support...</>}
                {jitsiConnectionStatus === 'connected' && <><span role="img" aria-label="video">🎥</span> Doctor support is active</>}
                {jitsiConnectionStatus === 'error' && <><span role="img" aria-label="error">❌</span> Connection failed - use retry options above</>}
                {jitsiConnectionStatus === 'disconnected' && <>Doctor support will appear here when started</>}
              </div>
            </div>
          </div>
        );
      case 'addReminder':
        return showAddReminderModal && (
          <div className="modal-overlay" style={{ background: 'var(--meesho-card-bg)', border: '2.5px solid #77107D', borderRadius: '18px', boxShadow: '0 8px 32px #77107D22', padding: '2.5rem 2.5rem 2rem 2.5rem', maxWidth: window.innerWidth < 600 ? '100%' : '500px', width: '100%', margin: '3rem auto', position: 'relative' }}>
            <h3>Add Reminder</h3>
            {/* Move interim transcript above input fields */}
            {reminderInterimTranscript && (
              <div style={{ 
                background: '#f3e6f5', 
                padding: '0.8rem', 
                borderRadius: '10px', 
                marginBottom: '0.8rem',
                border: '1px solid #e1b6e7',
                fontSize: '0.9rem',
                color: '#77107D'
              }}>
                <strong>सुन रहा हूं:</strong> {reminderInterimTranscript}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                className="reminder-input"
                placeholder="Reminder note"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                style={{ margin: "0.5rem 0", width: "60%" }}
                disabled={isReminderListening}
              />
              <button
                className="big-btn"
                style={{ width: 60, background: isReminderListening ? '#FFB900' : '#77107D', color: '#fff', fontSize: '1.2rem', padding: 0 }}
                type="button"
                onClick={() => {
                  if (isReminderListening) {
                    // Stop listening if already listening
                    if (reminderRecognitionRef.current) {
                      reminderRecognitionRef.current.stop();
                    }
                    return;
                  }
                  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert('Speech recognition is not supported in this browser.');
                    return;
                  }
                  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                  reminderRecognitionRef.current = new SpeechRecognition();
                  reminderRecognitionRef.current.continuous = true;
                  reminderRecognitionRef.current.interimResults = true;
                  reminderRecognitionRef.current.lang = 'hi-IN';
                  reminderRecognitionRef.current.onstart = () => {
                    console.log('Speech recognition started');
                    setIsReminderListening(true);
                    setReminderInterimTranscript("");
                  };
                  reminderRecognitionRef.current.onresult = (event) => {
                    console.log('Speech recognition result:', event);
                    let interim = "";
                    let final = "";
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                      if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                      } else {
                        interim += event.results[i][0].transcript;
                      }
                    }
                    console.log('Interim transcript:', interim);
                    console.log('Final transcript:', final);
                    setReminderInterimTranscript(interim);
                    if (final) {
                      setReminderText(prev => prev + final);
                    }
                  };
                  reminderRecognitionRef.current.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsReminderListening(false);
                  };
                  reminderRecognitionRef.current.onend = () => {
                    console.log('Speech recognition ended');
                    setIsReminderListening(false);
                  };
                  try {
                    reminderRecognitionRef.current.start();
                  } catch (error) {
                    console.error('Error starting speech recognition:', error);
                    setIsReminderListening(false);
                  }
                }}
                disabled={isReminderListening}
              >
                🎤
              </button>
              <button
                className="big-btn"
                style={{ width: 60, background: '#f06292', color: '#fff', fontSize: '1.2rem', padding: 0 }}
                type="button"
                onClick={() => {
                  setReminderText("");
                  setReminderInterimTranscript("");
                }}
                disabled={isReminderListening}
              >
                🗑️
              </button>
            </div>
            <input
              type="date"
              className="reminder-input"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              style={{ margin: "0.5rem 0", width: "35%" }}
            />
            <div style={{ marginTop: '1rem' }}>
              <button
                className="big-btn"
                style={{ width: "auto", marginRight: "1rem" }}
                onClick={async () => {
                  // Stop listening if active
                  if (isReminderListening && reminderRecognitionRef.current) {
                    reminderRecognitionRef.current.stop();
                    setIsReminderListening(false);
                  }
                  
                  if (reminderText && reminderDate) {
                    const docRef = await addDoc(collection(db, "reminders"), {
                      text: reminderText,
                      date: reminderDate,
                      timestamp: new Date(),
                      userId: user.uid
                    });
                    setReminders([...reminders, { id: docRef.id, text: reminderText, date: reminderDate }]);
                    setReminderText("");
                    setReminderDate("");
                    setReminderInterimTranscript(""); // Clear interim transcript
                    setShowAddReminderModal(false);
                  }
                }}
                disabled={!reminderText || !reminderDate}
              >
                Add
              </button>
              <button
                className="big-btn"
                style={{ width: "auto", background: "#f06292", color: "#fff" }}
                onClick={() => {
                  // Stop listening if active
                  if (isReminderListening && reminderRecognitionRef.current) {
                    reminderRecognitionRef.current.stop();
                    setIsReminderListening(false);
                  }
                  setShowAddReminderModal(false);
                  setReminderText("");
                  setReminderDate("");
                  setReminderInterimTranscript(""); // Clear interim transcript
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );
      case 'reports':
        return <ReportsFeature />;
      case 'govtSchemes':
        return <GovtSchemeSuggestions user={user} cleanCorruptedPatientData={cleanCorruptedPatientData} />;
      default:
        return null;
    }
  };

  // Replace the bellButton definition with a new async handler that fetches reminders from Firestore before speaking
  const handleBellClick = async () => {
    if (isSpeakingReminders) {
      speakingRef.current = false;
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingReminders(false);
      return;
    }
    if (!user) return;
    // Only fetch reminders for the current user
    const remindersQuery = query(collection(db, "reminders"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(remindersQuery);
    const rems = [];
    querySnapshot.forEach((doc) => {
      rems.push({ id: doc.id, ...doc.data() });
    });
    setReminders(rems);
    if (!('speechSynthesis' in window)) {
      alert('Sorry, your browser does not support speech synthesis.');
      return;
    }
    window.speechSynthesis.cancel();
    const now = new Date();
    const overdueReminders = rems.filter(rem => !rem.done && rem.date && ((now - new Date(rem.date)) / (1000 * 60 * 60 * 24) >= 7));
    if (overdueReminders.length === 0) {
      const hindiUtter = new SpeechSynthesisUtterance('कोई लंबित रिमाइंडर नहीं है।');
      hindiUtter.lang = 'hi-IN';
      window.speechSynthesis.speak(hindiUtter);
      setIsSpeakingReminders(true);
      setTimeout(() => setIsSpeakingReminders(false), 1800);
      return;
    }
    let idx = 0;
    setIsSpeakingReminders(true);
    speakingRef.current = true;
    const speakNext = () => {
      if (!speakingRef.current || idx >= overdueReminders.length) {
        setIsSpeakingReminders(false);
        return;
      }
      const rem = overdueReminders[idx];
      
      // Convert date to Hindi format with natural pronunciation
      const formatDateInHindi = (dateString) => {
        try {
          const date = new Date(dateString);
          const day = date.getDate();
          const month = date.getMonth();
          const year = date.getFullYear();
          
          // Hindi month names
          const hindiMonths = [
            'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
            'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
          ];
          
          // Convert day to Hindi words for better pronunciation
          const convertDayToHindi = (dayNum) => {
            if (dayNum === 1) return 'पहली';
            if (dayNum === 2) return 'दूसरी';
            if (dayNum === 3) return 'तीसरी';
            if (dayNum === 4) return 'चौथी';
            if (dayNum === 5) return 'पांचवीं';
            if (dayNum === 6) return 'छठी';
            if (dayNum === 7) return 'सातवीं';
            if (dayNum === 8) return 'आठवीं';
            if (dayNum === 9) return 'नौवीं';
            if (dayNum === 10) return 'दसवीं';
            if (dayNum === 11) return 'ग्यारहवीं';
            if (dayNum === 12) return 'बारहवीं';
            if (dayNum === 13) return 'तेरहवीं';
            if (dayNum === 14) return 'चौदहवीं';
            if (dayNum === 15) return 'पंद्रहवीं';
            if (dayNum === 16) return 'सोलहवीं';
            if (dayNum === 17) return 'सत्रहवीं';
            if (dayNum === 18) return 'अठारहवीं';
            if (dayNum === 19) return 'उन्नीसवीं';
            if (dayNum === 20) return 'बीसवीं';
            if (dayNum === 21) return 'इक्कीसवीं';
            if (dayNum === 22) return 'बाईसवीं';
            if (dayNum === 23) return 'तेईसवीं';
            if (dayNum === 24) return 'चौबीसवीं';
            if (dayNum === 25) return 'पच्चीसवीं';
            if (dayNum === 26) return 'छब्बीसवीं';
            if (dayNum === 27) return 'सत्ताईसवीं';
            if (dayNum === 28) return 'अट्ठाईसवीं';
            if (dayNum === 29) return 'उनतीसवीं';
            if (dayNum === 30) return 'तीसवीं';
            if (dayNum === 31) return 'इकतीसवीं';
            return dayNum.toString(); // fallback
          };
          
          // Convert year to natural Hindi pronunciation
          const convertYearToHindi = (yearNum) => {
            if (yearNum === 2024) return 'दो हजार चौबीस';
            if (yearNum === 2025) return 'दो हजार पच्चीस';
            if (yearNum === 2026) return 'दो हजार छब्बीस';
            if (yearNum === 2023) return 'दो हजार तेईस';
            if (yearNum === 2022) return 'दो हजार बाईस';
            if (yearNum === 2021) return 'दो हजार इक्कीस';
            if (yearNum === 2020) return 'दो हजार बीस';
            
            // For other years, use a more natural approach
            const yearStr = yearNum.toString();
            if (yearStr.startsWith('20')) {
              const lastTwoDigits = yearStr.substring(2);
              const lastTwoNum = parseInt(lastTwoDigits);
              if (lastTwoNum <= 30) {
                const hindiNumbers = ['बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस'];
                return `दो हजार ${hindiNumbers[lastTwoNum - 20]}`;
              }
            }
            
            // Fallback: convert each digit
            const hindiDigits = ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ'];
            let result = '';
            for (let i = 0; i < yearStr.length; i++) {
              const digit = parseInt(yearStr[i]);
              result += hindiDigits[digit];
              if (i < yearStr.length - 1) result += ' ';
            }
            return result;
          };
          
          const dayInHindi = convertDayToHindi(day);
          const yearInHindi = convertYearToHindi(year);
          
          // Return in format: "पांचवीं जुलाई दो हजार पच्चीस"
          return `${dayInHindi} ${hindiMonths[month]} ${yearInHindi}`;
        } catch (error) {
          return dateString; // fallback to original if error
        }
      };
      
      const formattedDate = formatDateInHindi(rem.date);
      const text = `रिमाइंडर: ${rem.text}, तारीख: ${formattedDate}`;
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = 'hi-IN';
      utter.onend = () => {
        idx++;
        speakNext();
      };
      utter.onerror = () => {
        idx++;
        speakNext();
      };
      window.speechSynthesis.speak(utter);
    };
    speakNext();
  };

  const bellButton = (
    <button
      aria-label="Check Reminders"
      title="Check Reminders"
      onClick={handleBellClick}
      style={{
        position: 'absolute',
        top: 18,
        left: 18,
        zIndex: 10,
        background: '#fff',
        border: '2.5px solid #FFB900',
        borderRadius: '50%',
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        color: '#FFB900',
        boxShadow: '0 2px 8px #77107D22',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s, border 0.18s',
      }}
    >
      <span role="img" aria-label="bell">🔔</span>
    </button>
  );



  // Add a floating Doctor Support button above AI Health Assistant
  const doctorSupportFab = (
    <button
      aria-label="Doctor Support"
      title="Doctor Support"
      onClick={() => {
        if (selectedFeature === 'doctorSupport') {
          // If doctor support is active, stop it and go back to patient info
          if (window.jitsiMeetAPI) {
            window.jitsiMeetAPI.dispose();
            window.jitsiMeetAPI = null;
          }
          setIsInJitsiCall(false);
          setJitsiMeetingId("");
          setSelectedFeature('patientInfo');
        } else {
          // Start doctor support
          setSelectedFeature('doctorSupport');
        }
      }}
      style={{
        position: 'fixed',
        bottom: 100,
        right: 32,
        zIndex: 100,
        background: '#2196F3',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        boxShadow: '0 4px 16px #2196F333',
        width: 56,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s, background 0.18s',
        opacity: selectedFeature === 'doctorSupport' ? 0.7 : 1,
      }}
    >
      <span role="img" aria-label="Doctor Support">📞</span>
    </button>
  );

  // Add a floating AI Health Assistant button to the bottom-right of feature-content-area
  const aiAssistantFab = (
    <button
      aria-label="AI Health Assistant"
      title="AI Health Assistant"
      onClick={() => setSelectedFeature(selectedFeature === 'aiAssistant' ? 'patientInfo' : 'aiAssistant')}
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 100,
        background: '#77107D',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        boxShadow: '0 4px 16px #77107D33',
        width: 56,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s, background 0.18s',
        opacity: selectedFeature === 'aiAssistant' ? 0.7 : 1,
      }}
    >
      <span role="img" aria-label="AI Health Assistant">🤖</span>
    </button>
  );

  const mainAppContent = (
    <div className="app-main-layout" style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'linear-gradient(120deg, #f43397 0%, #ffb6d5 60%, #fff0f6 100%)', flexDirection: window.innerWidth < 900 ? 'column' : 'row' }}>
      {/* Sidebar */}
      <div className="sidebar" style={{
        width: window.innerWidth < 900 ? '100vw' : '370px',
        minWidth: window.innerWidth < 900 ? '0' : '320px',
        background: 'linear-gradient(135deg, #77107D 0%, #f3e6f5 100%)',
        padding: window.innerWidth < 900 ? '1rem 0.5rem' : '1.5rem 0.5rem 1.5rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRight: window.innerWidth < 900 ? 'none' : '2px solid #f3e6f5',
        borderBottom: window.innerWidth < 900 ? '2px solid #f3e6f5' : 'none',
        boxSizing: 'border-box'
      }}>
        <div className="meesho-header" style={{ width: '100%', marginBottom: window.innerWidth < 900 ? '1.2rem' : '2.5rem', background: '#77107D', color: '#fff', border: '2.5px solid #f3e6f5', fontSize: window.innerWidth < 900 ? '2rem' : '2.5rem' }}>
          <span style={{ fontWeight: 900, color: '#fff' }}>Asha+</span>
        </div>
        {(() => {
          const top = featureButtonsState.filter(b => fixedTopFeatures.includes(b.key));
          const rest = featureButtonsState.filter(b => !fixedTopFeatures.includes(b.key));
          return [
            ...top,
            ...rest
          ].map((btn, idx, arr) => (
            <button
              key={btn.key}
              className="big-btn"
              style={{
                margin: '1.1rem 0',
                background: selectedFeature === btn.key ? '#FFB900' : '#f3e6f5',
                color: selectedFeature === btn.key ? '#77107D' : '#77107D',
                border: selectedFeature === btn.key ? '2.5px solid #77107D' : '2px solid #e1b6e7',
                fontWeight: 800,
                fontSize: '1.22rem',
                width: '100%',
                maxWidth: '340px',
                transition: 'all 0.18s',
                boxShadow: selectedFeature === btn.key ? '0 8px 32px 0 rgba(119,16,125,0.13)' : '0 2px 8px #77107D22',
              }}
              onClick={() => {
                setSelectedFeature(btn.key);
                if (btn.key === 'patientInfo') setPatientInfoSubFeature('entry');
                if (!fixedTopFeatures.includes(btn.key)) {
                  setFeatureButtonsState(prev => {
                    const filtered = prev.filter(b => b.key !== btn.key);
                    return [
                      ...filtered.filter(b => fixedTopFeatures.includes(b.key)),
                      btn,
                      ...filtered.filter(b => !fixedTopFeatures.includes(b.key))
                    ];
                  });
                }
                setShowReminders(false);
                setShowAddReminderModal(false);
                setShowHistory(false);
                setCallActive(false);
                setIsListening(false);
                if (btn.key === 'reminders') setRemindersSubFeature('check');
                if (btn.key === 'addReminder') setShowAddReminderModal(true);
                // Video call is now handled by floating icon, so we just stop media tracks for other features
                if (btn.key !== 'doctorSupport') {
                  stopAllMediaTracks(); // Stop camera/mic if not doctor support
                }
              }}
            >
              {btn.label}
            </button>
          ));
        })()}
      </div>
      {/* Content Area */}
      <div className="feature-content-area" style={{ flex: 1, padding: '2.5rem 2.5rem 2rem 2.5rem', borderRadius: '0 28px 28px 0', minHeight: '100vh', boxSizing: 'border-box', overflowY: 'auto', position: 'relative' }}>
        {bellButton}
        {videoCallFab}
        {aiAssistantFab}
        {/* Top bar with user info and sign out */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '2.5rem' }}>
          <span style={{ color: '#77107D', fontWeight: 700, fontSize: '1.15rem', marginRight: '1.5rem' }}>
            Welcome, {(user && (user.displayName || user.email)) || 'User'}
          </span>
          <button 
            onClick={handleSignOut}
            style={{
              background: '#FFB900',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 18px',
              cursor: 'pointer',
              fontSize: '1.08rem',
              fontWeight: 700,
              marginLeft: '1rem',
              boxShadow: '0 2px 8px rgba(119,16,125,0.10)'
            }}
          >
            Sign Out
          </button>
        </div>
        {/* 3. In the main content area, above reminders content, add: */}
        {selectedFeature === 'reminders' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <button className="big-btn" style={{ fontSize: '1.08rem', background: remindersSubFeature === 'check' ? '#FFB900' : '#f3e6f5', color: '#77107D', border: remindersSubFeature === 'check' ? '2.5px solid #77107D' : '2px solid #e1b6e7', fontWeight: 700, minWidth: '180px' }} onClick={() => setRemindersSubFeature('check')}>Check Reminders</button>
            <button className="big-btn" style={{ fontSize: '1.08rem', background: remindersSubFeature === 'view' ? '#FFB900' : '#f3e6f5', color: '#77107D', border: remindersSubFeature === 'view' ? '2.5px solid #77107D' : '2px solid #e1b6e7', fontWeight: 700, minWidth: '180px' }} onClick={() => setRemindersSubFeature('view')}>Reminder History</button>
            <button className="big-btn" style={{ fontSize: '1.08rem', background: remindersSubFeature === 'add' ? '#FFB900' : '#f3e6f5', color: '#77107D', border: remindersSubFeature === 'add' ? '2.5px solid #77107D' : '2px solid #e1b6e7', fontWeight: 700, minWidth: '180px' }} onClick={() => setRemindersSubFeature('add')}>+ Add Reminder</button>
          </div>
        )}
        {selectedFeature === 'reminders' && remindersSubFeature === 'check' && (
          // Overdue reminders content (copy your overdue reminders JSX here)
          <div className="reminder-box" style={{ background: '#F3E6F5', border: '2.5px solid #77107D', boxShadow: '0 8px 32px 0 #77107D22', maxWidth: window.innerWidth < 600 ? '100%' : '500px', width: '100%', margin: '0 auto', borderRadius: '18px', padding: window.innerWidth < 600 ? '0.7rem 0.2rem' : '2rem 2.5rem' }}>
            <h3 style={{ color: '#77107D' }}>लंबित रिमाइंडर</h3>
            {(() => {
              const now = new Date();
              const overdueReminders = reminders.filter(rem => !rem.done && rem.date && ((now - new Date(rem.date)) / (1000 * 60 * 60 * 24) >= 7));
              if (overdueReminders.length === 0) {
                return <p>कोई लंबित रिमाइंडर नहीं है।</p>;
              }
              return (
                <ul style={{ paddingLeft: 0 }}>
                  {overdueReminders
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map(rem => {
                      const isOverdue = !rem.done && rem.date && ((new Date() - new Date(rem.date)) / (1000 * 60 * 60 * 24) >= 7);
                      return (
                        <li key={rem.id} style={{
                          marginBottom: "1rem",
                          background: isOverdue ? 'var(--meesho-light)' : '#fff',
                          color: isOverdue ? '#77107D' : '#222',
                          border: '2px solid #77107D',
                          borderRadius: "18px",
                          boxShadow: "0 2px 8px #77107D22",
                          padding: window.innerWidth < 600 ? "0.8em 0.5em" : "1.2em 1.5em",
                          fontWeight: isOverdue ? 700 : 500,
                          listStyle: "none",
                          display: "block",
                          maxWidth: window.innerWidth < 600 ? '98vw' : '500px',
                          width: '100%',
                          boxSizing: 'border-box',
                          overflowX: 'auto',
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}>
                          <div><b>दिनांक:</b> {rem.date}</div>
                          <div style={{ margin: "0.2em 0 0.5em 0" }}><b>नोट:</b> {rem.text}</div>
                  <button
                    style={{
                              background: "#FFB900",
                              color: "#77107D",
                      border: "none",
                              borderRadius: "8px",
                              padding: "0.3em 1.1em",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "1em"
                    }}
                    onClick={async () => {
                              await deleteDoc(doc(db, "reminders", rem.id));
                              setReminders(reminders.filter(r => r.id !== rem.id));
                    }}
                  >
                    Delete
                  </button>
                </li>
                      );
                    })}
            </ul>
              );
            })()}
        </div>
        )}
        {selectedFeature === 'reminders' && remindersSubFeature === 'view' && (
          // All reminders content (copy your view reminders JSX here)
          <div className="reminder-box" style={{ background: '#F3E6F5', border: '2.5px solid #77107D', boxShadow: '0 8px 32px 0 #77107D22', maxWidth: window.innerWidth < 600 ? '100%' : '500px', width: '100%', margin: '0 auto', borderRadius: '18px', padding: window.innerWidth < 600 ? '0.7rem 0.2rem' : '2rem 2.5rem' }}>
            <h3 style={{ color: '#77107D' }}>View Reminders</h3>
            {reminders.length === 0 ? (
              <p>No reminders found.</p>
            ) : (
              <ul style={{ paddingLeft: 0 }}>
                {[...reminders]
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map(rem => (
                    <li key={rem.id} style={{
                      marginBottom: "1rem",
                      background: '#fff',
                      color: '#222',
                      border: '2px solid #77107D',
                      borderRadius: '18px',
                      boxShadow: '0 2px 8px #77107D22',
                      padding: window.innerWidth < 600 ? '0.8em 0.5em' : '1.2em 1.5em',
                      fontWeight: 500,
                      listStyle: 'none',
                      display: 'block',
                      maxWidth: window.innerWidth < 600 ? '98vw' : '500px',
                      width: '100%',
                      boxSizing: 'border-box',
                      overflowX: 'auto',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}>
                      <div><b>Date:</b> {rem.date}</div>
                      <div style={{ margin: "0.2em 0 0.5em 0" }}><b>Note:</b> {rem.text}</div>
                      <button
                        style={{
                          background: "#FFB900",
                          color: "#77107D",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.3em 1.1em",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "1em"
                        }}
                        onClick={async () => {
                          await deleteDoc(doc(db, "reminders", rem.id));
                          setReminders(reminders.filter(r => r.id !== rem.id));
                        }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
        {selectedFeature === 'reminders' && remindersSubFeature === 'add' && (
          // Add reminder form content (copy your add reminder JSX here)
          <div className="modal-overlay" style={{ background: 'var(--meesho-card-bg)', border: '2.5px solid #77107D', borderRadius: '18px', boxShadow: '0 8px 32px #77107D22', padding: '2.5rem 2.5rem 2rem 2.5rem', maxWidth: window.innerWidth < 600 ? '100%' : '500px', width: '100%', margin: '3rem auto', position: 'relative' }}>
            <h3>Add Reminder</h3>
            {/* Move interim transcript above input fields */}
            {reminderInterimTranscript && (
              <div style={{ 
                background: '#f3e6f5', 
                padding: '0.8rem', 
                borderRadius: '10px', 
                marginBottom: '0.8rem',
                border: '1px solid #e1b6e7',
                fontSize: '0.9rem',
                color: '#77107D'
              }}>
                <strong>सुन रहा हूं:</strong> {reminderInterimTranscript}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                className="reminder-input"
                placeholder="Reminder note"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                style={{ margin: "0.5rem 0", width: "60%" }}
                disabled={isReminderListening}
              />
              <button
                className="big-btn"
                style={{ width: 60, background: isReminderListening ? '#FFB900' : '#77107D', color: '#fff', fontSize: '1.2rem', padding: 0 }}
                type="button"
                onClick={() => {
                  if (isReminderListening) {
                    // Stop listening if already listening
                    if (reminderRecognitionRef.current) {
                      reminderRecognitionRef.current.stop();
                    }
                    return;
                  }
                  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert('Speech recognition is not supported in this browser.');
                    return;
                  }
                  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                  reminderRecognitionRef.current = new SpeechRecognition();
                  reminderRecognitionRef.current.continuous = true;
                  reminderRecognitionRef.current.interimResults = true;
                  reminderRecognitionRef.current.lang = 'hi-IN';
                  reminderRecognitionRef.current.onstart = () => {
                    console.log('Speech recognition started');
                    setIsReminderListening(true);
                    setReminderInterimTranscript("");
                  };
                  reminderRecognitionRef.current.onresult = (event) => {
                    console.log('Speech recognition result:', event);
                    let interim = "";
                    let final = "";
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                      if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                      } else {
                        interim += event.results[i][0].transcript;
                      }
                    }
                    console.log('Interim transcript:', interim);
                    console.log('Final transcript:', final);
                    setReminderInterimTranscript(interim);
                    if (final) {
                      setReminderText(prev => prev + final);
                    }
                  };
                  reminderRecognitionRef.current.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsReminderListening(false);
                  };
                  reminderRecognitionRef.current.onend = () => {
                    console.log('Speech recognition ended');
                    setIsReminderListening(false);
                  };
                  try {
                    reminderRecognitionRef.current.start();
                  } catch (error) {
                    console.error('Error starting speech recognition:', error);
                    setIsReminderListening(false);
                  }
                }}
                disabled={isReminderListening}
              >
                🎤
              </button>
              <button
                className="big-btn"
                style={{ width: 60, background: '#f06292', color: '#fff', fontSize: '1.2rem', padding: 0 }}
                type="button"
                onClick={() => {
                  setReminderText("");
                  setReminderInterimTranscript("");
                }}
                disabled={isReminderListening}
              >
                🗑️
              </button>
            </div>
            <input
              type="date"
              className="reminder-input"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              style={{ margin: "0.5rem 0", width: "35%" }}
            />
            <div style={{ marginTop: '1rem' }}>
              <button
                className="big-btn"
                style={{ width: "auto", marginRight: "1rem" }}
                onClick={async () => {
                  // Stop listening if active
                  if (isReminderListening && reminderRecognitionRef.current) {
                    reminderRecognitionRef.current.stop();
                    setIsReminderListening(false);
                  }
                  
                  if (reminderText && reminderDate) {
                    const docRef = await addDoc(collection(db, "reminders"), {
                      text: reminderText,
                      date: reminderDate,
                      timestamp: new Date(),
                      userId: user.uid
                    });
                    setReminders([...reminders, { id: docRef.id, text: reminderText, date: reminderDate }]);
                    setReminderText("");
                    setReminderDate("");
                    setReminderInterimTranscript(""); // Clear interim transcript
                    setShowAddReminderModal(false);
                  }
                }}
                disabled={!reminderText || !reminderDate}
              >
                Add
              </button>
              <button
                className="big-btn"
                style={{ width: "auto", background: "#f06292", color: "#fff" }}
                onClick={() => {
                  // Stop listening if active
                  if (isReminderListening && reminderRecognitionRef.current) {
                    reminderRecognitionRef.current.stop();
                    setIsReminderListening(false);
                  }
                  setShowAddReminderModal(false);
                  setReminderText("");
                  setReminderDate("");
                  setReminderInterimTranscript(""); // Clear interim transcript
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {renderFeatureContent()}
        
        {/* Medical Analysis Popup */}
        {showMedicalAnalysisPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '15px',
              padding: '2rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e1b6e7'
              }}>
                <h3 style={{
                  color: '#4caf50',
                  margin: 0,
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📊 पूरा मेडिकल विश्लेषण
                </h3>
                <button
                  onClick={() => setShowMedicalAnalysisPopup(false)}
                  style={{
                    background: '#f44336',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
              
              {/* Content */}
              <div style={{
                whiteSpace: 'pre-line',
                fontFamily: 'NotoSansDevanagari, Arial, sans-serif',
                lineHeight: '1.8',
                fontSize: '1rem',
                color: '#333'
              }}>
                {medicalAnalysis}
              </div>
              
              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                            <button
              onClick={() => {
                generateDietPlanFromAnalysis(medicalAnalysis);
                // Popup will be shown automatically after diet plan is generated
              }}
              disabled={isGeneratingDietPlan}
              style={{
                background: isGeneratingDietPlan ? '#ccc' : '#FF9800',
                color: '#fff',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                border: 'none',
                cursor: isGeneratingDietPlan ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem'
              }}
            >
              {isGeneratingDietPlan ? '🥗 आहार योजना बन रही है...' : '🥗 आहार योजना बनाएं'}
            </button>
                

                
                <button
                  onClick={() => setShowMedicalAnalysisPopup(false)}
                  style={{
                    background: '#607D8B',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  बंद करें
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Diet Plan Popup */}
        {showDietPlanPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '15px',
              padding: '2rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #FF9800'
              }}>
                <h3 style={{
                  color: '#FF9800',
                  margin: 0,
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🥗 आहार योजना
                </h3>
                <button
                  onClick={() => setShowDietPlanPopup(false)}
                  style={{
                    background: '#f44336',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
              
              {/* Content */}
              <div style={{
                whiteSpace: 'pre-line',
                fontFamily: 'NotoSansDevanagari, Arial, sans-serif',
                lineHeight: '1.8',
                fontSize: '1rem',
                color: '#333'
              }}>
                {dietPlanFromAnalysis}
              </div>
              
              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={async () => {
                    const jsPDF = (await import('jspdf')).default;
                    const html2canvas = (await import('html2canvas')).default;
                    
                    // Create a temporary div with the diet plan content
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = `
                      <div style="padding: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.6; white-space: pre-line;">
                        <h2 style="color: #FF9800; margin-bottom: 20px;">🥗 आहार योजना</h2>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
                          ${dietPlanFromAnalysis}
                        </div>
                        <div style="margin-top: 20px; font-size: 10px; color: #666;">
                          Generated on: ${new Date().toLocaleString()}
                        </div>
                      </div>
                    `;
                    document.body.appendChild(tempDiv);
                    
                    html2canvas(tempDiv, { 
                      scale: 2,
                      backgroundColor: '#ffffff',
                      width: 800,
                      height: tempDiv.scrollHeight
                    }).then(canvas => {
                      const imgData = canvas.toDataURL('image/png');
                      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                      const pageWidth = pdf.internal.pageSize.getWidth();
                      const pageHeight = pdf.internal.pageSize.getHeight();
                      const imgWidth = pageWidth - 40;
                      const imgHeight = (canvas.height * imgWidth) / canvas.width;
                      
                      // If content is too long, split into multiple pages
                      if (imgHeight > pageHeight - 40) {
                        const pages = Math.ceil(imgHeight / (pageHeight - 40));
                        for (let i = 0; i < pages; i++) {
                          if (i > 0) pdf.addPage();
                          const sourceY = i * (canvas.height / pages);
                          const sourceHeight = canvas.height / pages;
                          const destY = 20;
                          const destHeight = pageHeight - 40;
                          
                          pdf.addImage(
                            canvas, 'PNG', 
                            20, destY, 
                            imgWidth, destHeight,
                            undefined, 'FAST',
                            i * 90
                          );
                        }
                      } else {
                        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
                      }
                      
                      pdf.save('Diet_Plan.pdf');
                      document.body.removeChild(tempDiv);
                    }).catch(error => {
                      console.error('PDF generation error:', error);
                      alert('PDF generation failed. Please try again.');
                      document.body.removeChild(tempDiv);
                    });
                  }}
                  style={{
                    background: '#4caf50',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  📄 PDF डाउनलोड
                </button>
                
                <button
                  onClick={() => setShowDietPlanPopup(false)}
                  style={{
                    background: '#607D8B',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  बंद करें
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Ensure Patient Info is selected after login
  useEffect(() => {
    if (user) {
      setSelectedFeature('patientInfo');
      setPatientInfoSubFeature('entry');
    }
  }, [user]);

  // After useAuthState(auth) and other hooks, add an effect to check user status (auto approval enabled)
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user && user.email !== ADMIN_EMAIL) {
        const userDocSnap = await getDocs(collection(db, "users"));
        let found = false;
        let approved = false;
        userDocSnap.forEach((docu) => {
          if (docu.data().uid === user.uid) {
            found = true;
            // Auto approval: all users are automatically approved
            if (docu.data().status === "approved" || docu.data().status === "pending") {
              approved = true;
            }
          }
        });
        setIsPendingApproval(!approved);
      } else {
        setIsPendingApproval(false);
      }
    };
    checkUserStatus();
  }, [user]);

  // Add a pending approval screen
  const pendingApprovalScreen = (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'linear-gradient(135deg, #f3e6f5 0%, #ffd1e3 100%)'
    }}>
      <h2 style={{ color: '#77107D', fontWeight: 700, fontSize: '2.2rem', marginBottom: '1.5rem' }}>Registration Successful!</h2>
      <p style={{ color: '#f43397', fontSize: '1.2rem', marginBottom: '2rem', textAlign: 'center', maxWidth: 400 }}>
        {AUTO_APPROVAL_ENABLED ? 
          "Auto-approval is enabled for hackathon demonstration. Your account is automatically approved!" :
          "Your account is pending approval by the admin. Please wait for approval before you can access the dashboard."
        }
      </p>
      <button onClick={handleSignOut} style={{ background: '#FFB900', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 32px', fontWeight: 'bold', fontSize: '1.08rem', cursor: 'pointer' }}>Sign Out</button>
    </div>
  );

  // Conditional rendering
  let content;
  if (loading) content = loadingScreen;
  else if (!user) content = authScreen;
  else if (user.email === ADMIN_EMAIL) content = <AdminDashboard user={user} handleSignOut={handleSignOut} />;
  else if (isPendingApproval) content = pendingApprovalScreen;
  else content = mainAppContent;
  // Always render print font styles and printable log at the root
  return (
    <>
      <style>{printFontStyles}</style>
      {aiAudio && (
        <audio src={aiAudio} controls style={{ width: '100%', marginBottom: 16 }} />
      )}
      {printLog && (
        <div id="printable-log" className="print-only" key={printLog.id || (printLog.timestamp ? printLog.timestamp.seconds : Math.random())} style={{ background: '#F3E6F5', padding: '2rem', borderRadius: '18px', maxWidth: '600px', margin: '2rem auto', color: '#222', fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif' }}>
          <h2 style={{ color: '#77107D', marginBottom: '1.5rem' }}>Patient Form Details</h2>
          <div style={{ marginBottom: '0.7rem' }}><b>नाम:</b> {printLog.name || '—'}</div>
          <div style={{ marginBottom: '0.7rem' }}><b>आयु:</b> {printLog.age || '—'}</div>
          <div style={{ marginBottom: '0.7rem' }}><b>लिंग (पुरुष/महिला/अन्य):</b> {printLog.gender || '—'}</div>
          <div style={{ marginBottom: '0.7rem' }}><b>पता (यदि हो तो):</b> {printLog.address || '—'}</div>
          <div style={{ marginBottom: '0.7rem' }}><b>मुख्य लक्षण:</b> {printLog.symptom || '—'}</div>
          <div style={{ marginBottom: '0.7rem' }}><b>लक्षण कितने समय से हैं:</b> {printLog.duration || '—'}</div>
          <div style={{ marginBottom: '0.7rem' }}><b>कोई अतिरिक्त जानकारी (यदि हो तो):</b> {printLog.notes || '—'}</div>
          <div style={{ marginBottom: '0.7rem' }}><b>Date:</b> {printLog.timestamp ? new Date(printLog.timestamp.seconds * 1000).toLocaleString() : "Unknown"}</div>
        </div>
      )}
      {content}
      {isTranslating && (
        <div style={{ color: '#77107D', textAlign: 'center', margin: '0.5rem 0' }}>अनुवाद हो रहा है...</div>
      )}
      {aiAudio && (
        <audio ref={aiAudioRef} src={aiAudio} style={{ display: 'none' }} />
      )}
    </>
  );
}

// Utility to stop all user media tracks (camera/mic)
function stopAllMediaTracks() {
  if (window.localStream) {
    window.localStream.getTracks().forEach(track => track.stop());
    window.localStream = null;
  }
  // Optionally, stop any other media streams if you keep references elsewhere
}

export default App;