require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');

const connectDB       = require('./config/db');
const socketHandler   = require('./socket/socketHandler');

// Routes
const authRoutes    = require('./routes/auth');
const userRoutes    = require('./routes/users');
const messageRoutes = require('./routes/messages');
const postRoutes    = require('./routes/posts');

// Connect to MongoDB
connectDB();

// Create express app
const app    = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000
});

// Make io available in controllers
app.set('io', io);

// Create uploads folder if not exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ── Middleware ────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts',    postRoutes);

// ── Health check ──────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status:  '✅ Biradari Server Running',
    time:    new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Socket.IO ─────────────────────────────────────────
socketHandler(io);

// ── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

// ── Start server ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   ✅ Biradari Server Started         ║
  ║   Port: ${PORT}                          ║
  ║   DB:   MongoDB Atlas                ║
  ╚══════════════════════════════════════╝
  `);
});
