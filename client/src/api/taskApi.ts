import axios from 'axios';

const API_URL = 'http://localhost:5000/api/tasks';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'archived';

export interface Task {
  _id: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: TaskStatus;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createTask = async (text: string): Promise<Task> => {
  const response = await axios.post(API_URL, { text });
  return response.data;
};

export const getTasks = async (status?: string): Promise<Task[]> => {
  const params = status ? { status } : {};
  const response = await axios.get(API_URL, { params });
  return response.data;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const response = await axios.put(`${API_URL}/${id}`, updates);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};
