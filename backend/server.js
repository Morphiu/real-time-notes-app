import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  const userId = socket.handshake.auth.userId;
  const username = socket.handshake.auth.username;
  console.log('Connected user:', { userId, username });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${username} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      userId,
      username
    });
  });

  socket.on('note-update', (data) => {
    // Broadcast to all users in the room except the sender
    socket.to(data.roomId).emit('note-updated', data);
  });

  socket.on('note-deleted', ({ roomId, noteId }) => {
    // Broadcast to all users in the room
    io.to(roomId).emit('note-deleted', { noteId });
  });

  socket.on('room-deleted', ({ roomId }) => {
    // Broadcast to all users in the room
    io.to(roomId).emit('room-deleted', { roomId });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', { userId, username });
    const rooms = Array.from(socket.rooms);
    rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit('user-left', {
          userId,
          username
        });
      }
    });
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 