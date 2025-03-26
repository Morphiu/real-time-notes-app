# Real-Time Notes Application

A collaborative note-taking application that allows users to create, edit, and share notes in real-time with other users. Built with React, Node.js, Express, and Socket.IO.

## Features

- 🔐 User Authentication
- 📝 Real-time note creation and editing
- 👥 Room-based collaboration
- 🔄 Live updates for all users in a room
- 🎨 Modern UI with Chakra UI
- 🔔 Real-time notifications for user join/leave events
- 📱 Responsive design

## Tech Stack

### Frontend
- React.js
- Chakra UI for components
- Socket.IO Client for real-time communication
- React Router for navigation
- Axios for API requests

### Backend
- Node.js
- Express.js
- Socket.IO for real-time features
- MongoDB with Mongoose
- JWT for authentication

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/morphiu/real-time-notes.git
cd real-time-notes
```

2. Install dependencies for both frontend and backend:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd frontend
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

4. Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Features in Detail

### Authentication
- User registration and login
- JWT-based authentication
- Protected routes and API endpoints

### Rooms
- Create new rooms
- Join existing rooms using invite codes
- Real-time member list updates
- Room owner privileges (delete room, manage notes)

### Notes
- Create new notes with title and content
- Edit existing notes in real-time
- Delete notes (room owner only)
- Real-time updates for all users in the room

### Real-time Features
- Live note updates
- User join/leave notifications
- Room deletion notifications
- Note deletion notifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Rooms
- `GET /api/rooms` - Get all rooms for current user
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/join/:inviteCode` - Join a room
- `POST /api/rooms/:id/leave` - Leave a room
- `DELETE /api/rooms/:id` - Delete a room (owner only)

### Notes
- `GET /api/rooms/:id/notes` - Get all notes in a room
- `POST /api/rooms/:id/notes` - Create a new note
- `PUT /api/rooms/:id/notes/:noteId` - Update a note
- `DELETE /api/rooms/:id/notes/:noteId` - Delete a note

## Socket Events

### Client to Server
- `join-room` - Join a room
- `note-update` - Update a note
- `note-deleted` - Delete a note
- `room-deleted` - Delete a room
- `user-left` - User leaves a room

### Server to Client
- `user-joined` - New user joins the room
- `user-left` - User leaves the room
- `note-updated` - Note has been updated
- `note-deleted` - Note has been deleted
- `room-deleted` - Room has been deleted

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Chakra UI for the beautiful component library
- Socket.IO for real-time functionality
- MongoDB for the database
- React and Node.js communities for their excellent tools and documentation 