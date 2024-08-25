import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Add token to all requests
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  register: (userData) => axios.post(`${API_URL}/auth/register`, userData),
  login: (credentials) => axios.post(`${API_URL}/auth/login`, credentials),

  // Game
  getGames: () => axios.get(`${API_URL}/game`),
  createGame: (gameData) => axios.post(`${API_URL}/game`, gameData),
  getGame: (gameId) => axios.get(`${API_URL}/game/${gameId}`),
  joinGame: (gameId, userId) => axios.post(`${API_URL}/game/${gameId}/join`, { userId }),
  makeMove: (gameId, move) => axios.post(`${API_URL}/game/${gameId}/move`, move),
};