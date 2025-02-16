import { useState } from 'react';
import CameraComponent from '../components/CameraComponent';
import ResultComponent from '../components/ResultComponent';
import styles from '../styles/Home.module.css';
import PDFButton from '../components/PDFButton';
import PDFViewer from '../components/PDFViewer';
import ProjectStatus from '../components/ProjectStatus';
import ProjectDetails from '../components/ProjectDetails';
import Head from 'next/head';
import NextStepButton from '../components/NextStepButton';

interface ApiErrorResponse {
  error: string;
  details?: string;
}

interface ApiSuccessResponse {
  result: string;
}

type ApiResponse = ApiErrorResponse | ApiSuccessResponse;

export default function Home() {
  const [result, setResult] = useState<string>('');
  const [pdfResult, setPdfResult] = useState<string>('');
  const [currentModelName, setCurrentModelName] = useState<string>('');
  const [pdfPaths, setPdfPaths] = useState<string[]>([]);
  const [objective, setObjective] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<string>('');
  const [pdfDocuments, setPdfDocuments] = useState<string[]>([]);

  const handleImageCapture = async (imageData: string) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: imageData,
          objective,
          currentItems,
          pdfDocuments: pdfPaths
        }),
      });
      
      const data = await response.json() as ApiResponse;
      
      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.details || errorData.error || 'Failed to process image');
      }
      
      const successData = data as ApiSuccessResponse;
      setResult(successData.result);

      // Add debug logs
      console.log('Response result:', successData.result);
      
      try {
        // More aggressive cleanup of the JSON string
        const cleanJson = successData.result
          .replace(/```json\n?/g, '')
          .replace(/```/g, '')
          .replace(/^\s+|\s+$/g, '')
          .replace(/\\n/g, ' ')
          .replace(/\n/g, ' ')
          .trim();

        console.log('Cleaned JSON string:', cleanJson);
        
        // Try to find the JSON object/array in the text
        const jsonMatch = cleanJson.match(/\{.*\}|\[.*\]/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }

        const jsonResult = JSON.parse(jsonMatch[0]);
        console.log('Parsed JSON:', jsonResult);
        
        // Update this section to look for the model in identifiedComponents
        if (jsonResult.identifiedComponents && Array.isArray(jsonResult.identifiedComponents)) {
          const firstComponent = jsonResult.identifiedComponents[0];
          if (firstComponent && firstComponent.model) {
            console.log('Setting model name to:', firstComponent.model);
            setCurrentModelName(firstComponent.model);
          }
        }
      } catch (e) {
        console.error('Error parsing JSON result:', e);
        console.error('Raw result:', successData.result);
      }
      
      // Log current model name after setting
      console.log('Current model name:', currentModelName);
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image. Please try again.';
      setResult(`Error: ${errorMessage}`);
    }
  };

  const handlePdfComplete = (result: string) => {
    setPdfResult(result);
    
    // Extract PDF paths from the result
    const paths = result
      .split('\n')
      .filter(line => line.includes('[PDF file downloaded and saved as:'))
      .map(line => {
        const match = line.match(/saved as: (.+?)\]/);
        return match ? match[1].trim() : '';
      })
      .filter(Boolean);
    
    setPdfPaths(paths);
    setPdfDocuments(paths);
  };

  // Add debug log in render
  console.log('Rendering with currentModelName:', currentModelName);

  // Add this before the return statement
  console.log('Current model name for PDFButton:', currentModelName);

  return (
    <div className={styles.container}>
      <Head>
        <title>Camera Gemini App</title>
        <meta name="description" content="Camera app with Gemini AI integration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <ProjectStatus 
          objective={objective}
          currentItems={currentItems}
          pdfDocuments={pdfDocuments}
        />

        <NextStepButton
          objective={objective}
          currentItems={currentItems}
          pdfDocuments={pdfDocuments}
        />

        <ProjectDetails
          objective={objective}
          currentItems={currentItems}
          pdfDocuments={pdfDocuments}
          onObjectiveChange={setObjective}
          onCurrentItemsChange={setCurrentItems}
        />

        {/* Show PDFs at the top when they exist */}
        {pdfPaths.length > 0 && (
          <div className={styles.pdfSection}>
            <h2>Device Datasheets</h2>
            <PDFViewer pdfPaths={pdfPaths} />
          </div>
        )}

        {/* Camera and results section */}
        <div className={styles.mainSection}>
          <CameraComponent onCapture={handleImageCapture} />
          {currentModelName && (
            <div className={styles.modelInfo}>
              <p>Model Name: {currentModelName}</p>
              <PDFButton 
                modelName={currentModelName} 
                onComplete={handlePdfComplete}
              />
            </div>
          )}
          <ResultComponent result={result} />
        </div>

        {/* Optional: Show raw PDF search results at the bottom */}
        {pdfResult && (
          <div className={styles.pdfResult}>
            <h3>PDF Search Results:</h3>
            <pre>{pdfResult}</pre>
          </div>
        )}
      </main>
    </div>
  );
} 