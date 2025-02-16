import { useState, useEffect, useRef } from 'react';
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
  const [objective, setObjective] = useState<string>(''); // Initialize with empty string
  const [currentItems, setCurrentItems] = useState<string>(''); // Initialize with empty string
  const [pdfDocuments, setPdfDocuments] = useState<string[]>([]);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [rawDetections, setRawDetections] = useState<any[]>([]);
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      const size = {
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      };
      console.log('Image loaded with dimensions:', size);
      setImageSize(size);
    }
  }, [capturedImage]);

  useEffect(() => {
    if (imageSize.width && imageSize.height && rawDetections.length > 0) {
      console.log('Converting detections with image size:', imageSize);
      const convertedBoxes = rawDetections
        .map(box => convertToPercentage(box))
        .filter((box): box is BoundingBox => box !== null);
      console.log('Converted boxes:', convertedBoxes);
      setBoundingBoxes(convertedBoxes);
    }
  }, [imageSize, rawDetections]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const size = {
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      };
      console.log('Image loaded with dimensions:', size);
      setImageSize(size);
    }
  };

  const convertToPercentage = (box: any) => {
    if (!imageSize.width || !imageSize.height) return null;

    // Check if box_2d is an array (old format) or object (new format)
    const x1 = Array.isArray(box.box_2d) ? box.box_2d[0] : box.box_2d.x1;
    const y1 = Array.isArray(box.box_2d) ? box.box_2d[1] : box.box_2d.y1;
    const x2 = Array.isArray(box.box_2d) ? box.box_2d[2] : box.box_2d.x2;
    const y2 = Array.isArray(box.box_2d) ? box.box_2d[3] : box.box_2d.y2;

    return {
      ...box,
      box_2d: {
        x1: x1 / imageSize.width,
        y1: y1 / imageSize.height,
        x2: x2 / imageSize.width,
        y2: y2 / imageSize.height
      }
    };
  };

  const handleImageCapture = async (imageData: string) => {
    try {
      setCapturedImage(imageData);
      setRawDetections([]); // Clear previous detections
      setBoundingBoxes([]); // Clear previous boxes

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: imageData,
          prompt: 'Detect items, with no more than 20 items. Output a json list where each entry contains the 2D bounding box in "box_2d" as an array [x1, y1, x2, y2] representing the top-left and bottom-right coordinates, and a text label in "label".',
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

      try {
        const cleanJson = successData.result
          .replace(/```json\n?/g, '')
          .replace(/```/g, '')
          .replace(/^\s+|\s+$/g, '')
          .replace(/\\n/g, ' ')
          .replace(/\n/g, ' ')
          .trim();

        console.log('Frontend - Cleaned JSON string:', cleanJson);

        const jsonMatch = cleanJson.match(/\[.*\]/);
        if (!jsonMatch) {
          console.log('Frontend - No JSON array found in response');
          throw new Error('No valid JSON found in response');
        }

        console.log('Frontend - JSON match:', jsonMatch[0]);
        const jsonResult = JSON.parse(jsonMatch[0]);
        console.log('Frontend - Parsed JSON result:', jsonResult);
        
        if (Array.isArray(jsonResult)) {
          setRawDetections(jsonResult);
        } else {
          console.log('Frontend - JSON result is not an array');
        }
      } catch (e) {
        console.error('Frontend - Error parsing JSON result:', e);
        console.error('Frontend - Raw result:', successData.result);
      }
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

  const handleBoxClick = (index: number) => {
    setSelectedBoxes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (prev.length >= 2) {
        return [prev[1], index];
      }
      return [...prev, index];
    });
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Camera Gemini App</title>
        <meta name="description" content="Camera app with Gemini integration" />
      </Head>

      <main className={styles.main}>
        <section className={styles.section}>
          <h1 className={styles.title}>Project Status</h1>
          <ProjectStatus 
            currentModelName={currentModelName}
            objective={objective}
            currentItems={currentItems}
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.title}>Camera Feed</h2>
          <CameraComponent onImageCapture={handleImageCapture} />
          {capturedImage && (
            <div className={styles.imageContainer}>
              <img
                ref={imageRef}
                src={capturedImage}
                alt="Captured"
                onLoad={handleImageLoad}
              />
              {boundingBoxes.map((box, index) => (
                <div
                  key={index}
                  className={`${styles.boundingBox} ${selectedBoxes.includes(index) ? styles.selected : ''}`}
                  style={{
                    left: `${box.box_2d.x1 * 100}%`,
                    top: `${box.box_2d.y1 * 100}%`,
                    width: `${(box.box_2d.x2 - box.box_2d.x1) * 100}%`,
                    height: `${(box.box_2d.y2 - box.box_2d.y1) * 100}%`
                  }}
                  onClick={() => handleBoxClick(index)}
                >
                  <span className={styles.label}>{box.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.title}>Results</h2>
          <ResultComponent result={result} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.title}>Project Details</h2>
          <ProjectDetails 
            objective={objective}
            currentItems={currentItems}
            pdfDocuments={pdfPaths}
            onObjectiveChange={setObjective}
            onCurrentItemsChange={setCurrentItems}
          />
        </section>

        <div className={styles.ctas}>
          <NextStepButton onClick={() => {}} className={styles.button} />
          <PDFButton onPDFsLoaded={handlePdfComplete} className={`${styles.button} ${styles.secondary}`} />
        </div>
      </main>
    </div>
  );
}