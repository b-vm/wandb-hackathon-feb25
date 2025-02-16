import styles from '../styles/Result.module.css';

interface ResultComponentProps {
  result: string;
}

export default function ResultComponent({ result }: ResultComponentProps) {
  return (
    <div className={styles.resultContainer}>
      {result ? (
        <p className={styles.resultText}>{result}</p>
      ) : (
        <p className={styles.placeholder}>Take a photo to see the analysis</p>
      )}
    </div>
  );
} 