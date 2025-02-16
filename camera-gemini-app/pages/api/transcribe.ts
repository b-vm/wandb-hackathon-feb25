import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Check if API key exists
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY.trim(), // Trim to remove any whitespace
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath: string | null = null;

  try {
    if (!openai) {
      throw new Error('OpenAI client not properly initialized');
    }

    const { audio } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(audio.split(',')[1], 'base64');

    // Create a temporary file
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `audio-${Date.now()}.webm`);
    
    // Write the buffer to the temporary file
    fs.writeFileSync(tempFilePath, buffer);

    // Create a readable stream from the file
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'en',
    });

    return res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error('Error in transcribe API route:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Clean up: delete the temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (error) {
        console.error('Error deleting temporary file:', error);
      }
    }
  }
} 