require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from ProductNerve Backend!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/users'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/icp', require('./routes/icp'));
app.use('/api/user-stories', require('./routes/userStories'));
app.use('/api/prd', require('./routes/prd'));
app.use('/api/artifacts', require('./routes/artifacts'));
app.use('/api/support', require('./routes/support'));
app.use('/api/validation', require('./routes/validation'));
app.use('/api/ai', require('./routes/ai'));
app.post('/api/phase2-intake-chat', require('./controllers/aiController').generatePhase2IntakeResponse);
app.post('/api/phase3-intake-chat', require('./controllers/aiController').generatePhase3IntakeResponse);
app.use('/api', require('./routes/ragRoutes'));

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start background jobs
const profileNotificationJob = require('./jobs/profileNotificationJob');
profileNotificationJob.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  profileNotificationJob.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  profileNotificationJob.stop();
  process.exit(0);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});