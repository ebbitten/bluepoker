import React from 'react';
import { Link } from 'react-router-dom';

function Header({ isAuthenticated }) {
  return (
    <header>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/lobby">Lobby</Link></li>
          {!isAuthenticated && (
            <>
              <li><Link to="/auth">Login</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}

export default Header;
