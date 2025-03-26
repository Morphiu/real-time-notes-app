import React from 'react';
import {
  Box,
  Text,
  HStack,
  Avatar,
  Tooltip,
  Divider,
} from '@chakra-ui/react';

const RoomMembers = ({ roomMembers }) => {
  return (
    <Box p={3} borderWidth={1} borderRadius={8} bg="white" boxShadow="sm">
      <Text fontWeight="semibold" fontSize="sm" mb={2}>Room Members</Text>
      <Divider mb={2} />
      <Box overflowX="auto" css={{
        '&::-webkit-scrollbar': {
          height: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
      }}>
        <HStack spacing={4} py={1} minW="min-content">
          {roomMembers.map((member) => {
            if (!member || !member._id) {
              console.warn('Invalid member:', member);
              return null;
            }

            return (
              <Tooltip 
                key={member._id} 
                label={member.username}
                placement="top"
              >
                <HStack spacing={2} minW="fit-content">
                  <Avatar size="xs" name={member.username} />
                  <Text fontSize="sm">{member.username}</Text>
                </HStack>
              </Tooltip>
            );
          })}
        </HStack>
      </Box>
    </Box>
  );
};

export default RoomMembers; 