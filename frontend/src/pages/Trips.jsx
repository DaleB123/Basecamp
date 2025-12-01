/**
 * Trips Page - View and manage all trips (owned and shared)
 * Features: Trip creation, trip deletion (owned only), invitation management
 * Displays: "My Trips" (owned) and "Shared With Me" sections separately
 */

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { TrashIcon } from '../components/Icons';

// Helper function to format dates for display (compensates for timezone offset)
const formatDisplayDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Add one day to compensate for timezone offset
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString();
};

function Trips({ setCurrentPage, theme, toggleTheme, currentUser, currentID, onLogout, setCurrentTrip }) {
  // Data states
  const [trips, setTrips] = useState([]);  // All trips (owned + shared)
  const [invitations, setInvitations] = useState([]);  // Pending trip invitations
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI states
  const [isModalOpen, setIsModalOpen] = useState(false);  // Create trip modal
  const [isDeleteMode, setIsDeleteMode] = useState(false);  // Delete mode toggle
  
  // New trip form data
  const [newTrip, setNewTrip] = useState({
    name: '',
    start: '',
    end: '',
    description: ''
  });

  const url = "http://localhost:8000";

  // Separate trips into owned and shared for organized display
  const myTrips = trips.filter(trip => trip.owner === currentID);
  const sharedTrips = trips.filter(trip => trip.owner !== currentID && trip.members.includes(currentID));

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await fetch(url+'/calendars/users/'+currentID, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setTrips(data.calendars);
          setError(null);
        } else {
          setError(data.message);
          setTrips([]);
        }
      } catch (err) {
        setError('Failed to fetch trips');
        setTrips([]);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchInvitations = async () => {
      try {
        const response = await fetch(url+'/invitations/'+currentID, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setInvitations(data.invitations);
        } else {
          setInvitations([]);
        }
      } catch (err) {
        console.error('Failed to fetch invitations:', err);
        setInvitations([]);
      }
    };

    if (currentUser) {
      fetchTrips();
      fetchInvitations();
    }
  }, [currentUser, currentID, url]);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    
    try {
      console.log({ ...newTrip, owner: currentID, members: [currentID] });
      const response = await fetch(url+'/calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTrip,
          owner: currentID,
          members: [currentID]
        })
      });

      const data = await response.json();

      if (data.success) {
        setTrips(prev => [...prev, data.calendar]);
        setNewTrip({
          name: '',
          start: '',
          end: '',
          description: ''
        });
        setIsModalOpen(false);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create trip');
    }
  };

  const handleAcceptInvitation = async (invitationId, tripId) => {
    try {
      const response = await fetch(url+'/invitations/'+invitationId+'/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
        
        // Fetch the trip and add it to the trips list
        const tripResponse = await fetch(url+'/calendars/users/'+currentID, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const tripData = await tripResponse.json();
        if (tripData.success) {
          setTrips(tripData.calendars);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      const response = await fetch(url+'/invitations/'+invitationId+'/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv._id !== invitationId));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to reject invitation');
    }
  };

  const handleDeleteTrip = async (tripId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) return;

    try {
      const response = await fetch(url + '/calendars/' + tripId, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setTrips(prev => prev.filter(trip => trip._id !== tripId));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to delete trip');
    }
  };

  const TripCard = ({ trip, allowDelete = false }) => (
    <div 
      key={trip._id} 
      className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer ${isDeleteMode && allowDelete ? 'ring-2 ring-error' : ''}`} 
      onClick={(e) => {
        if (isDeleteMode && allowDelete) {
          handleDeleteTrip(trip._id, e);
        } else if (!isDeleteMode) {
          setCurrentTrip({
            _id: trip._id,
            name: trip.name,
            start: trip.start,
            end: trip.end,
            description: trip.description,
            owner: trip.owner,
            members: trip.members
          });
          setCurrentPage('itinerary');
        }
      }}
    >
      <div className="card-body p-8">
        <h2 className="card-title text-xl mb-3">{trip.name}</h2>
        <p className="text-sm text-base-content/70 mb-4">
          {formatDisplayDate(trip.start)} - {formatDisplayDate(trip.end)}
        </p>
        <p className="line-clamp-2 text-base-content/80">{trip.description}</p>
      </div>
    </div>
  );

  const InvitationCard = ({ invitation }) => (
    <div className="card bg-base-100 shadow-xl border-2 border-primary">
      <div className="card-body p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="card-title text-lg mb-2">{invitation.trip_name}</h3>
            <p className="text-sm text-base-content/70 mb-2">
              {formatDisplayDate(invitation.trip_start)} - {formatDisplayDate(invitation.trip_end)}
            </p>
            <p className="text-sm text-base-content/60">
              Invited by <span className="font-semibold">{invitation.inviter_username}</span>
            </p>
          </div>
        </div>
        <div className="card-actions justify-end mt-4">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleRejectInvitation(invitation._id);
            }}
            className="btn btn-ghost btn-sm"
          >
            Reject
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleAcceptInvitation(invitation._id, invitation.trip_id);
            }}
            className="btn btn-primary btn-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200">
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onLogout={onLogout}
        setCurrentPage={setCurrentPage}
      />
      
      {/* Create Trip Modal */}
      <dialog id="create_trip_modal" className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create New Trip</h3>
          <form onSubmit={handleCreateTrip}>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Trip Name</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter trip name" 
                className="input input-bordered w-full" 
                value={newTrip.name}
                onChange={(e) => setNewTrip(prev => ({...prev, name: e.target.value}))}
                required
              />
            </div>

            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full" 
                value={newTrip.start}
                onChange={(e) => setNewTrip(prev => ({...prev, start: e.target.value}))}
                required
              />
            </div>

            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full" 
                value={newTrip.end}
                onChange={(e) => setNewTrip(prev => ({...prev, end: e.target.value}))}
                required
              />
            </div>

            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea 
                className="textarea textarea-bordered w-full" 
                placeholder="Enter trip description"
                value={newTrip.description}
                onChange={(e) => setNewTrip(prev => ({...prev, description: e.target.value}))}
              />
            </div>

            <div className="modal-action">
              <button type="submit" className="btn btn-primary">Create</button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)} />
      </dialog>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-base-content">My Trips</h1>
          <div className="flex gap-4 items-center">
            {myTrips.length > 0 && (
              <button
                onClick={() => setIsDeleteMode(!isDeleteMode)}
                className={`btn btn-circle ${isDeleteMode ? 'btn-error' : 'btn-ghost'}`}
                title={isDeleteMode ? "Done deleting" : "Delete trips"}
              >
                <TrashIcon />
              </button>
            )}
            {trips.length > 0 ? (
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="btn btn-primary btn-lg"
              >
                + Create New Trip
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error max-w-2xl mx-auto my-8">
            <span>{error}</span>
          </div>
        ) : trips.length === 0 && invitations.length === 0 ? (
          <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto my-16">
            <div className="card-body text-center py-16">
              <h2 className="card-title justify-center text-2xl mb-4">No trips yet!</h2>
              <p className="text-lg mb-8 text-base-content/70">Create your first trip to get started planning your adventures.</p>
              <div className="card-actions justify-center">
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="btn btn-primary btn-lg"
                >
                  + Create Trip
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-base-content mb-6">
                  Pending Invitations
                  <span className="ml-3 badge badge-primary badge-lg">{invitations.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {invitations.map((invitation) => (
                    <InvitationCard key={invitation._id} invitation={invitation} />
                  ))}
                </div>
              </div>
            )}

            {/* My Trips Section */}
            <div>
              <h2 className="text-2xl font-bold text-base-content mb-6">My Trips</h2>
              {myTrips.length === 0 ? (
                <div className="card bg-base-100 shadow-md">
                  <div className="card-body text-center py-8">
                    <p className="text-base-content/70">You haven't created any trips yet.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {myTrips.map((trip) => (
                    <TripCard key={trip._id} trip={trip} allowDelete={true} />
                  ))}
                </div>
              )}
            </div>

            {/* Shared With Me Section */}
            <div>
              <h2 className="text-2xl font-bold text-base-content mb-6">Shared With Me</h2>
              {sharedTrips.length === 0 ? (
                <div className="card bg-base-100 shadow-md">
                  <div className="card-body text-center py-8">
                    <p className="text-base-content/70">No trips have been shared with you yet.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sharedTrips.map((trip) => (
                    <TripCard key={trip._id} trip={trip} allowDelete={false} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Trips;