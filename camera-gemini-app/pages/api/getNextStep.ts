import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface NextStepRequest {
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
  image?: string;
  detectedItems?: string[];
}

async function searchPdfsForItems(pdfPaths: string[], items: string[]) {
  try {
    const searchResponse = await fetch('/api/searchPdfs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfPaths,
        searchTerms: items,
      }),
    });

    if (!searchResponse.ok) {
      throw new Error('Failed to search PDFs');
    }

    const searchResults = await searchResponse.json();
    return searchResults.relevantText || '';
  } catch (error) {
    console.error('Error searching PDFs:', error);
    return '';
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { objective, currentItems, pdfDocuments, image, detectedItems } = req.body as NextStepRequest;

    if (!objective) {
      return res.status(400).json({ error: 'Objective is required' });
    }

    // Search PDFs for relevant content based on detected items
    let pdfContent = '';
    if (detectedItems && detectedItems.length > 0 && pdfDocuments.length > 0) {
      pdfContent = await searchPdfsForItems(pdfDocuments, detectedItems);
    }

    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create a detailed prompt for the next step
    const prompt = `
<think>
Context:
- Objective: ${objective}
- Available Items: ${currentItems}
- Documentation: ${pdfDocuments.join(', ')}
${pdfContent ? `\nRelevant Documentation Content:\n${pdfContent}` : ''}

Guidelines:
1. identify objects in image
2. Check documentation
3. answer user questions
4. provide instruction for how to proceed

</think>
Answer the user's question. Do not instruct the user to look shit up. Answer the question.
<think>
Remember:
- Be brief and clear
- Maximum 3 sentences total
</think>`;

    let result;
    if (image) {
      // Remove the data URL prefix to get just the base64 data
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      
      // Create the image part
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };

      // Generate content with both text and image
      result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            imagePart
          ]
        }]
      });
    } else {
      // Generate content with just text
      result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      });
    }

    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error('Error getting next step:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Error generating next step',
      details: errorMessage
    });
  }
} 