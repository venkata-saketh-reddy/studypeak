import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import habitRoutes from './routes/habits.js';
import taskRoutes from './routes/tasks.js';
import sessionRoutes from './routes/sessions.js';
import analyticsRoutes from './routes/analytics.js';
import achievementRoutes from './routes/achievements.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler — never leak stack traces
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Studypeak API listening on http://127.0.0.1:${PORT}`);
});
