
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
            pdf_path = os.path.join("C:/Users/aaliy/Documents/wandb-hackathon-feb25/camera-gemini-app/public/pdfs", pdf_filename)
            
            base, ext = os.path.splitext(pdf_filename)
            counter = 1
            while os.path.exists(pdf_path):
                pdf_path = os.path.join("C:/Users/aaliy/Documents/wandb-hackathon-feb25/camera-gemini-app/public/pdfs", f"{base}_{counter}{ext}")
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
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        print(f"Error processing {url}: {e}")
        return ""

get_page_content.counter = 1

def main():
    query = "Raspberry Pi 4 Model B datasheet filetype:pdf"
    output_file = r"C:/Users/aaliy/Documents/wandb-hackathon-feb25/camera-gemini-app/search_results_1739752477660.txt"  # Use raw string for Windows path
    
    print("Searching for URLs...")
    urls = get_search_results(query)
    
    print("Processing URLs and saving content...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"Search Results for: {query}\n")
        f.write("=" * 50 + "\n\n")
        
        for i, url in enumerate(urls, 1):
            f.write(f"Article {i}:\n")
            f.write(f"URL: {url}\n")
            f.write("-" * 50 + "\n")
            
            content = get_page_content(url)
            f.write(content + "\n\n")
            f.write("=" * 50 + "\n\n")
    
    print(f"Results have been saved to {output_file}")

if __name__ == "__main__":
    main()
