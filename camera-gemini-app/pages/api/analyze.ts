import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface ErrorResponse {
  error: string;
  details?: string;
}

interface SuccessResponse {
  result: string;
}

type ApiResponse = ErrorResponse | SuccessResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

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

    // Generate content from the image
    const prompt = "What devices do you see in this image? Please describe them all in detail.";
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