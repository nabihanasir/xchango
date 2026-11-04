import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorMiddleware';
import path from 'path';
import { attachRequestContext } from './middleware/requestContext';
import { corsOptions } from './config/cors';

dotenv.config();

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(attachRequestContext);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Main Routes
app.use('/api', routes);

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
