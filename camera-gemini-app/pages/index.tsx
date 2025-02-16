import { useState, useEffect } from 'react';
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
      setResult(data.result);
    } catch (error) {
      console.error('Error processing image:', error);
      setResult('Error processing image. Please try again.');
    }
  };

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) {
      alert('This application is only supported on iOS devices.');
    }
  }, []);

  return (
    <div className={styles.container}>
      <CameraComponent onCapture={handleImageCapture} />
      <ResultComponent result={result} />
    </div>
  );
} 