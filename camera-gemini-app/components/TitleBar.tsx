import React from 'react';
import styles from '../styles/TitleBar.module.css';

export default function TitleBar() {
  return (
    <nav className={styles.titleBar}>
      <div className="container">
        <div className={styles.titleContent}>
          <div className={styles.brand}>
            <h1>SchematiX</h1>
            <p className={styles.subtitle}>Electronics AI Copilot</p>
          </div>
        </div>
      </div>
    </nav>
  );
} 