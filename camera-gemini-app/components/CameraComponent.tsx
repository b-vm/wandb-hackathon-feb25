import { useRef, useEffect, useState } from 'react';
import styles from '../styles/Camera.module.css';

interface CameraComponentProps {
  onCapture: (imageData: string) => void;
}

export default function CameraComponent({ onCapture }: CameraComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    initializeCamera();
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsInitialized(true);
        setError('');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please make sure you have granted camera permissions.');
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      onCapture(imageData);
    }
  };

  return (
    <div className={styles.cameraContainer}>
      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={styles.video}
          />
          {isInitialized && (
            <button onClick={captureImage} className={styles.captureButton}>
              Take Photo
            </button>
          )}
        </>
      )}
    </div>
  );
} 