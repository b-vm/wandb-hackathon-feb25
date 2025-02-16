import React from 'react';
import styles from '../styles/ProjectDetails.module.css';

interface ProjectDetailsProps {
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
  onObjectiveChange: (value: string) => void;
  onCurrentItemsChange: (value: string) => void;
}

export default function ProjectDetails({
  objective,
  currentItems,
  pdfDocuments,
  onObjectiveChange,
  onCurrentItemsChange
}: ProjectDetailsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.inputGroup}>
        <label htmlFor="objective">Project Objective:</label>
        <textarea
          id="objective"
          value={objective}
          onChange={(e) => onObjectiveChange(e.target.value)}
          placeholder="What do you want to achieve?"
          rows={3}
        />
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="currentItems">Current Items Available:</label>
        <textarea
          id="currentItems"
          value={currentItems}
          onChange={(e) => onCurrentItemsChange(e.target.value)}
          placeholder="What components do you have? (e.g., breadboard, wires, battery)"
          rows={3}
        />
      </div>

      {pdfDocuments.length > 0 && (
        <div className={styles.pdfList}>
          <h3>Available Documentation:</h3>
          <ul>
            {pdfDocuments.map((pdf, index) => (
              <li key={index}>{pdf}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 