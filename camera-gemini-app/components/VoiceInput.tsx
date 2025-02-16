import React, { useState, useRef } from 'react';
import styles from '../styles/VoiceInput.module.css';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  objective: string;
  currentItems: string;
  pdfDocuments: string[];
  capturedImage?: string;
  detectedItems?: string[];
}

export default function VoiceInput({ onTranscription, disabled, objective, currentItems, pdfDocuments, capturedImage, detectedItems }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setIsProcessing(true);
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
          
          if (audioBlob.size === 0) {
            throw new Error('No audio data recorded');
          }

          const reader = new FileReader();
          
          reader.onload = async () => {
            try {
              const base64Audio = reader.result as string;
              const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ audio: base64Audio }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Failed to transcribe audio');
              }

              const data = await response.json();
              if (data.text) {
                onTranscription(data.text);
                setError('');
                
                // Automatically get next step after transcription
                await getNextStep(data.text);
              } else {
                throw new Error('No transcription received');
              }
            } catch (error) {
              console.error('Error transcribing:', error);
              setError(error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          };

          reader.onerror = () => {
            setError('Error reading audio data');
            setIsProcessing(false);
          };

          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          setError(error instanceof Error ? error.message : 'Error processing audio');
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions and try again.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const getNextStep = async (transcribedText: string) => {
    try {
      const response = await fetch('/api/getNextStep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objective: transcribedText || objective,
          currentItems,
          pdfDocuments,
          image: capturedImage,
          detectedItems: detectedItems || []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get next step');
      }

      const data = await response.json();
      
      // Play the audio response
      const speechResponse = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: data.result }),
      });

      if (!speechResponse.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await speechResponse.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      await audio.play();

    } catch (error) {
      console.error('Error:', error);
      setError('Error getting next step. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
        disabled={isProcessing || disabled}
      >
        {isProcessing ? '⏳ Processing...' : isRecording ? '🔴 Stop Recording' : '🎤 Ask What To Do Next'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
} 