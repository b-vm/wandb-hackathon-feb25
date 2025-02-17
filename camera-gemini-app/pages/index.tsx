import { useState, useEffect, useRef } from 'react';
import CameraComponent from '../components/CameraComponent';
import ResultComponent from '../components/ResultComponent';
import styles from '../styles/Home.module.css';
import PDFButton from '../components/PDFButton';
import PDFViewer from '../components/PDFViewer';
import ProjectStatus from '../components/ProjectStatus';
import ProjectDetails from '../components/ProjectDetails';
import Head from 'next/head';
import VoiceInput from '../components/VoiceInput';

interface ApiErrorResponse {
  error: string;
  details?: string;
}

interface ApiSuccessResponse {
  result: string;
}

type ApiResponse = ApiErrorResponse | ApiSuccessResponse;

interface BoundingBox {
  box_2d: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  label: string;
}

export default function Home() {
  const [result, setResult] = useState<string>('');
  const [pdfResult, setPdfResult] = useState<string>('');
  const [currentModelName, setCurrentModelName] = useState<string>('');
  const [pdfPaths, setPdfPaths] = useState<string[]>([]);
  const [objective, setObjective] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<string>('');
  const [pdfDocuments, setPdfDocuments] = useState<string[]>([]);
  const [rawDetections, setRawDetections] = useState<any[]>([]);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');

  const handleImageCapture = (imageData: string, analysisData?: any) => {
    setCapturedImage(imageData);
    
    if (analysisData) {
      setRawDetections(analysisData.detections || []);
      const formattedResult = JSON.stringify(analysisData, null, 2);
      setAnalysisResult(formattedResult);
    } else {
      setRawDetections([]);
      setAnalysisResult('');
    }
  };

  const handlePdfComplete = (result: string) => {
    setPdfResult(result);
    
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

        <div className={styles.content}>
          <ProjectDetails
            objective={objective}
            currentItems={currentItems}
            pdfDocuments={pdfDocuments}
            onObjectiveChange={setObjective}
            onCurrentItemsChange={setCurrentItems}
            capturedImage={capturedImage}
            detectedItems={rawDetections}
          />

          <div className={styles.cameraSection}>
            <CameraComponent onCapture={handleImageCapture} />
            {capturedImage && (
              <div className={styles.imagePreview}>
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className={styles.previewImage}
                />
              </div>
            )}
          </div>

          {currentModelName && (
            <div className={styles.modelInfo}>
              <p>Model Name: {currentModelName}</p>
              <PDFButton 
                modelName={currentModelName} 
                onComplete={handlePdfComplete}
              />
            </div>
          )}
          
          <ResultComponent result={analysisResult} />
        </div>

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