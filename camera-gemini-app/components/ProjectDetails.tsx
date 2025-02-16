import React, { useState, useEffect } from 'react';
import styles from '../styles/ProjectDetails.module.css';
import VoiceInput from './VoiceInput';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

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
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "Raspberry Pi Power Supply", completed: false },
    { id: 2, text: "LED Strip", completed: false },
    { id: 3, text: "Breadboard", completed: false }
  ]);
  const [loading, setLoading] = useState<number | null>(null);
  const [showSAMOutput, setShowSAMOutput] = useState(false);
  const [samMetadata, setSamMetadata] = useState(null);

  useEffect(() => {
    // Load the pi1.json metadata when component mounts
    const loadSAMMetadata = async () => {
      try {
        const response = await fetch('/pi1.json');
        const data = await response.json();
        setSamMetadata(data);
      } catch (error) {
        console.error('Error loading SAM metadata:', error);
      }
    };
    loadSAMMetadata();
  }, []);

  const handleVoiceInput = (text: string) => {
    onObjectiveChange(text);
  };

  const handleAgentSearch = async (todoId: number, todoText: string) => {
    try {
      setLoading(todoId);
      const response = await fetch('/api/agentSearch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: todoText }),
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      console.log('Search results:', data);
    } catch (error) {
      console.error('Error performing agent search:', error);
    } finally {
      setLoading(null);
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
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

      <div className={styles.todoSection}>
        <h3>Items To Get</h3>
        <div className={styles.todoList}>
          {todos.map(todo => (
            <div key={todo.id} className={styles.todoItem}>
              <div className={styles.todoContent}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span className={todo.completed ? styles.completed : ''}>
                  {todo.text}
                </span>
              </div>
              <button
                className={`${styles.agentSearchButton} ${loading === todo.id ? styles.loading : ''}`}
                onClick={() => handleAgentSearch(todo.id, todo.text)}
                disabled={loading !== null}
              >
                {loading === todo.id ? 'Searching...' : 'Search with Agent'}
              </button>
            </div>
          ))}
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

      <div className={styles.samSection}>
        <button 
          className={styles.samButton}
          onClick={() => setShowSAMOutput(!showSAMOutput)}
        >
          {showSAMOutput ? 'Hide SAM Output' : 'Show SAM Output'}
        </button>

        {showSAMOutput && (
          <div className={styles.samOutput}>
            <img 
              src="/output_pi3.jpg" 
              alt="SAM Output"
              className={styles.samImage}
            />
            {samMetadata && (
              <div className={styles.metadata}>
                <h3>Bounding Box Data:</h3>
                <pre>{JSON.stringify(samMetadata, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 