import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Clean up the text - remove any markdown or special formatting
    const cleanText = text
      .replace(/```[^`]*```/g, '') // Remove code blocks
      .replace(/\[|\]/g, '')       // Remove square brackets
      .replace(/\n+/g, ' ')        // Replace multiple newlines with space
      .trim();                     // Remove extra whitespace

    // Limit text length to prevent API errors
    const truncatedText = cleanText.slice(0, 4096);

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: truncatedText,
      speed: 1.0,
      response_format: "mp3"
    });

    // Get the audio data as an ArrayBuffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    // Set the appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  } catch (error) {
    console.error('Error generating speech:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Error generating speech',
      details: errorMessage
    });
  }
} 