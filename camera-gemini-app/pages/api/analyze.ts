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
}

interface AnalysisRequest {
  image: string;
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
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
    const { image, objective, currentItems, pdfDocuments } = req.body as AnalysisRequest;

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

    // Create a more detailed prompt that includes the user's objective and current items
    const prompt = `
Given the following information:

User's Objective: ${objective}
Current Items Available: ${currentItems}
Reference Documents: ${pdfDocuments.join(', ')}

1. First, analyze the image and identify all electronic components and devices present.
2. Compare the identified items with the user's current inventory.
3. Based on the user's objective and the available datasheets, create a detailed plan that:
   - Lists any missing components needed
   - Provides step-by-step instructions to achieve the objective
   - References specific pages or sections from the available datasheets
   - Includes any safety considerations or warnings

Please format the response as a JSON object with the following structure:
{
  "identifiedComponents": [{"brand": "...", "model": "...", "description": "..."}],
  "missingComponents": ["..."],
  "stepByStep": ["..."],
  "references": ["..."],
  "safetyNotes": ["..."]
}`;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          imagePart
        ]
      }]
    });

    const response = await result.response;
    const text = response.text();

    /// Given the PDF, the user's desired end state, and what the user has in front of the camera, generate a plan for the user to achieve the desired end state.
    

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error('Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Error processing image',
      details: errorMessage
    });
  }
}