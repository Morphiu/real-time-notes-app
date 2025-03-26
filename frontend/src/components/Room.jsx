import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Heading,
  Text,
  Textarea,
  VStack,
  HStack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
  useDisclosure,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Divider,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Grid,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import RoomNotes from './RoomNotes';
import RoomMembers from './OnlineUsers';

const Room = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast({
    position: 'top-right',
    duration: 3000,
    isClosable: true,
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [room, setRoom] = useState(null);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const socketRef = useRef();
  const apiURL = import.meta.env.VITE_API_URL;

  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  useEffect(() => {
    fetchRoom();
    if (user) {
      setupSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id, user]);

  const setupSocket = () => {
    if (!user || !user.userId) {
      console.log('No user data available for socket setup');
      return;
    }

    const socket = io(apiURL, {
      auth: {
        userId: user.userId,
        username: user.username
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      if (room) {
        socket.emit('join-room', room._id);
      }
    });

    socket.on('user-joined', ({ userId, username }) => {
      console.log('User joined:', { userId, username });
      if (userId !== user.userId) {
        toast({
          title: 'New Member Joined',
          description: `${username} has joined the room`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    });

    socket.on('user-left', ({ userId, username }) => {
      console.log('User left:', { userId, username });
      if (userId !== user.userId) {
        toast({
          title: 'Member Left',
          description: `${username} has left the room`,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    });

    socket.on('note-updated', (data) => {
      console.log('Note updated:', data);
      setRoom(prevRoom => ({
        ...prevRoom,
        notes: prevRoom.notes.map(note =>
          note._id === data.noteId ? { ...note, content: data.content } : note
        )
      }));
    });

    socket.on('note-deleted', ({ noteId }) => {
      console.log('Note deleted:', noteId);
      setRoom(prevRoom => ({
        ...prevRoom,
        notes: prevRoom.notes.filter(note => note._id !== noteId)
      }));
      toast({
        title: 'Note Deleted',
        description: 'A note has been deleted from the room',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    });

    socket.on('room-deleted', ({ roomId }) => {
      console.log('Room deleted:', roomId);
      toast({
        title: 'Room Deleted',
        description: 'This room has been deleted',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  };

  const fetchRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching room with ID:', id);
      console.log('Using token:', token ? 'Token exists' : 'No token found');
      
      const response = await axios.get(`${apiURL}/api/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Room data received:', response.data);
      setRoom(response.data);
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Error fetching room:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to access this room',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/login');
      } else if (error.response?.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'You are not a member of this room',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/rooms');
      } else {
        toast({
          title: 'Error fetching room',
          description: error.response?.data?.message || 'Failed to fetch room',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/rooms');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoteChange = (e) => {
    const newContent = e.target.value;
    setNote(newContent);

    // Emit real-time update
    socketRef.current.emit('note-update', {
      roomId: id,
      content: newContent
    });
  };

  const handleSaveNote = async () => {
    if (!editingNote) {
      console.log('No note is being edited');
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Saving note:', {
        roomId: id,
        noteId: editingNote._id,
        title: newNoteTitle,
        content: newNoteContent
      });

      const response = await axios.put(
        `${apiURL}/api/rooms/${id}/notes/${editingNote._id}`,
        { 
          title: newNoteTitle,
          content: newNoteContent 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Note saved successfully:', response.data);

      // Update the room state with the updated note
      setRoom(prevRoom => {
        if (!prevRoom) return null;
        const updatedNotes = prevRoom.notes.map(n => 
          n._id === editingNote._id ? response.data : n
        );
        return { ...prevRoom, notes: updatedNotes };
      });

      toast({
        title: 'Note updated successfully',
        status: 'success',
      });
      onEditClose();
      setEditingNote(null);
      setNewNoteTitle('');
      setNewNoteContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error updating note',
        description: error.response?.data?.message || 'Failed to update note',
        status: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${apiURL}/api/rooms/${id}/notes`,
        { title: newNoteTitle, content: note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes([...notes, response.data]);
      setNewNoteTitle('');
      setNote('');
      toast({
        title: 'Note created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error creating note',
        description: error.response?.data?.message || 'Failed to create note',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleJoinRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${apiURL}/api/rooms/join/${inviteCode}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: 'Successfully joined room',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate(`/rooms/${response.data._id}`);
      onClose();
    } catch (error) {
      toast({
        title: 'Error joining room',
        description: error.response?.data?.message || 'Failed to join room',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content);
    onEditOpen();
  };

  const handleDeleteNote = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${apiURL}/api/rooms/${id}/notes/${noteToDelete._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Emit note-deleted event
      socketRef.current.emit('note-deleted', {
        roomId: id,
        noteId: noteToDelete._id
      });

      toast({
        title: 'Note deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      setNoteToDelete(null);
    } catch (error) {
      toast({
        title: 'Error deleting note',
        description: error.response?.data?.message || 'Failed to delete note',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${apiURL}/api/rooms/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Emit room-deleted event
      socketRef.current.emit('room-deleted', { roomId: id });

      toast({
        title: 'Room deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/rooms');
    } catch (error) {
      toast({
        title: 'Error deleting room',
        description: error.response?.data?.message || 'Failed to delete room',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleLeaveRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${apiURL}/api/rooms/${id}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Emit user-left event before navigating
      if (socketRef.current) {
        console.log('Emitting user-left event');
        socketRef.current.emit('user-left', {
          roomId: id,
          userId: user.userId,
          username: user.username
        });
      }

      toast({
        title: 'Successfully left room',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/rooms');
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message === 'Room owner cannot leave the room') {
        toast({
          title: 'Cannot Leave Room',
          description: 'As the room owner, you cannot leave the room.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error leaving room',
          description: error.response?.data?.message || 'Failed to leave room',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  if (!room) {
    return <Box>Room not found 😟</Box>;
  }

  const isOwner = room.owner._id === user.userId;

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={8}>
        <VStack align="start" spacing={1}>
          <Heading>{room.name}</Heading>
          <Text color="gray.600">{room.description}</Text>
          <Text fontSize="sm" color="gray.500">
            Owner: {room.owner.username}
          </Text>
          <Box mt={4} width="100%">
            <RoomMembers roomMembers={room.members} />
          </Box>
        </VStack>
        <HStack>
          {isOwner ? (
            <Button colorScheme="red" onClick={onDeleteOpen}>
              Delete Room
            </Button>
          ) : (
            <Button colorScheme="red" onClick={handleLeaveRoom}>
              Leave Room
            </Button>
          )}
          <Button onClick={() => navigate('/rooms')}>Back to Rooms</Button>
        </HStack>
      </HStack>

      <Tabs>
        <TabList>
          <Tab>Current Note</Tab>
          <Tab>All Notes</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Box
              borderWidth={1}
              borderRadius={8}
              p={6}
              bg="white"
              boxShadow="md"
              position="relative"
            >
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Note Title</FormLabel>
                  <Input
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="Enter note title"
                  />
                </FormControl>
                <Textarea
                  value={note}
                  onChange={handleNoteChange}
                  placeholder="Start writing your notes..."
                  size="lg"
                  minH="500px"
                  resize="vertical"
                />
                <HStack>
                  <Button
                    colorScheme="green"
                    onClick={handleSaveNote}
                    isLoading={isSaving}
                    loadingText="Saving..."
                  >
                    Save Note
                  </Button>
                  <Button
                    colorScheme="blue"
                    onClick={handleCreateNote}
                    isDisabled={!newNoteTitle}
                  >
                    Create New Note
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </TabPanel>
          <TabPanel>
            <RoomNotes 
              notes={room.notes} 
              onEdit={handleEditNote}
              onDelete={(note) => {
                setNoteToDelete(note);
                onDeleteOpen();
              }}
              isOwner={isOwner}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Join Room</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Room ID</FormLabel>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter room ID"
                />
              </FormControl>
              <Button
                colorScheme="blue"
                width="100%"
                onClick={handleJoinRoom}
              >
                Join Room
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Note</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Enter note title"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Content</FormLabel>
                <Textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Enter note content"
                  minH="200px"
                />
              </FormControl>
              <Button
                colorScheme="blue"
                width="100%"
                onClick={handleSaveNote}
                isLoading={isSaving}
                isDisabled={!newNoteTitle || !newNoteContent}
              >
                Save Changes
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={useRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Room
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this room? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>Cancel</Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteRoom}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Room; 