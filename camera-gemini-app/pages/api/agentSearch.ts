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
    const apiKey = "JiuIzHEeYpaIufIdiHXbGlBsZeoNOlPA1WGknFNuD-Zz1tl5BW3j1Q";

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'API key is not configured' });
    }

    // Configure the SDK with the API key
    configure({ apiKey });

    // Launch a browser instance with more debugging options
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: 100 // Increased slow down to ensure stability
    });
    
    const context = await browser.newContext();
    const page = await wrap(await context.newPage());

    console.log('Navigating to Google...');
    await page.goto('https://www.google.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 // Increased timeout
    });

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Additional wait to ensure everything is loaded

    console.log('Looking for search box...');
    // Try multiple selectors to find the search box
    const SEARCH_BOX_QUERIES = [
      `{
        input(name: "q")
      }`,
      `{
        input(type: "text", aria-label: "Search")
      }`,
      `{
        input(type: "text", title: "Search")
      }`
    ];

    let searchInput = null;
    for (const query of SEARCH_BOX_QUERIES) {
      try {
        const response = await page.queryElements(query);
        if (response.input) {
          searchInput = response.input;
          break;
        }
      } catch (e) {
        console.log('Trying next selector...');
        continue;
      }
    }

    if (!searchInput) {
      throw new Error('Search box not found after multiple attempts');
    }

    console.log('Filling search box...');
    await searchInput.fill(`${query} aliexpress`);
    await page.waitForTimeout(500); // Wait a bit before pressing Enter
    await page.keyboard.press('Enter');

    // Wait longer for results
    console.log('Waiting for results...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Extract some search results
    const searchResults = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="aliexpress.com"]'));
      return links.slice(0, 3).map(link => ({
        text: link.textContent?.trim() || '',
        url: link.getAttribute('href') || ''
      }));
    });

    // Keep the browser open briefly to see results
    await page.waitForTimeout(2000);

    // Close the browser
    await browser.close();

    return res.status(200).json({ 
      result: searchResults.length > 0 
        ? searchResults.map(r => `${r.text}: ${r.url}`)
        : ['Search completed, but no AliExpress results found'] 
    });

  } catch (error) {
    console.error('Error in agent search:', error);
    if (browser) {
      await browser.close();
    }
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 