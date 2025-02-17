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
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                  const errorData = await response.json();
                  await handleTranscriptionError(response.status);
                } else {
                  console.error('Non-JSON transcription error response:', await response.text());
                  await handleTranscriptionError(response.status);
                }
                return; // Exit early after handling error
              }

              const data = await response.json();
              if (data.text) {
                onTranscription(data.text);
                setError('');
                await getNextStep(data.text);
              } else {
                await handleTranscriptionError(response.status);
              }
            } catch (error) {
              console.error('Error in transcription:', error);
              await provideFallbackResponse("I'm having trouble processing your request. Please try again.");
            } finally {
              setIsProcessing(false);
            }
          };

          reader.onerror = () => {
            setError('Error reading audio data');
            setIsProcessing(false);
            provideFallbackResponse("There was an error processing the audio. Please try again.");
          };

          reader.readAsDataURL(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          setError('Error processing audio');
          setIsProcessing(false);
          provideFallbackResponse("There was an error processing the audio. Please try again.");
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
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get next step');
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          throw new Error(`Server error: ${response.status}`);
        }
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
        const contentType = speechResponse.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await speechResponse.json();
          throw new Error(errorData.message || 'Failed to generate speech');
        } else {
          const errorText = await speechResponse.text();
          console.error('Non-JSON speech error response:', errorText);
          throw new Error(`Speech server error: ${speechResponse.status}`);
        }
      }

      const audioBlob = await speechResponse.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      await audio.play();

    } catch (error) {
      console.error('Error in getNextStep:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    }
  };

  const provideFallbackResponse = async (message: string) => {
    try {
      // Play a fallback audio response
      const speechResponse = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: "I apologize, but I'm having trouble connecting to the network. Please try again in a moment." 
        }),
      });

      if (speechResponse.ok) {
        const audioBlob = await speechResponse.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        await audio.play();
      } else {
        console.error('Could not play fallback audio');
      }
    } catch (error) {
      console.error('Error playing fallback audio:', error);
    }
  };

  const handleTranscriptionError = async (status: number) => {
    let message = "I'm having trouble understanding you right now. Please try again.";
    if (status === 500) {
      message = "The server is experiencing issues. Please try again in a moment.";
    } else if (status === 404) {
      message = "The transcription service is currently unavailable.";
    }
    
    setError(message);
    await provideFallbackResponse(message);
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