import { useState } from 'react';
import styles from '../styles/PDFButton.module.css';

interface PDFButtonProps {
  modelName: string;
  onComplete: (result: string) => void;
}

export default function PDFButton({ modelName, onComplete }: PDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/getPdfs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelName }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch PDFs');
      }

      onComplete(data.result);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      onComplete(`Error: ${error instanceof Error ? error.message : 'Failed to fetch PDFs'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      className={styles.button}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'Fetching PDFs...' : 'Get PDFs'}
    </button>
  );
} 