import { useState } from 'react';
import CameraComponent from '../components/CameraComponent';
import ResultComponent from '../components/ResultComponent';
import styles from '../styles/Home.module.css';

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

  const handleImageCapture = async (imageData: string) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });
      
      const data = await response.json() as ApiResponse;
      
      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.details || errorData.error || 'Failed to process image');
      }
      
      const successData = data as ApiSuccessResponse;
      setResult(successData.result);
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image. Please try again.';
      setResult(`Error: ${errorMessage}`);
    }
  };

  return (
    <div className={styles.container}>
      <CameraComponent onCapture={handleImageCapture} />
      <ResultComponent result={result} />
    </div>
  );
} 