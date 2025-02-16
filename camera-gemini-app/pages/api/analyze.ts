import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    
    // Convert base64 to Uint8Array
    const imageData = new Uint8Array(Buffer.from(base64Data, 'base64'));

    // Initialize the Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    // Create image part from binary data
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageData).toString('base64'),
        mimeType: 'image/jpeg'
      },
    };

    // Generate content from the image
    const result = await model.generateContent([
      "What devices do you see in this image? Please describe them all in detail.",
      imagePart
    ]);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({ error: 'Error processing image' });
  }
}