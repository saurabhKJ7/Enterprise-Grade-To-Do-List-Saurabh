// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Log environment status
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '5000',
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not Set'
});

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import taskRoutes from './routes/taskRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

export default app;
