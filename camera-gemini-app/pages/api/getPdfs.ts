import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface ErrorResponse {
  error: string;
  details?: string;
}

interface SuccessResponse {
  result: string;
}

type ApiResponse = ErrorResponse | SuccessResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let scriptPath = '';
  let outputPath = '';

  try {
    const { modelName } = req.body;

    if (!modelName) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Create paths with unique timestamps to avoid conflicts
    const timestamp = Date.now();
    scriptPath = path.join(process.cwd(), `temp_script_${timestamp}.py`);
    outputPath = path.join(process.cwd(), `search_results_${timestamp}.txt`);
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    const normalizedOutputPath = outputPath.replace(/\\/g, '/');

    // Ensure PDF directory exists
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pythonScript = `
import requests
from bs4 import BeautifulSoup
from googlesearch import search
import time
import os

def get_search_results(query, num_results=3):
    urls = []
    try:
        for url in search(query, num=num_results, stop=num_results):
            urls.append(url)
            time.sleep(2)
    except Exception as e:
        print(f"Error during search: {e}")
    return urls

def get_page_content(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', '').lower()
        if 'application/pdf' in content_type or url.lower().endswith('.pdf'):
            pdf_basename = url.split('/')[-1] or f"downloaded_doc_{int(time.time())}_{get_page_content.counter}.pdf"
            pdf_filename = pdf_basename.replace(' ', '_')
            
            # Store PDFs in the public/pdfs directory
            pdf_path = os.path.join("${pdfDir.replace(/\\/g, '/')}", pdf_filename)
            
            base, ext = os.path.splitext(pdf_filename)
            counter = 1
            while os.path.exists(pdf_path):
                pdf_path = os.path.join("${pdfDir.replace(/\\/g, '/')}", f"{base}_{counter}{ext}")
                counter += 1
            
            get_page_content.counter += 1
            
            with open(pdf_path, 'wb') as pdf_file:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        pdf_file.write(chunk)
            return f"[PDF file downloaded and saved as: pdfs/{os.path.basename(pdf_path)}]"
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for script in soup(["script", "style"]):
            script.decompose()
            
        text = soup.get_text()
        
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        print(f"Error processing {url}: {e}")
        return ""

get_page_content.counter = 1

def main():
    query = "${modelName} datasheet"
    output_file = r"${normalizedOutputPath}"  # Use raw string for Windows path
    
    print("Searching for URLs...")
    urls = get_search_results(query)
    
    print("Processing URLs and saving content...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"Search Results for: {query}\\n")
        f.write("=" * 50 + "\\n\\n")
        
        for i, url in enumerate(urls, 1):
            f.write(f"Article {i}:\\n")
            f.write(f"URL: {url}\\n")
            f.write("-" * 50 + "\\n")
            
            content = get_page_content(url)
            f.write(content + "\\n\\n")
            f.write("=" * 50 + "\\n\\n")
    
    print(f"Results have been saved to {output_file}")

if __name__ == "__main__":
    main()
`;

    // Create the directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the Python script to a temporary file
    fs.writeFileSync(scriptPath, pythonScript);

    // Execute the Python script
    const pythonProcess = spawn('python', [scriptPath]);

    let result = '';
    
    await new Promise((resolve, reject) => {
      pythonProcess.stdout.on('data', (data) => {
        console.log(`Python stdout: ${data}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data}`);
      });

      pythonProcess.on('close', async (code) => {
        try {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}`));
            return;
          }

          // Read the results file
          if (fs.existsSync(outputPath)) {
            result = fs.readFileSync(outputPath, 'utf-8');
            resolve(null);
          } else {
            reject(new Error('Output file not found'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    // Send the response before cleanup
    res.status(200).json({ result });

    // Cleanup files after a short delay
    setTimeout(() => {
      try {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (error) {
        console.error('Error cleaning up files:', error);
      }
    }, 1000);

  } catch (error) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Attempt cleanup in case of error
    try {
      if (scriptPath && fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
      if (outputPath && fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    return res.status(500).json({ 
      error: 'Error processing request',
      details: errorMessage
    });
  }
} 