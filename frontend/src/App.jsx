/**
 * Main App Component - Root component managing routing and global state
 * Handles: Navigation, Authentication, Theme, Trip Selection
 * Persists state to localStorage for session continuity
 */

import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Itinerary from './pages/Itinerary';
import Trips from './pages/Trips';
import Settings from './pages/Settings';

function App() {
  // Navigation state - tracks which page to display
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || 'home';
  });  
  
  // Authentication state - stores logged-in username
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('currentUser') || null;
  });  
  
  // Theme state - 'light' or 'dark' mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  // User ID state - MongoDB ObjectId for the logged-in user
  const [currentID, setCurrentID] = useState(() => {
    return localStorage.getItem('currentID') || null;
  });

  // Current trip state - stores selected trip details for itinerary view
  const [currentTrip, setCurrentTrip] = useState(() => {
    const savedTrip = localStorage.getItem('currentTrip');
    return savedTrip ? JSON.parse(savedTrip) : null;
  });

  // Persist theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Persist current page for navigation continuity
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);
  
  // Persist/clear user authentication state
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', currentUser);
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);
  
  // Persist/clear user ID state
  useEffect(() => {
    if (currentID) {
      localStorage.setItem('currentID', currentID);
    } else {
      localStorage.removeItem('currentID');
    }
  }, [currentID]);

  // Persist/clear selected trip state
  useEffect(() => {
    if (currentTrip) {
      localStorage.setItem('currentTrip', JSON.stringify(currentTrip));
    } else {
      localStorage.removeItem('currentTrip');
    }
  }, [currentTrip]);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Handle user logout - clear all session data and return to home
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      setCurrentUser(null);
      setCurrentID(null);
      setCurrentTrip(null);
      setCurrentPage('home');
    }
  };

  // ========================================================================
  // ROUTING - Render appropriate page component based on currentPage state
  // ========================================================================

  if (currentPage === 'login') {
    return (
      <Login 
        setCurrentPage={setCurrentPage} 
        theme={theme} 
        setCurrentID={setCurrentID} 
        setCurrentUser={setCurrentUser}
      />
    );
  }
  
  if (currentPage === 'signup') {
    return (
      <Signup 
        setCurrentPage={setCurrentPage} 
        setCurrentUser={setCurrentUser}
        setCurrentID={setCurrentID}
        theme={theme} 
      />
    );
  }
  
  if (currentPage === 'trips') {
    return (
      <Trips 
        setCurrentPage={setCurrentPage}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        currentID={currentID}
        onLogout={handleLogout}
        setCurrentTrip={setCurrentTrip}
      />
    );
  }
  
  if (currentPage === 'itinerary') {
    return (
      <Itinerary 
        setCurrentPage={setCurrentPage} 
        currentTrip={currentTrip}
        theme={theme} 
        toggleTheme={toggleTheme} 
        currentUser={currentUser} 
        currentID={currentID}
        onLogout={handleLogout} 
      />
    );
  }
  
  if (currentPage === 'settings') {
    return (
      <Settings
        setCurrentPage={setCurrentPage}
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onLogout={handleLogout}
      />
    );
  }
  
  return (
    <Home 
      setCurrentPage={setCurrentPage} 
      theme={theme} 
      toggleTheme={toggleTheme}
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;