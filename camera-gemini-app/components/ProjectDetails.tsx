import React, { useState } from 'react';
import styles from '../styles/ProjectDetails.module.css';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface ProjectDetailsProps {
  objective?: string;
  currentItems?: string;
  pdfDocuments?: string[];
  onObjectiveChange?: (value: string) => void;
  onCurrentItemsChange?: (value: string) => void;
}

export default function ProjectDetails({
  objective = '',
  currentItems = '',
  pdfDocuments = [],
  onObjectiveChange = () => {},
  onCurrentItemsChange = () => {}
}: ProjectDetailsProps) {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "Arduino Uno", completed: false },
    { id: 2, text: "LED Strip", completed: false },
    { id: 3, text: "Breadboard", completed: false }
  ]);
  const [loading, setLoading] = useState<number | null>(null);

  const handleAgentSearch = async (todoId: number, todoText: string) => {
    try {
      setLoading(todoId);
      await fetch('/api/agentSearch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: todoText }),
      });
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
          placeholder="List the items you have available"
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
    </div>
  );
}