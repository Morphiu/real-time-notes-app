import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  useColorModeValue,
  IconButton,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';

const RoomNotes = ({ notes, onEdit, onDelete, isOwner }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  if (!notes || notes.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Text color="gray.500">No notes available in this room.</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {notes.map((note) => (
        <Box
          key={note._id}
          p={4}
          bg={bgColor}
          borderWidth={1}
          borderColor={borderColor}
          borderRadius="md"
          boxShadow="sm"
        >
          <VStack align="start" spacing={2}>
            <HStack justify="space-between" width="100%">
              <Text fontWeight="bold">{note.title || 'Untitled Note'}</Text>
              <HStack>
                <Badge colorScheme="blue">
                  {new Date(note.lastUpdated).toLocaleDateString()}
                </Badge>
                <IconButton
                  icon={<EditIcon />}
                  size="sm"
                  onClick={() => onEdit(note)}
                  aria-label="Edit note"
                />
                {isOwner && (
                  <IconButton
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => onDelete(note)}
                    aria-label="Delete note"
                  />
                )}
              </HStack>
            </HStack>
            <Divider />
            <Text whiteSpace="pre-wrap">{note.content}</Text>
            <HStack spacing={2}>
              <Text fontSize="sm" color="gray.500">
                Last updated by: {note.updatedBy.username}
              </Text>
            </HStack>
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};

export default RoomNotes; 