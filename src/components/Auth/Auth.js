import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

function Auth({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLoginSuccess = (token) => {
    localStorage.setItem('token', token);
    onLogin();
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
  };

  return (
    <div>
      {isRegistering ? (
        <Register onRegisterSuccess={toggleMode} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      <button onClick={toggleMode}>
        {isRegistering ? 'Switch to Login' : 'Switch to Register'}
      </button>
    </div>
  );
}

export default Auth;
