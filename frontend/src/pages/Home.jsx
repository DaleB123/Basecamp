import React from 'react';
import { CalendarIcon, VoteIcon, MoneyIcon } from '../components/Icons';
import Navbar from '../components/Navbar';

const HeroImage = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170";

function Home({ setCurrentPage, theme, toggleTheme, currentUser, onLogout }) {
  
  const handleGetStarted = () => {
    // If user is logged in, go to itinerary. If not, go to signup.
    if (currentUser) {
      setCurrentPage('trips');
    } else {
      setCurrentPage('login');
    }
  };
  
  return (
    <div data-theme={theme} className="min-h-screen bg-base-200">
      {/* Navbar */}
      <Navbar 
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onLogout={onLogout}
        setCurrentPage={setCurrentPage}
      />

      {/* Hero Section */}
      <div className="hero min-h-[60vh] bg-base-200" style={{ backgroundImage: 'url('+HeroImage+')' }}>
        <div className="hero-overlay bg-opacity-60"></div>
        <div className="hero-content text-center text-white">
          <div className="max-w-md">
            <h1 className="mb-5 text-5xl font-bold">Plan Together. Go Together.</h1>
            <p className="mb-5 text-lg">The ultimate site for college students to plan group trips without the hassle. Coordinate itineraries, vote on activities, and split expenses, all in one place.</p>
            <button onClick={handleGetStarted} className="btn btn-accent btn-lg">
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Why Basecamp?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card bg-base-100 shadow-xl text-center">
            <div className="card-body items-center">
               <div className="p-4 bg-primary rounded-full text-primary-content">
                 <CalendarIcon />
               </div>
              <h3 className="card-title text-2xl mt-4">Collaborative Itinerary</h3>
              <p>Build your trip's schedule together in real-time. No more messy group chats or conflicting spreadsheets.</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl text-center">
            <div className="card-body items-center">
              <div className="p-4 bg-info rounded-full text-secondary-content">
                <VoteIcon />
              </div>
              <h3 className="card-title text-2xl mt-4">Group Voting</h3>
              <p>Can't decide on a restaurant or an activity? Let the group vote! Settle debates quickly and democratically.</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl text-center">
            <div className="card-body items-center">
               <div className="p-4 bg-success rounded-full text-accent-content">
                 <MoneyIcon />
               </div>
              <h3 className="card-title text-2xl mt-4">Expense Splitting</h3>
              <p>Easily track who paid for what. Settle up at the end of the trip without any awkward conversations.</p>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="footer footer-center p-6 bg-base-300 text-base-content">
        <div>
          <p>Developed by Derrick Ma, Dale Bittner, and Christopher Webb</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;