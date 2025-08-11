const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const textToSpeech = require('@google-cloud/text-to-speech');
const path = require('path');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

let ttsClient;
if (process.env.FUNCTIONS_EMULATOR) {
  // Local emulator: use keyFilename
  const keyPath = path.join(__dirname, 'ai-health-assistant-7b5af-21dc9acf65a2.json');
  ttsClient = new textToSpeech.TextToSpeechClient({ keyFilename: keyPath });
} else {
  // On Firebase: use default credentials
  ttsClient = new textToSpeech.TextToSpeechClient();
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your_gemini_api_key_here';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

exports.aiAssistantV2 = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      console.log('=== AI ASSISTANT FUNCTION CALLED ===');
      console.log('Request method:', req.method);
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Raw request body type:', typeof req.body);
      
      // Ensure body is parsed as JSON
      if (typeof req.body === 'string') {
        try {
          req.body = JSON.parse(req.body);
          console.log('Successfully parsed string body as JSON');
        } catch (parseError) {
          console.error('Failed to parse request body as JSON:', parseError);
          return res.status(400).json({ error: 'Invalid JSON in request body' });
        }
      }
      
      const { message, type, image, documentType, userId, question } = req.body;
      
      // Use message or question field (for backward compatibility)
      const actualMessage = message || question;
      
      // Simple health check
      if (req.method === 'GET') {
        return res.json({ status: 'Function is working', timestamp: new Date().toISOString() });
      }
      
      console.log('Received request body:', {
        hasMessage: !!message,
        hasQuestion: !!question,
        actualMessageLength: actualMessage ? actualMessage.length : 0,
        type: type,
        hasImage: !!image,
        imageLength: image ? image.length : 0,
        documentType: documentType,
        userId: userId
      });
      
      console.log('Full request body keys:', Object.keys(req.body));
      console.log('Request body type:', typeof req.body);
      console.log('Message field type:', typeof message);
      console.log('Question field type:', typeof question);
      console.log('Actual message value (first 100 chars):', actualMessage ? actualMessage.substring(0, 100) : 'null');
      console.log('Request body raw:', JSON.stringify(req.body, null, 2));
      
      if (!actualMessage) {
        console.log('DEBUG: No message found in request');
        console.log('Available fields:', Object.keys(req.body));
        console.log('Message field:', message);
        console.log('Question field:', question);
        return res.status(400).json({ error: 'No message provided' });
      }

      // Handle different types of requests
      if (type === 'medical_document_analysis') {
        // Medical document analysis with image
        if (!image) {
          return res.status(400).json({ error: 'No image provided for medical document analysis' });
        }

        console.log('Received medical document analysis request');
        console.log('Image size:', image.length);
        console.log('Document type:', documentType);

        // Check image size (Gemini has a 4MB limit for images)
        if (image.length > 4 * 1024 * 1024) {
          return res.status(400).json({ 
            error: 'Image too large. Please use an image smaller than 4MB.' 
          });
        }

        // Create prompt for medical document analysis
        let analysisPrompt = actualMessage; // Use the detailed prompt sent from frontend
        
        // Add image to the request
        const geminiRequest = {
          contents: [{
            parts: [
              { text: analysisPrompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image
                }
              }
            ]
          }]
        };

        console.log('Sending medical document analysis request to Gemini');
        
        try {
          const geminiResponse = await axios.post(GEMINI_API_URL, geminiRequest);
          
          let analysisResult = '';
          if (
            geminiResponse.data &&
            geminiResponse.data.candidates &&
            geminiResponse.data.candidates[0] &&
            geminiResponse.data.candidates[0].content &&
            geminiResponse.data.candidates[0].content.parts &&
            geminiResponse.data.candidates[0].content.parts[0] &&
            geminiResponse.data.candidates[0].content.parts[0].text
          ) {
            analysisResult = geminiResponse.data.candidates[0].content.parts[0].text;
          }

          if (!analysisResult) {
            return res.status(500).json({ error: 'Gemini API did not return a valid analysis.' });
          }

          // Save to Firestore if userId is provided
          if (userId) {
            try {
              await admin.firestore().collection('medicalAnalyses').add({
                userId: userId,
                documentType: documentType,
                analysis: analysisResult,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                imageUrl: image.substring(0, 100) + '...' // Store truncated version
              });
            } catch (firestoreError) {
              console.error('Error saving to Firestore:', firestoreError);
              // Continue even if Firestore save fails
            }
          }

          return res.json({
            response: analysisResult
          });
        } catch (geminiError) {
          console.error('Error calling Gemini API:', geminiError);
          return res.status(500).json({ 
            error: 'Failed to analyze medical document', 
            details: geminiError.message 
          });
        }
      }

      // Government scheme suggestion handler
      if (type === 'govt_scheme_suggestion') {
        try {
          const geminiResponse = await axios.post(
            GEMINI_API_URL,
            {
              contents: [{ parts: [{ text: actualMessage }] }]
            }
          );
          let answer = '';
          if (
            geminiResponse.data &&
            geminiResponse.data.candidates &&
            geminiResponse.data.candidates[0] &&
            geminiResponse.data.candidates[0].content &&
            geminiResponse.data.candidates[0].content.parts &&
            geminiResponse.data.candidates[0].content.parts[0] &&
            geminiResponse.data.candidates[0].content.parts[0].text
          ) {
            answer = geminiResponse.data.candidates[0].content.parts[0].text;
          }
          if (!answer) {
            return res.status(500).json({ error: 'Gemini API did not return a valid answer.' });
          }
          return res.json({ answer });
        } catch (error) {
          console.error('Error in govt_scheme_suggestion:', error);
          return res.status(500).json({ error: error.message || 'Internal server error' });
        }
      }

      // Form auto-fill handler
      if (type === 'form_auto_fill') {
        try {
          const geminiResponse = await axios.post(
            GEMINI_API_URL,
            {
              contents: [{ parts: [{ text: actualMessage }] }]
            }
          );
          let answer = '';
          if (
            geminiResponse.data &&
            geminiResponse.data.candidates &&
            geminiResponse.data.candidates[0] &&
            geminiResponse.data.candidates[0].content &&
            geminiResponse.data.candidates[0].content.parts &&
            geminiResponse.data.candidates[0].content.parts[0] &&
            geminiResponse.data.candidates[0].content.parts[0].text
          ) {
            answer = geminiResponse.data.candidates[0].content.parts[0].text;
          }
          if (!answer) {
            return res.status(500).json({ error: 'Gemini API did not return a valid answer.' });
          }
          return res.json({ answer });
        } catch (error) {
          console.error('Error in form_auto_fill:', error);
          return res.status(500).json({ error: error.message || 'Internal server error' });
        }
      }

      // Check if this is a patient entry request
      const isPatientEntryRequest = actualMessage.includes('Extract patient information');
      
      let geminiPrompt;
      if (isPatientEntryRequest) {
        // For patient entry, ask for JSON format with very specific instructions
        const patientText = actualMessage.replace('Extract patient information from this Hindi text and return ONLY a valid JSON object with these exact keys: name, age, gender, address, symptom, duration, notes. If any field is not mentioned, use null for that field. Do not include any other text, only the JSON object. Text: ', '');
        geminiPrompt = `Extract patient information from this Hindi text and return ONLY a valid JSON object. The JSON must have exactly these keys: name, age, gender, address, symptom, duration, notes. If any field is not mentioned in the text, use null for that field. Do not include any explanations, comments, markdown formatting, or additional text - only the raw JSON object. Here is the text: ${patientText}`;
      } else {
        // For regular health questions, provide Hindi health advice
        geminiPrompt = `उत्तर हिंदी में स्वास्थ्य सलाह के रूप में दें: ${actualMessage}`;
      }

      // 1. Get answer from Gemini API
      const geminiResponse = await axios.post(
        GEMINI_API_URL,
        {
          contents: [{ parts: [{ text: geminiPrompt }] }]
        }
      );
      console.log('Gemini API response:', geminiResponse.data);

      // Try to extract the answer safely
      let answer = '';
      if (
        geminiResponse.data &&
        geminiResponse.data.candidates &&
        geminiResponse.data.candidates[0] &&
        geminiResponse.data.candidates[0].content &&
        geminiResponse.data.candidates[0].content.parts &&
        geminiResponse.data.candidates[0].content.parts[0] &&
        geminiResponse.data.candidates[0].content.parts[0].text
      ) {
        answer = geminiResponse.data.candidates[0].content.parts[0].text;
      }
      console.log('Extracted answer:', answer);

      if (!answer) {
        return res.status(500).json({ error: 'Gemini API did not return a valid answer.' });
      }

      // For patient entry requests, return the JSON directly without TTS
      if (isPatientEntryRequest) {
        return res.json({
          answer: answer,
          audioContent: null
        });
      }

      // For regular health questions, continue with TTS processing
      // Clean answer for both TTS and frontend (remove markdown, bullets, colons, extra spaces)
      let cleanedAnswer = answer
        .replace(/[*_~`#>\\\-]/g, '') // Remove markdown
        .replace(/[:•]/g, '') // Remove colons and bullet points
        .replace(/\n+/g, ' ') // Replace newlines with space
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();

      if (!cleanedAnswer) {
        cleanedAnswer = 'उत्तर उपलब्ध नहीं है कृपया फिर से प्रयास करें';
      }

      // Truncate cleanedAnswer to 5000 bytes (TTS API limit)
      const maxTTSLength = 5000;
      let ttsInput = cleanedAnswer;
      if (Buffer.byteLength(ttsInput, 'utf8') > maxTTSLength) {
        let truncated = '';
        let bytes = 0;
        for (const char of ttsInput) {
          const charBytes = Buffer.byteLength(char, 'utf8');
          if (bytes + charBytes > maxTTSLength) break;
          truncated += char;
          bytes += charBytes;
        }
        ttsInput = truncated + ' (उत्तर लंबा था, इसलिए छोटा किया गया है।)';
      }
      console.log('TTS input (full answer, cleaned):', ttsInput);

      let ttsResponse;
      try {
        [ttsResponse] = await ttsClient.synthesizeSpeech({
          input: { text: ttsInput },
          voice: { languageCode: 'hi-IN', ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3' },
        });
        console.log('TTS response received:', !!ttsResponse, ttsResponse ? Object.keys(ttsResponse) : null);
      } catch (ttsError) {
        console.error('Error during TTS call:', ttsError);
        return res.status(500).json({ error: 'Text-to-Speech failed', details: ttsError.message });
      }

      // 3. Return cleaned answer and audio (as base64 string)
      const audioBase64 = ttsResponse.audioContent instanceof Buffer
        ? ttsResponse.audioContent.toString('base64')
        : ttsResponse.audioContent;
      res.json({
        answer: cleanedAnswer, // cleaned for frontend too
        audioContent: audioBase64, // always base64 string
      });
    } catch (error) {
      console.error('Error in aiAssistant:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });
});
