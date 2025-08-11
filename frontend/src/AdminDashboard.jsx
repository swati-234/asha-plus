import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const ADMIN_EMAIL = 'admin@yourdomain.com'; // Change as needed

export default function AdminDashboard({ user }) {
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
    <div className="app-container" style={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(120deg, #f43397 0%, #ffb6d5 60%, #fff0f6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{ width: '100%', background: 'linear-gradient(135deg, #77107D 0%, #f3e6f5 100%)', color: '#fff', borderBottom: '5px solid #f3e6f5', borderRadius: '0 0 36px 36px', boxShadow: '0 8px 32px rgba(119,16,125,0.13)', padding: '2rem 2.5rem 1.2rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Poppins, Segoe UI, Roboto, Arial, sans-serif', fontWeight: 900, fontSize: '2.2rem', letterSpacing: '0.01em' }}>
        <span style={{ color: '#fff', fontWeight: 900 }}>Asha+ Admin Dashboard</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 500, color: '#fff' }}>Welcome {user.email}</span>
          <button onClick={() => window.location.reload()} style={{ background: '#FFB900', color: '#fff', border: 'none', borderRadius: '999px', padding: '10px 28px', fontWeight: 800, fontSize: '1.08rem', cursor: 'pointer', marginLeft: '1rem', boxShadow: '0 2px 8px rgba(119,16,125,0.10)' }}>Sign Out</button>
        </div>
      </div>
      {/* Card Container */}
      <div className="glass-card" style={{ background: 'var(--meesho-card-bg)', border: 'var(--meesho-card-border)', borderRadius: '28px', boxShadow: 'var(--meesho-card-shadow)', margin: '3rem auto 0 auto', maxWidth: 700, width: '95vw', padding: '2.5rem 2.5rem 2rem 2.5rem', fontFamily: 'var(--meesho-font)', color: 'var(--meesho-text-main)' }}>
        <h2 style={{ color: 'var(--meesho-primary)', fontWeight: 800, fontSize: '2rem', marginBottom: '2rem', letterSpacing: '0.01em', textAlign: 'center' }}>Pending User Approvals</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #f43397', background: '#fff', borderRadius: '18px', boxShadow: '0 2px 8px #77107D22' }}>
            <thead>
              <tr style={{ background: 'var(--meesho-light)' }}>
                <th style={{ border: '1px solid #e1b6e7', padding: '14px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--meesho-primary)', background: 'var(--meesho-light)' }}>User mail</th>
                <th style={{ border: '1px solid #e1b6e7', padding: '14px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--meesho-primary)', background: 'var(--meesho-light)' }}>Approve / Reject</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: 32, border: '1px solid #e1b6e7', color: '#77107D' }}>Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: 32, border: '1px solid #e1b6e7', color: 'red' }}>{error}</td></tr>
              ) : pendingUsers.length === 0 ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: 32, border: '1px solid #e1b6e7', color: '#77107D' }}>No pending users</td></tr>
              ) : (
                pendingUsers.map(u => (
                  <tr key={u.id} style={{ background: '#fff' }}>
                    <td style={{ border: '1px solid #e1b6e7', padding: '16px 8px', fontSize: '1rem', color: 'var(--meesho-text-main)' }}>{u.email}</td>
                    <td style={{ border: '1px solid #e1b6e7', padding: '16px 8px' }}>
                      <button onClick={() => handleApprove(u.id)} style={{ background: '#43a047', color: 'white', border: 'none', borderRadius: '999px', padding: '7px 22px', marginRight: 12, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px #43a04722' }}>Approve</button>
                      <button onClick={() => handleReject(u.id)} style={{ background: '#e53935', color: 'white', border: 'none', borderRadius: '999px', padding: '7px 22px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px #e5393522' }}>Reject</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 