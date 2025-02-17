import styles from '../styles/Result.module.css';

interface DetectedItem {
  label: string;
  product_name?: string;
  box_2d: any;
}

interface ResultComponentProps {
  result: string;
}

export default function ResultComponent({ result }: ResultComponentProps) {
  const parseAndFormatResult = (result: string) => {
    try {
      const parsed = JSON.parse(result);
      const detections: DetectedItem[] = parsed.detections || [];

      if (detections.length === 0) {
        return "No electronic components detected in the image.";
      }

      return (
        <div className={styles.detectionsList}>
          <h4>Detected Components:</h4>
          {detections.map((item, index) => (
            <div key={index} className={styles.detectionItem}>
              <div className={styles.itemHeader}>
                {item.product_name ? (
                  <>
                    <span className={styles.productName}>{item.product_name}</span>
                    {item.label !== item.product_name && (
                      <span className={styles.label}>{item.label}</span>
                    )}
                  </>
                ) : (
                  <span className={styles.label}>{item.label}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    } catch (error) {
      // If it's not JSON or can't be parsed, return the raw text
      return result;
    }
  };

  return (
    <div className={styles.resultContainer}>
      <h3>Analysis Results</h3>
      {result ? (
        <div className={styles.resultContent}>
          {parseAndFormatResult(result)}
        </div>
      ) : (
        <p className={styles.placeholder}>
          Take a photo of your electronics components to see the analysis
        </p>
      )}
    </div>
  );
} 