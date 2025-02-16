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
      setRawDetections([]);
      setBoundingBoxes([]);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: imageData,
          prompt: `Analyze this image of electronic components and devices. For each item:
1. Identify the specific product name/type (e.g., "Raspberry Pi 4", "Arduino Uno", "ESP32 DevKit")
2. Output a json list where each entry contains:
   - "box_2d": [x1, y1, x2, y2] for the bounding box
   - "label": Full descriptive name of the component
   - "product_name": The specific product name/type if identified
Maximum 20 items. Focus on identifying complete product names rather than just model numbers.`,
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
          
          // Look for items with product names
          const deviceWithProduct = jsonResult.find(item => 
            item.product_name || // Check for explicit product name field
            item.label.toLowerCase().includes('raspberry pi') ||
            item.label.toLowerCase().includes('arduino') ||
            item.label.toLowerCase().includes('esp') ||
            item.label.toLowerCase().includes('board') ||
            item.label.toLowerCase().includes('kit')
          );

          if (deviceWithProduct) {
            const productName = deviceWithProduct.product_name || deviceWithProduct.label;
            setCurrentModelName(productName); // We're reusing currentModelName state for product name
            
            // Search for PDFs with the product name
            const pdfResponse = await fetch('/api/getPdfs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                modelName: productName, // The API endpoint still expects 'modelName'
                deviceType: deviceWithProduct.label // Additional context
              }),
            });

            if (pdfResponse.ok) {
              const pdfData = await pdfResponse.json();
              handlePdfComplete(pdfData.result);
            }
          }
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

  const handleBoxSelect = (index: number) => {
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

  // Add debug logs
  console.log('Response result:', result);
  
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

        <ProjectDetails
          objective={objective}
          currentItems={currentItems}
          pdfDocuments={pdfDocuments}
          onObjectiveChange={setObjective}
          onCurrentItemsChange={setCurrentItems}
          capturedImage={capturedImage}
          detectedItems={boundingBoxes.map(box => box.label)}
        />

        {/* Show PDFs at the top when they exist */}
        {pdfPaths.length > 0 && (
          <div className={styles.pdfSection}>
            <h2>Device Documentation</h2>
            <div className={styles.pdfInfo}>
              <p>Found {pdfPaths.length} datasheet{pdfPaths.length > 1 ? 's' : ''} for {currentModelName}</p>
              {pdfResult && (
                <details className={styles.searchDetails}>
                  <summary>View Search Results</summary>
                  <pre className={styles.searchResults}>{pdfResult}</pre>
                </details>
              )}
            </div>
            <PDFViewer pdfPaths={pdfPaths} />
          </div>
        )}

        {/* Camera and results section */}
        <div className={styles.mainSection}>
          <CameraComponent onCapture={handleImageCapture} />
          {capturedImage && (
            <div className={styles.detectionResults}>
              <div className={styles.imageContainer} style={{ position: 'relative' }}>
                <img 
                  ref={imageRef}
                  src={capturedImage} 
                  alt="Captured" 
                  style={{ 
                    maxWidth: '100%',
                    display: 'block',
                    margin: '0 auto'
                  }} 
                  onLoad={handleImageLoad}
                />
                {boundingBoxes.length > 0 ? (
                  <>
                    <svg
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                      }}
                      preserveAspectRatio="none"
                    >
                      {boundingBoxes.map((box, index) => {
                        console.log(`Drawing box ${index}:`, box);
                        return (
                          <g key={index}>
                            <rect
                              x={`${box.box_2d.x1 * 100}%`}
                              y={`${box.box_2d.y1 * 100}%`}
                              width={`${(box.box_2d.x2 - box.box_2d.x1) * 100}%`}
                              height={`${(box.box_2d.y2 - box.box_2d.y1) * 100}%`}
                              fill="none"
                              stroke={selectedBoxes.includes(index) ? 'red' : 'green'}
                              strokeWidth="2"
                            />
                            <text
                              x={`${box.box_2d.x1 * 100}%`}
                              y={`${box.box_2d.y1 * 100 - 1}%`}
                              fill={selectedBoxes.includes(index) ? 'red' : 'green'}
                              fontSize="12px"
                              fontWeight="bold"
                              style={{
                                filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.7))'
                              }}
                            >
                              {box.label}
                            </text>
                          </g>
                        );
                      })}
                      {selectedBoxes.length === 2 && (
                        <line
                          x1={`${(boundingBoxes[selectedBoxes[0]].box_2d.x1 + boundingBoxes[selectedBoxes[0]].box_2d.x2) * 50}%`}
                          y1={`${(boundingBoxes[selectedBoxes[0]].box_2d.y1 + boundingBoxes[selectedBoxes[0]].box_2d.y2) * 50}%`}
                          x2={`${(boundingBoxes[selectedBoxes[1]].box_2d.x1 + boundingBoxes[selectedBoxes[1]].box_2d.x2) * 50}%`}
                          y2={`${(boundingBoxes[selectedBoxes[1]].box_2d.y1 + boundingBoxes[selectedBoxes[1]].box_2d.y2) * 50}%`}
                          stroke="blue"
                          strokeWidth="2"
                        />
                      )}
                    </svg>
                    <div className={styles.boxSelection}>
                      <h3>Select Boxes to Connect ({boundingBoxes.length} objects detected):</h3>
                      <select
                        multiple
                        value={selectedBoxes.map(String)}
                        onChange={(e) => {
                          const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                          setSelectedBoxes(selectedOptions.slice(0, 2));
                        }}
                        className={styles.boxSelector}
                      >
                        {boundingBoxes.map((box, index) => (
                          <option key={index} value={index}>
                            {box.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className={styles.noDetections}>
                    Analyzing image for objects...
                  </div>
                )}
              </div>
            </div>
          )}
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