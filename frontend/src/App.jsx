import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import RoomList from './components/RoomList';
import Room from './components/Room';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Box>Loading...</Box>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Router>
          <Box minH="100vh" bg="gray.50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/rooms"
                element={
                  <PrivateRoute>
                    <RoomList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rooms/:id"
                element={
                  <PrivateRoute>
                    <Room />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/rooms" />} />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
};

export default App; 