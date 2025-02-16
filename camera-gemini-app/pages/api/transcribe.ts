import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    const { audio } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
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
    console.error('Error transcribing audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Error transcribing audio',
      details: errorMessage
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