import React, { useState } from 'react';
import styles from '../styles/NextStepButton.module.css';

interface NextStepButtonProps {
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
}

export default function NextStepButton({ objective, currentItems, pdfDocuments }: NextStepButtonProps) {
  const [nextStep, setNextStep] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const getNextStep = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/getNextStep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objective,
          currentItems,
          pdfDocuments,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get next step');
      }

      setNextStep(data.result);
    } catch (error) {
      console.error('Error getting next step:', error);
      setNextStep('Error: Failed to generate next step. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button 
        onClick={getNextStep}
        disabled={loading || !objective}
        className={styles.button}
      >
        {loading ? 'Thinking...' : 'Get Next Step'}
      </button>
      {nextStep && (
        <div className={styles.stepDisplay}>
          <h3>Next Step:</h3>
          <p>{nextStep}</p>
        </div>
      )}
    </div>
  );
} 