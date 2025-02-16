import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: pdfPath } = req.query;

  if (!pdfPath || typeof pdfPath !== 'string') {
    return res.status(400).json({ error: 'PDF path is required' });
  }

  try {
    // Ensure the path is relative to the project root
    const filePath = path.join(process.cwd(), pdfPath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('PDF file not found:', filePath);
      return res.status(404).json({ error: 'PDF file not found' });
    }

    // Log the file path and size for debugging
    const stats = fs.statSync(filePath);
    console.log('Serving PDF:', {
      path: filePath,
      size: stats.size,
      exists: fs.existsSync(filePath)
    });

    const fileData = fs.readFileSync(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${path.basename(pdfPath)}`);
    res.send(fileData);
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ 
      error: 'Error serving PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 