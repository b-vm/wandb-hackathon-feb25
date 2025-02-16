import React, { useState, useEffect } from 'react';
import styles from '../styles/NextStepButton.module.css';

interface NextStepButtonProps {
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
}

export default function NextStepButton({ objective, currentItems, pdfDocuments }: NextStepButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Clean text by removing content within <think> tags
  const cleanThinkTags = (text: string): string => {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      }
    };
  }, [audioElement]);

  const playAudio = async (text: string) => {
    try {
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      }

      // Clean the text before sending to speech API
      const cleanedText = cleanThinkTags(text);
      if (!cleanedText) return; // Don't make API call if no text to speak

      const speechResponse = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanedText }),
      });

      if (!speechResponse.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await speechResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      
      // Add event listeners
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      });
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      });

      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error('Error playing speech:', error);
    }
  };

  const handleClick = async () => {
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

      if (!response.ok) {
        throw new Error('Failed to get next step');
      }

      const data = await response.json();
      
      // Clean the text before setting it
      const cleanedResult = cleanThinkTags(data.result);
      setResult(cleanedResult);

      // Play the audio with cleaned text
      await playAudio(data.result);
    } catch (error) {
      console.error('Error:', error);
      setResult('Error getting next step. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button 
        onClick={handleClick} 
        disabled={loading || !objective}
        className={styles.button}
      >
        {loading ? 'Getting Next Step...' : 'What Should I Do Next?'}
      </button>
      {result && (
        <div className={styles.result}>
          <h3>Next Step:</h3>
          <p>{result}</p>
          {isPlaying && (
            <div className={styles.audioIndicator}>
              🔊 Speaking...
            </div>
          )}
        </div>
      )}
    </div>
  );
} 