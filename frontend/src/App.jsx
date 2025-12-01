import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Itinerary from './pages/Itinerary';
import Trips from './pages/Trips';
import Settings from './pages/Settings';

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || 'home';
  });  
  
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('currentUser') || null;
  });  
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  const [currentID, setCurrentID] = useState(() => {
    return localStorage.getItem('currentID') || null;
  });

  const [currentTrip, setCurrentTrip] = useState(() => {
    const savedTrip = localStorage.getItem('currentTrip');
    return savedTrip ? JSON.parse(savedTrip) : null;
  });


  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);
  
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', currentUser);
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);
  
  useEffect(() => {
    if (currentID) {
      localStorage.setItem('currentID', currentID);
    } else {
      localStorage.removeItem('currentID');
    }
  }, [currentID]);

  useEffect(() => {
    if (currentTrip) {
      localStorage.setItem('currentTrip', JSON.stringify(currentTrip));
    } else {
      localStorage.removeItem('currentTrip');
    }
  }, [currentTrip]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      setCurrentUser(null);
      setCurrentID(null);
      setCurrentTrip(null);
      setCurrentPage('home');
    }
  };

  // Decides which page to display
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