const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
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

const app = express();

// ─── Middleware ───
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/agency', fundingAgencyRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/admin/grants', grantAdminRoutes);

// ─── Internal Routes (machine-to-machine, no public CORS) ───
app.use('/api/internal/grants', grantIngestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ───
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error handler ───
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

const http = require('http');
const socketHelper = require('./socket');

// ─── Start Server ───
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Initialize Socket.io
socketHelper.init(httpServer, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

const { runAutomatedCriticalDeadlineCheck } = require('./controllers/reminderController');

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`⚡ WebSocket Server initialized`);
  });

  // Automated Critical Deadline Email Alerts (Runs on startup, then every 12 hours)
  setTimeout(() => {
    runAutomatedCriticalDeadlineCheck();
  }, 5000);
  setInterval(runAutomatedCriticalDeadlineCheck, 12 * 60 * 60 * 1000);
};

startServer();

