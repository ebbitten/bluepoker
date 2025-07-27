import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import Auth from './components/Auth/Auth';
import Header from './components/Layout/Header';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token }
      });
      newSocket.on('connect', () => {
        setIsAuthenticated(true);
        setSocket(newSocket);
      });
      newSocket.on('unauthorized', () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setSocket(null);
      });
      return () => newSocket.close();
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    window.location.reload(); // Reload to establish socket connection with token
  };

  return (
    <Router>
      <Header isAuthenticated={isAuthenticated} />
      <Routes>
        <Route path="/" element={<Navigate to="/lobby" />} />
        <Route path="/lobby" element={<Lobby socket={socket} isAuthenticated={isAuthenticated} />} />
        <Route 
          path="/game/:id" 
          element={
            isAuthenticated ? 
            <GameRoom socket={socket} /> : 
            <Navigate to="/auth" />
          } 
        />
        <Route path="/auth" element={<Auth onLogin={handleLogin} />} />
      </Routes>
    </Router>
  );
}

export default App;