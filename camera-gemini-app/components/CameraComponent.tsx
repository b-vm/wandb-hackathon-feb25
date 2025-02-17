import { useRef, useEffect, useState } from 'react';
import styles from '../styles/Camera.module.css';

interface CameraComponentProps {
  onCapture: (imageData: string, analysisData?: any) => void;
}

const MAX_IMAGE_SIZE = 800; // Maximum width or height for the image

const resizeImage = (imageData: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height && width > MAX_IMAGE_SIZE) {
        height *= MAX_IMAGE_SIZE / width;
        width = MAX_IMAGE_SIZE;
      } else if (height > MAX_IMAGE_SIZE) {
        width *= MAX_IMAGE_SIZE / height;
        height = MAX_IMAGE_SIZE;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Reduce quality to 0.8 to further reduce file size
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(imageData); // Fallback to original if context is not available
      }
    };
    img.src = imageData;
  });
};

export default function CameraComponent({ onCapture }: CameraComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setError('Camera not accessible. You can upload an image instead.');
    }
  };

  const captureImage = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      const resizedImage = await resizeImage(imageData);
      
      try {
        // First try to analyze the image
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            image: resizedImage,
            prompt: `Analyze this image of electronic components and devices. For each item:
1. Identify the specific product name/type (e.g., "Raspberry Pi 4", "Arduino Uno", "ESP32 DevKit")
2. Output a json list where each entry contains:
   - "box_2d": [x1, y1, x2, y2] for the bounding box
   - "label": Full descriptive name of the component
   - "product_name": The specific product name/type if identified
Maximum 20 items. Focus on identifying complete product names rather than just model numbers.`
          }),
        });

        // If the response isn't OK or there's no JSON, just pass the image without analysis
        if (!response.ok) {
          console.log('No products detected in image, continuing with capture');
          onCapture(resizedImage);
          return;
        }

        try {
          const data = await response.json();
          // If we got valid JSON, pass both the image and the analysis
          onCapture(resizedImage, data);
        } catch (error) {
          // If JSON parsing fails, just pass the image
          console.log('Could not parse product data, continuing with capture');
          onCapture(resizedImage);
        }
      } catch (error) {
        // If the fetch fails, just pass the image
        console.log('Image analysis failed, continuing with capture');
        onCapture(resizedImage);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      if (imageData) {
        const resizedImage = await resizeImage(imageData);
        onCapture(resizedImage);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.cameraContainer}>
      {error ? (
        <div className={styles.uploadContainer}>
          <p className={styles.error}>{error}</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className={styles.fileInput}
            style={{ display: 'none' }}
          />
          <button onClick={triggerFileUpload} className={styles.uploadButton}>
            📁 Upload Image
          </button>
        </div>
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
              📸 Take Photo
            </button>
          )}
        </>
      )}
    </div>
  );
}