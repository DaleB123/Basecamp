/**
 * TripManagementModal Component - Edit trip details and manage trip duration
 * Features: Edit name/description, add/remove days from start/end, delete trip
 * Owner-only modal for trip configuration and management
 */

import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from './Icons';
import moment from 'moment';

const TripManagementModal = ({ isOpen, onClose, currentTrip, events, onSaveChanges, onDeleteTrip }) => {
  // Trip detail states
  const [tripName, setTripName] = useState('');  // Editable trip name
  const [tripDescription, setTripDescription] = useState('');  // Editable description
  const [tempStartDate, setTempStartDate] = useState('');  // Working copy of start date
  const [tempEndDate, setTempEndDate] = useState('');  // Working copy of end date

  useEffect(() => {
    if (currentTrip) {
      setTripName(currentTrip.name || '');
      setTripDescription(currentTrip.description || '');
      setTempStartDate(currentTrip.start);
      setTempEndDate(currentTrip.end);
    }
  }, [currentTrip, isOpen]);

  if (!isOpen) return null;

  // Calculate trip duration for display
  const tripStart = moment(tempStartDate);
  const tripEnd = moment(tempEndDate);
  const duration = tripEnd.diff(tripStart, 'days') + 1;
  
  // Add a day to the start or end of the trip
  const handleAddDay = (position) => {
    if (position === 'start') {
      setTempStartDate(moment(tempStartDate).subtract(1, 'day').format('YYYY-MM-DD'));
    } else {
      setTempEndDate(moment(tempEndDate).add(1, 'day').format('YYYY-MM-DD'));
    }
  };

  // Remove a day from the start or end (with event conflict warning)
  const handleRemoveDay = (position) => {
    if (duration <= 1) return;  // Must have at least 1 day
    
    if (position === 'start') {
      const dateToRemove = moment(tempStartDate);
      const eventsOnDay = events.filter(e => 
        moment(e.start).format('YYYY-MM-DD') === dateToRemove.format('YYYY-MM-DD')
      );
      
      if (eventsOnDay.length > 0 && 
          !window.confirm(`This will delete ${eventsOnDay.length} event(s) on ${dateToRemove.format('MMM D, YYYY')} when you save. Continue?`)) {
        return;
      }
      
      setTempStartDate(moment(tempStartDate).add(1, 'day').format('YYYY-MM-DD'));
    } else {
      const dateToRemove = moment(tempEndDate);
      const eventsOnDay = events.filter(e => 
        moment(e.start).format('YYYY-MM-DD') === dateToRemove.format('YYYY-MM-DD')
      );
      
      if (eventsOnDay.length > 0 && 
          !window.confirm(`This will delete ${eventsOnDay.length} event(s) on ${dateToRemove.format('MMM D, YYYY')} when you save. Continue?`)) {
        return;
      }
      
      setTempEndDate(moment(tempEndDate).subtract(1, 'day').format('YYYY-MM-DD'));
    }
  };
  
  // Save trip changes and close modal
  const handleSave = () => {
    // Validation: trip name is required
    if (!tripName.trim()) {
      alert("Trip name is required.");
      return;
    }
    
    // Pass updated trip data to parent component
    onSaveChanges({
      ...currentTrip,
      name: tripName,
      description: tripDescription,
      start: tempStartDate,
      end: tempEndDate
    });
    onClose();
  };

  // Cancel changes and revert to original values
  const handleCancel = () => {
    setTripName(currentTrip.name || '');
    setTripDescription(currentTrip.description || '');
    setTempStartDate(currentTrip.start);
    setTempEndDate(currentTrip.end);
    onClose();
  };

  // Delete the entire trip with confirmation
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${currentTrip.name}"? This will permanently delete all events in this trip.`)) {
      onDeleteTrip(currentTrip._id);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Manage Trip</h3>
        
        <div className="space-y-4">
          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Trip Details</h4>
            
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Trip Name</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter trip name" 
                className="input input-bordered w-full"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea 
                className="textarea textarea-bordered w-full" 
                placeholder="Enter trip description"
                value={tripDescription}
                onChange={(e) => setTripDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Trip Duration</h4>
            <p className="text-2xl font-bold">{duration} days</p>
            <p className="text-sm text-base-content/70 mt-2">
              {tripStart.format('MMM D, YYYY')} - {tripEnd.format('MMM D, YYYY')}
            </p>
          </div>

          <div className="divider">Adjust Days</div>

          <div className="flex gap-4">
            <button 
              onClick={() => handleAddDay('start')}
              className="btn btn-outline flex-1"
            >
              <PlusIcon size={16}/>
              Add Day at Start
            </button>
            <button 
              onClick={() => handleAddDay('end')}
              className="btn btn-outline flex-1"
            >
              <PlusIcon size={16}/>
              Add Day at End
            </button>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => handleRemoveDay('start')}
              className="btn btn-outline btn-error flex-1"
              disabled={duration <= 1}
            >
              <TrashIcon size={16}/>
              Remove from Start
            </button>
            <button 
              onClick={() => handleRemoveDay('end')}
              className="btn btn-outline btn-error flex-1"
              disabled={duration <= 1}
            >
              <TrashIcon size={16}/>
              Remove from End
            </button>
          </div>

          {duration <= 1 && (
            <div className="alert alert-warning">
              <span className="text-sm">Trip must have at least 1 day</span>
            </div>
          )}

          <button 
            onClick={handleDelete}
            className="btn btn-error w-full"
          >
            <TrashIcon size={16} />
            Delete Trip
          </button>
        </div>

        <div className="modal-action">
          <button onClick={handleCancel} className="btn">Cancel</button>
          <button onClick={handleSave} className="btn btn-primary">Save</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={handleCancel}></div>
    </dialog>
  );
};

export default TripManagementModal;