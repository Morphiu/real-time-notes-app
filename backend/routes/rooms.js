import express from 'express';
import jwt from 'jsonwebtoken';
import Room from '../models/Room.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Create a new room
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, roomId } = req.body;

    // Validate room ID format (alphanumeric, 4-20 characters)
    if (!roomId || !/^[a-zA-Z0-9]{4,20}$/.test(roomId)) {
      return res.status(400).json({ 
        message: 'Room ID must be 4-20 characters long and contain only letters and numbers' 
      });
    }

    // Check if room ID is already taken
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room ID is already taken' });
    }

    const room = new Room({
      name,
      description,
      roomId,
      owner: req.user.userId,
      members: [req.user.userId]
    });
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all available rooms
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId }
      ]
    }).populate('owner', 'username email');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific room
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching room with ID:', req.params.id);
    console.log('User ID:', req.user.userId);
    
    const room = await Room.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('members', 'username email')
      .populate('notes.updatedBy', 'username');
    
    if (!room) {
      console.log('Room not found');
      return res.status(404).json({ message: 'Room not found' });
    }

    console.log('Room found:', {
      roomId: room._id,
      ownerId: room.owner._id,
      memberIds: room.members.map(m => m._id),
      userId: req.user.userId
    });

    // Check if user is the owner or a member
    const isOwner = room.owner._id.toString() === req.user.userId;
    const isMember = room.members.some(member => 
      member._id.toString() === req.user.userId
    );
    
    if (!isOwner && !isMember) {
      console.log('User is not the owner or a member of the room');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('User has access, sending room data');
    res.json(room);
  } catch (error) {
    console.error('Error in getRoom:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join a room by room ID
router.post('/join/:roomId', authenticateToken, async (req, res) => {
  try {
    console.log('Attempting to join room:', req.params.roomId);
    console.log('User ID:', req.user.userId);
    
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      console.log('Room not found');
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is already a member
    if (room.members.includes(req.user.userId)) {
      console.log('User already a member');
      return res.status(400).json({ message: 'Already a member' });
    }

    // Add user to members array
    room.members.push(req.user.userId);
    await room.save();

    // Get the user's username
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    // Emit socket event for real-time updates
    req.app.get('io').to(room._id.toString()).emit('user-joined', {
      roomId: room._id,
      userId: req.user.userId,
      username: user.username
    });

    console.log('Successfully joined room');
    res.json(room);
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave a room
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the owner
    if (room.owner.toString() === req.user.userId) {
      return res.status(403).json({ message: 'Room owner cannot leave the room' });
    }

    // Check if user is a member
    if (!room.members.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    // Remove user from members array
    room.members = room.members.filter(memberId => memberId.toString() !== req.user.userId);
    await room.save();

    // Get the user's username
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Emit socket event for real-time updates
    req.app.get('io').to(req.params.id).emit('user-left', {
      roomId: req.params.id,
      userId: req.user.userId,
      username: user.username
    });

    res.json({ message: 'Successfully left room' });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a room
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the owner
    if (room.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only room owner can delete the room' });
    }

    await room.deleteOne();

    // Emit socket event for real-time updates
    req.app.get('io').to(req.params.id).emit('room-deleted', {
      roomId: req.params.id
    });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new note in a room
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.members.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newNote = {
      title,
      content,
      lastUpdated: new Date(),
      updatedBy: req.user.userId
    };

    room.notes.push(newNote);
    await room.save();

    // Emit socket event for real-time updates
    req.app.get('io').to(req.params.id).emit('note-created', {
      roomId: req.params.id,
      note: newNote
    });

    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a note in a room
router.put('/:id/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    console.log('Updating note:', { roomId: req.params.id, noteId: req.params.noteId });
    console.log('User ID:', req.user.userId);
    console.log('Update data:', req.body);

    const room = await Room.findById(req.params.id);
    if (!room) {
      console.log('Room not found');
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is a member
    if (!room.members.includes(req.user.userId)) {
      console.log('User is not a member of the room');
      return res.status(403).json({ message: 'Access denied' });
    }

    const note = room.notes.id(req.params.noteId);
    if (!note) {
      console.log('Note not found');
      return res.status(404).json({ message: 'Note not found' });
    }

    // Update note fields
    note.title = req.body.title || note.title;
    note.content = req.body.content || note.content;
    note.lastUpdated = new Date();
    note.updatedBy = req.user.userId;

    await room.save();

    // Emit socket event for real-time updates
    req.app.get('io').to(req.params.id).emit('note-updated', {
      roomId: req.params.id,
      noteId: req.params.noteId,
      note
    });

    console.log('Note updated successfully');
    res.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a note from a room
router.delete('/:id/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is the owner
    if (room.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only room owner can delete notes' });
    }

    const note = room.notes.id(req.params.noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    note.remove();
    await room.save();

    // Emit socket event for real-time updates
    req.app.get('io').to(req.params.id).emit('note-deleted', {
      roomId: req.params.id,
      noteId: req.params.noteId
    });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router; 