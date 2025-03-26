import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  Heading,
  Text,
  VStack,
  HStack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast({
    position: 'top-right',
    duration: 3000,
    isClosable: true,
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inviteCode, setInviteCode] = useState('');
  const [roomToDelete, setRoomToDelete] = useState(null);
  const socketRef = useRef();
  const apiURL = import.meta.env.VITE_API_URL;
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const cancelRef = useRef();

  useEffect(() => {
    fetchRooms();
    setupSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const setupSocket = () => {
    console.log('Setting up socket connection to:', apiURL);
    socketRef.current = io(apiURL);

    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
      // Join all rooms that the user has access to
      rooms.forEach(room => {
        socketRef.current.emit('join-room', room._id);
        console.log('Joined room:', room._id);
      });
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Listen for user joined events
    socketRef.current.on('user-joined', ({ roomId, userId, username }) => {
      console.log('User joined event received:', { roomId, userId, username });
      // Update the room's member count
      setRooms(prevRooms => {
        console.log('Previous rooms:', prevRooms);
        const updatedRooms = prevRooms.map(room => 
          room._id === roomId 
            ? { ...room, members: [...room.members, { _id: userId, username }] }
            : room
        );
        console.log('Updated rooms:', updatedRooms);
        return updatedRooms;
      });
      toast({
        title: 'New Member Joined',
        description: `${username} has joined a room`,
        status: 'info',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    });

    // Listen for user left events
    socketRef.current.on('user-left', ({ roomId, userId, username }) => {
      console.log('User left event received:', { roomId, userId, username });
      // Update the room's member count
      setRooms(prevRooms => {
        console.log('Previous rooms:', prevRooms);
        const updatedRooms = prevRooms.map(room => 
          room._id === roomId 
            ? { 
                ...room, 
                members: room.members.filter(member => member._id !== userId)
              }
            : room
        );
        console.log('Updated rooms:', updatedRooms);
        return updatedRooms;
      });
      toast({
        title: 'Member Left',
        description: `${username} has left a room`,
        status: 'info',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    });

    // Listen for room deleted events
    socketRef.current.on('room-deleted', ({ roomId }) => {
      console.log('Room deleted event received:', roomId);
      setRooms(prevRooms => {
        console.log('Previous rooms:', prevRooms);
        const updatedRooms = prevRooms.filter(room => room._id !== roomId);
        console.log('Updated rooms:', updatedRooms);
        return updatedRooms;
      });
      toast({
        title: 'Room Deleted',
        description: 'A room has been deleted',
        status: 'info',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    });
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${apiURL}/api/rooms/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
    } catch (error) {
      toast({
        title: 'Error fetching rooms',
        description: error.response?.data?.message || 'Failed to fetch rooms',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${apiURL}/api/rooms`,
        { 
          name: newRoomName, 
          description: newRoomDescription,
          roomId: newRoomId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRooms([...rooms, response.data]);
      // Join the new room via socket
      if (socketRef.current) {
        socketRef.current.emit('join-room', response.data._id);
        console.log('Joined new room:', response.data._id);
      }
      setNewRoomName('');
      setNewRoomDescription('');
      setNewRoomId('');
      toast({
        title: 'Room created successfully',
        status: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error creating room',
        description: error.response?.data?.message || 'Failed to create room',
        status: 'error',
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
      setRooms([...rooms, response.data]);
      // Join the new room via socket
      if (socketRef.current) {
        socketRef.current.emit('join-room', response.data._id);
        console.log('Joined new room:', response.data._id);
      }
      toast({
        title: 'Successfully joined room',
        status: 'success',
      });
      navigate(`/rooms/${response.data._id}`);
      onClose();
      setInviteCode('');
    } catch (error) {
      toast({
        title: 'Error joining room',
        description: error.response?.data?.message || 'Failed to join room',
        status: 'error',
      });
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiURL}/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(rooms.filter(room => room._id !== roomId));
      toast({
        title: 'Room deleted successfully',
        status: 'success',
      });
      onDeleteClose();
    } catch (error) {
      toast({
        title: 'Error deleting room',
        description: error.response?.data?.message || 'Failed to delete room',
        status: 'error',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={8}>
        <Heading>My Rooms</Heading>
        <HStack>
          <Button colorScheme="blue" onClick={onOpen}>
            Join Room
          </Button>
          <Button onClick={handleLogout}>Logout</Button>
        </HStack>
      </HStack>

      <Tabs>
        <TabList>
          <Tab>My Rooms</Tab>
          <Tab>Create New Room</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {rooms.map((room) => (
                <Box
                  key={room._id}
                  p={4}
                  borderWidth={1}
                  borderRadius={8}
                  _hover={{ bg: 'gray.50' }}
                >
                  <VStack align="start" spacing={1}>
                    <HStack justify="space-between" width="100%">
                      <Text
                        fontWeight="bold"
                        cursor="pointer"
                        onClick={() => navigate(`/rooms/${room._id}`)}
                      >
                        {room.name}
                      </Text>
                      <HStack>
                        <Text fontSize="sm" color="gray.500">
                          Room ID: {room.roomId}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          {room.members.length} members
                        </Text>
                        {room.owner._id === user.userId && (
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => {
                              setRoomToDelete(room);
                              onDeleteOpen();
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </HStack>
                    </HStack>
                    <Text color="gray.600">{room.description}</Text>
                    <Text fontSize="sm" color="gray.500">
                      Created by: {room.owner.username}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </TabPanel>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Room Name</FormLabel>
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="Enter room description"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Room ID</FormLabel>
                <Input
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  placeholder="Enter room ID (4-20 characters, letters and numbers only)"
                  maxLength={20}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  This ID will be used by others to join your room
                </Text>
              </FormControl>
              <Button
                colorScheme="blue"
                onClick={handleCreateRoom}
                isDisabled={!newRoomName || !newRoomId}
              >
                Create Room
              </Button>
            </VStack>
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

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
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
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => handleDeleteRoom(roomToDelete._id)}
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

export default RoomList; 