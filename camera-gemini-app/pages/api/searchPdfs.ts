import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface SearchRequest {
  pdfPaths: string[];
  searchTerms: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfPaths, searchTerms } = req.body as SearchRequest;

    if (!pdfPaths || !searchTerms || pdfPaths.length === 0 || searchTerms.length === 0) {
      return res.status(400).json({ error: 'PDF paths and search terms are required' });
    }

    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Read PDF contents
    let allPdfContents = '';
    for (const pdfPath of pdfPaths) {
      try {
        const fullPath = path.join(process.cwd(), pdfPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          allPdfContents += `\n--- From ${path.basename(pdfPath)} ---\n${content}`;
        }
      } catch (error) {
        console.error(`Error reading PDF ${pdfPath}:`, error);
      }
    }

    if (!allPdfContents) {
      return res.status(404).json({ error: 'No PDF content found' });
    }

    // Create a prompt to search for relevant content
    const searchPrompt = `
Search through the following documentation for information relevant to these items: ${searchTerms.join(', ')}

Documentation content:
${allPdfContents}

Extract and summarize ONLY the most relevant sections that specifically mention or relate to the listed items.
Format the response as clear, concise bullet points.
Include page numbers or section references where available.
Limit the response to the 3 most relevant pieces of information.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: searchPrompt }] }]
    });

    const response = await result.response;
    const relevantText = response.text();

    return res.status(200).json({ relevantText });
  } catch (error) {
    console.error('Error searching PDFs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Error searching PDFs',
      details: errorMessage
    });
  }
} 