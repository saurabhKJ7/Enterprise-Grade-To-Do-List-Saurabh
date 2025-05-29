import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getTasks, createTask as createTaskApi, updateTask as updateTaskApi, deleteTask as deleteTaskApi } from '../api/taskApi';
import type { Task } from '../api/taskApi';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (text: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  fetchTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Explicitly fetch all tasks regardless of status
      const data = await getTasks('all');
      setTasks(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async (text: string) => {
    try {
      const newTask = await createTaskApi(text);
      setTasks([...tasks, newTask]);
    } catch (err) {
      setError('Failed to add task');
      console.error('Error adding task:', err);
      throw err;
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const task = tasks.find(t => t._id === id);
      if (task) {
        const updatedTask = await updateTaskApi(id, { completed: !task.completed });
        setTasks(tasks.map(t => (t._id === id ? updatedTask : t)));
      }
    } catch (err) {
      setError('Failed to update task');
      console.error('Error toggling task:', err);
    }
  };

  const removeTask = async (id: string) => {
    try {
      await deleteTaskApi(id);
      setTasks(tasks.filter(task => task._id !== id));
    } catch (err) {
      setError('Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // First update the task on the server
      await updateTaskApi(id, updates);
      
      // Then refresh the entire task list to ensure consistency
      await fetchTasks();
      
      // Also update the local state optimistically
      setTasks(prevTasks => 
        prevTasks.map(t => (t._id === id ? { ...t, ...updates } : t))
      );
      
      return { ...tasks.find(t => t._id === id), ...updates } as Task;
    } catch (err) {
      setError('Failed to update task');
      console.error('Error updating task:', err);
      throw err;
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        addTask,
        toggleTask,
        removeTask,
        updateTask,
        fetchTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
