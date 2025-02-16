import React from 'react';
import styles from '../styles/ProjectStatus.module.css';

interface ProjectStatusProps {
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
}

export default function ProjectStatus({ objective, currentItems, pdfDocuments }: ProjectStatusProps) {
  return (
    <div className={styles.statusContainer}>
      <div className={styles.statusSection}>
        <h2>Project Status</h2>
        <div className={styles.statusItem}>
          <strong>User's Desired Objective:</strong>
          <p>{objective || 'Not set'}</p>
        </div>
        <div className={styles.statusItem}>
          <strong>Current Items Available:</strong>
          <p>{currentItems || 'None specified'}</p>
        </div>
        <div className={styles.statusItem}>
          <strong>Available Documentation:</strong>
          {pdfDocuments.length > 0 ? (
            <ul>
              {pdfDocuments.map((pdf, index) => (
                <li key={index}>{pdf}</li>
              ))}
            </ul>
          ) : (
            <p>No documents loaded</p>
          )}
        </div>
      </div>
    </div>
  );
} 