import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTasks } from '../../context/TaskContext';

export const TaskForm = () => {
  const [text, setText] = useState('');
  const { addTask, loading } = useTasks();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    try {
      await addTask(text);
      setText('');
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex space-x-2">
        <div className="flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a new task (e.g., 'Call John tomorrow at 2pm' or 'Finish report by Friday')"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Add Task
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Try natural language like: "Call client Rajeev tomorrow 5pm" or "Finish landing page by Friday"
      </p>
    </form>
  );
};
