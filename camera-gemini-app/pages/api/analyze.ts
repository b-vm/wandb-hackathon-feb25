import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyDmh2Q8VD9IkngLBncorsqJiniECE_R2z8');

interface ErrorResponse {
  error: string;
  details?: string;
}

interface SuccessResponse {
  result: string;
  detections: any[];
}

interface AnalysisRequest {
  image: string;
  prompt: string;
  objective?: string;
  currentItems?: string;
  pdfDocuments?: string[];
}

type ApiResponse = ErrorResponse | SuccessResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, prompt, objective, currentItems, pdfDocuments } = req.body as AnalysisRequest;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Remove the data URL prefix to get just the base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Initialize the Gemini 1.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare the image part for Gemini
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      },
    };

    // Use the provided prompt for object detection
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          imagePart
        ]
      }]
    });

    const response = result.response;
    const text = response.text();

    console.log('Gemini raw response:', text);
    
    // Parse the JSON from the response
    const jsonMatch = text.match(/```json\n?(.*?)\n?```/s);
    if (jsonMatch) {
      const jsonString = jsonMatch[1].trim();
      const detections = JSON.parse(jsonString);
      
      // Send back both the raw text and parsed detections
      res.status(200).json({
        result: text,
        detections: detections
      });
    } else {
      res.status(200).json({
        result: text,
        detections: []
      });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Error processing image',
      details: errorMessage
    });
  }
}