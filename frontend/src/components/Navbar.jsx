import React from 'react';
import { BasecampIcon, LightIcon, DarkIcon, ProfileIcon } from './Icons';

function Navbar({ theme, toggleTheme, currentUser, onLogout, setCurrentPage }) {
  // Render different actions based on whether user is logged in
  const renderActions = () => {
    if (currentUser) {
      return (
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
            <div className="w-8 rounded-full">
              <ProfileIcon/>
            </div>
          </label>
          <ul tabIndex={0} className="mt-3 z-50 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box whitespace-nowrap">
            <li className="menu-title px-4 py-2">
              Welcome, {currentUser}!
            </li>
            <li><a onClick={() => setCurrentPage('settings')}>Settings</a></li>
            <li><a onClick={onLogout} className="text-error">Logout</a></li>
          </ul>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setCurrentPage('login')} 
          className="btn btn-ghost"
        >
          Log In
        </button>
        <button 
          onClick={() => setCurrentPage('signup')} 
          className="btn btn-primary"
        >
          Sign Up
        </button>
      </div>
    );
  };

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="flex-1">
        <button onClick={() => setCurrentPage('home')} className="btn btn-ghost">
          <BasecampIcon />
          <span className="text-2xl font-bold ml-2">Basecamp</span>
        </button>
      </div>
      <div className="flex-none gap-4">
        {currentUser && (
          <button 
            onClick={() => setCurrentPage('trips')} 
            className="btn btn-ghost"
          >
            My Trips
          </button>
        )}
        <label className="swap swap-rotate">
          <input 
            type="checkbox" 
            onClick={toggleTheme} 
            checked={theme === 'dark'} 
            readOnly 
          />
          <LightIcon />
          <DarkIcon />
        </label>
        {renderActions()}
      </div>
    </div>
  );
}

export default Navbar;