import type { NextApiRequest, NextApiResponse } from 'next';
import { wrap, configure } from 'agentql';
import { chromium } from 'playwright';

type AgentSearchResponse = {
  result?: string[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentSearchResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser;
  try {
    const { query } = req.body;
    const apiKey = "oajLTznvPijR-e1xRKTGq8HHNRUoqBmY6RnLawS9-GS88c7i6hyW6Q";

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Configure the SDK with the API key
    configure({ apiKey });

    // Launch a browser instance
    browser = await chromium.launch({ headless: false }); // Set to false to see what's happening
    const page = await wrap(await browser.newPage());

    // Navigate to Google
    await page.goto('https://www.google.com');

    // Use AgentQL query to find and interact with the search box
    const SEARCH_BOX_QUERY = `{
      search_box(placeholder: "Search")
    }`;

    const searchBoxResponse = await page.queryElements(SEARCH_BOX_QUERY);
    await searchBoxResponse.search_box.fill(`${query} aliexpress`);
    await page.keyboard.press('Enter');

    // Return success without closing the browser
    return res.status(200).json({ result: ['Search completed'] });
  } catch (error) {
    console.error('Error in agent search:', error);
    if (browser) {
      await browser.close();
    }
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
