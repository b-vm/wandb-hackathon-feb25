import React from 'react';
import styles from '../styles/ProjectDetails.module.css';
import VoiceInput from './VoiceInput';

interface ProjectDetailsProps {
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
  onObjectiveChange: (objective: string) => void;
  onCurrentItemsChange: (items: string) => void;
  capturedImage?: string;
  detectedItems?: string[];
}

export default function ProjectDetails({
  objective,
  currentItems,
  pdfDocuments,
  onObjectiveChange,
  onCurrentItemsChange,
  capturedImage,
  detectedItems,
}: ProjectDetailsProps) {
  const handleVoiceInput = (text: string) => {
    onObjectiveChange(text);
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <label htmlFor="objective">Project Objective:</label>
        <div className={styles.inputGroup}>
          <textarea
            id="objective"
            value={objective}
            onChange={(e) => onObjectiveChange(e.target.value)}
            placeholder="What are you trying to build?"
            className={styles.textarea}
          />
          <VoiceInput 
            onTranscription={handleVoiceInput}
            objective={objective}
            currentItems={currentItems}
            pdfDocuments={pdfDocuments}
            capturedImage={capturedImage}
            detectedItems={detectedItems}
          />
        </div>
      </div>

      {pdfDocuments.length > 0 && (
        <div className={styles.section}>
          <h3>Available Documentation:</h3>
          <ul className={styles.documentList}>
            {pdfDocuments.map((doc, index) => (
              <li key={index}>{doc}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 