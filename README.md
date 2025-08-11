# Asha+ Frontend

A React-based healthcare application with AI-powered features for patient management and medical assistance.

## 🌐 Live Demo

**Visit the deployed application:** [https://ai-health-assistant-7b5af.web.app/](https://ai-health-assistant-7b5af.web.app/)

## 🔒 Security Setup (IMPORTANT!)

**⚠️ CRITICAL:** Never commit API keys or sensitive credentials to version control!

### Environment Variables Setup

1. **Copy the example environment file:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` with your actual values:**
   ```bash
   VITE_FIREBASE_API_KEY=your_actual_firebase_api_key_here
   ```

3. **For Firebase Functions, also set up:**
   ```bash
   cd functions
   cp env.example .env
   # Edit .env with your Gemini API key
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

### Why This Matters
- **Exposed API keys** can lead to unauthorized usage and billing charges
- **Security vulnerabilities** can compromise your application
- **GitHub automatically scans** for exposed secrets and will alert you

## Features

- **Patient Information Management**: Voice-based patient data entry with Hindi support
- **AI Health Assistant**: Conversational AI for health-related queries
- **Image OCR**: Extract and analyze text from medical documents and images
- **Reminders**: Manage patient follow-ups and medical reminders
- **Video Consultations**: Secure video calling for telemedicine
- **Patient History**: View and manage patient records

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

Create a `firebase.js` file in the `src` directory with your Firebase configuration:

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### 3. Configure Hugging Face API for OCR

To use the Image OCR feature, you need to:

1. **Get a Hugging Face API Token**:
   - Go to [Hugging Face](https://huggingface.co/)
   - Create an account or sign in
   - Go to Settings → Access Tokens
   - Create a new token with read permissions

2. **Update the API Token**:
   - Open `src/App.jsx`
   - Find the line: `"Authorization": "Bearer hf_xxx"`
   - Replace `hf_xxx` with your actual Hugging Face API token

### 4. Run the Application

```bash
npm run dev
```

## OCR Feature Details

The Image OCR feature uses Hugging Face's free tier API with the following models:

- **Primary Model**: `microsoft/trocr-base-handwritten` - Good for handwritten and printed text
- **Fallback Model**: `facebook/tr-ocr` - Alternative OCR model

### OCR Capabilities

- **Text Extraction**: Extract text from images containing medical documents, prescriptions, forms, etc.
- **Language Detection**: Automatically detects Hindi and English text
- **Content Analysis**: Identifies medical documents, prescriptions, and forms
- **Confidence Scoring**: Provides confidence levels for extracted text
- **Detailed Explanations**: Offers comprehensive analysis of extracted content

### Usage Tips

1. **Image Quality**: Ensure good lighting and clear text for better results
2. **File Size**: Images should be under 10MB
3. **Supported Formats**: JPG, PNG, GIF, BMP
4. **Privacy**: Medical documents are processed securely but verify extracted text for accuracy

## API Rate Limits

Hugging Face's free tier has rate limits:
- 30,000 requests per month
- 1 request per second

For production use, consider upgrading to a paid plan.

## Security Notes

- API tokens should be stored securely in environment variables
- Medical data should be handled according to local privacy regulations
- Always verify OCR results for medical documents before clinical use

## Troubleshooting

### OCR Not Working
1. Check your Hugging Face API token is correct
2. Ensure the image contains clear, readable text
3. Try with a different image if the first one fails
4. Check browser console for error messages

### Firebase Issues
1. Verify your Firebase configuration
2. Check Firebase console for authentication rules
3. Ensure Firestore is enabled in your Firebase project

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
