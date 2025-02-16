import styles from '../styles/PDFViewer.module.css';

interface PDFViewerProps {
  pdfPaths: string[];
}

export default function PDFViewer({ pdfPaths }: PDFViewerProps) {
  return (
    <div className={styles.pdfContainer}>
      {pdfPaths.map((pdfPath, index) => (
        <div key={pdfPath} className={styles.pdfWrapper}>
          <h3>PDF Document {index + 1}</h3>
          <iframe
            src={`/${pdfPath}`}
            className={styles.pdfFrame}
            title={`PDF Document ${index + 1}`}
          />
        </div>
      ))}
    </div>
  );
} 