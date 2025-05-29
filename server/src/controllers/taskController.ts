import { Request, Response } from 'express';
import Task, { ITask } from '../models/Task';
import { parseTaskFromText } from '../utils/nlpParser';

export const createTask = async (req: Request, res: Response) => {
  try {
    console.log('Environment variables:', {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***' : 'Not set',
      NODE_ENV: process.env.NODE_ENV
    });
    
    const { text } = req.body;
    console.log('Received request with text:', text);
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const parsedTask = await parseTaskFromText(text);
    
    const task = new Task({
      description: parsedTask.description,
      assignee: parsedTask.assignee,
      dueDate: parsedTask.dueDate,
      priority: parsedTask.priority || 'P3',
      status: 'pending', // Default status for new tasks
      completed: false
    });

    await task.save();
    
    res.status(201).json(task);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'Error';
    
    console.error('Error creating task:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    
    res.status(500).json({ 
      error: 'Failed to create task',
      details: errorMessage 
    });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { status, assignee } = req.query;
    const query: any = {};

    // Handle status filtering
    if (status === 'all') {
      // Return all tasks regardless of status
    } else if (status === 'completed') {
      query.status = 'completed';
    } else if (status) {
      query.status = status;
    } else {
      // Default to showing only pending and in-progress tasks if no status is specified
      query.status = { $in: ['pending', 'in-progress'] };
    }

    if (assignee) {
      query.assignee = assignee;
    }

    const tasks = await Task.find(query).sort({ 
      status: 1, // Sort by status first
      dueDate: 1, // Then by due date
      priority: 1 // Then by priority
    });
    
    res.json(tasks);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching tasks:', errorMessage);
    res.status(500).json({ 
      error: 'Failed to fetch tasks',
      details: errorMessage 
    });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'in-progress', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const task = await Task.findByIdAndUpdate(id, updates, { new: true });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findByIdAndDelete(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
