const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');

const connectDB = require('./config/db');
const socketHelper = require('./socket');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const adminRoutes = require('./routes/adminRoutes');
const memberRoutes = require('./routes/memberRoutes');
const fundingAgencyRoutes = require('./routes/fundingAgencyRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const grantIngestRoutes = require('./routes/grantIngestRoutes');
const grantAdminRoutes = require('./routes/grantAdminRoutes');

// Reminder controller
const {
  runAutomatedCriticalDeadlineCheck,
} = require('./controllers/reminderController');

const app = express();

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes);

app.use('/api/org', orgRoutes);

app.use('/api/admin', adminRoutes);

app.use('/api/member', memberRoutes);

app.use('/api/agency', fundingAgencyRoutes);

app.use('/api/proposals', proposalRoutes);

app.use('/api/reminders', reminderRoutes);

app.use('/api/admin/grants', grantAdminRoutes);


// ─────────────────────────────────────────────
// Internal Routes
// Machine-to-machine / scraper ingestion
// ─────────────────────────────────────────────

app.use('/api/internal/grants', grantIngestRoutes);


// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});


// ─────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});


// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});


// ─────────────────────────────────────────────
// HTTP + Socket.io Server
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);


// Initialize Socket.io
socketHelper.init(httpServer, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});


// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`⚡ WebSocket Server initialized`);
    });

    // ─────────────────────────────────────────
    // Automated Critical Deadline Email Alerts
    // Runs once after 5 seconds
    // Then every 12 hours
    // ─────────────────────────────────────────

    setTimeout(() => {
      runAutomatedCriticalDeadlineCheck();
    }, 5000);

    setInterval(
      runAutomatedCriticalDeadlineCheck,
      12 * 60 * 60 * 1000
    );

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();