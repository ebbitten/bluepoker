import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock login - accept any non-empty username and password
    if (credentials.username && credentials.password) {
      console.log('Login successful', credentials);
      // Store user info in localStorage (not secure, but okay for testing)
      localStorage.setItem('user', JSON.stringify({ id: 1, username: credentials.username }));
      localStorage.setItem('token', 'mock-jwt-token');
      // Redirect to lobby
      navigate('/lobby');
    } else {
      alert('Please enter both username and password');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Username" onChange={handleChange} />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;