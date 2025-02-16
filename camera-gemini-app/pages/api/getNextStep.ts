import { NextApiRequest, NextApiResponse } from 'next';
import Together from 'together-ai';

const together = new Together(process.env.TOGETHER_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { objective, currentItems, pdfDocuments } = req.body;

    const prompt = `
Given the following project information:

Objective: ${objective}
Available Items: ${currentItems}
Documentation: ${pdfDocuments.join(', ')}

Please provide the next specific, actionable step to help achieve this objective. 
Consider safety precautions and reference relevant documentation when applicable.
Keep the response concise and focused on the immediate next action.`;

    const response = await together.chat.completions.create({
      messages: [{ "role": "user", "content": prompt }],
      model: "deepseek-ai/DeepSeek-R1",
    });

    return res.status(200).json({ 
      result: response.choices?.[0]?.message?.content || 'No response generated' 
    });
  } catch (error) {
    console.error('Error getting next step:', error);
    return res.status(500).json({ 
      error: 'Failed to generate next step',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 