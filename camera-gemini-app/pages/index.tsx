import { useState } from 'react';
import CameraComponent from '../components/CameraComponent';
import ResultComponent from '../components/ResultComponent';
import styles from '../styles/Home.module.css';

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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to process image');
      }
      
      setResult(data.result);
    } catch (error: any) {
      console.error('Error processing image:', error);
      setResult(`Error: ${error.message || 'Failed to process image. Please try again.'}`);
    }
  };

  return (
    <div className={styles.container}>
      <CameraComponent onCapture={handleImageCapture} />
      <ResultComponent result={result} />
    </div>
  );
} 