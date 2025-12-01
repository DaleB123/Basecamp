import React, { useState, useEffect } from 'react';
import moment from 'moment';

const EventModal = ({ isOpen, onClose, onCreate, onSave, onDelete, eventInfo, tripMembers, currentID }) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [details, setDetails] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('');
  const [displayCost, setDisplayCost] = useState('');
  const [costAssignments, setCostAssignments] = useState({});

  useEffect(() => {
    if (eventInfo) {
      setTitle(eventInfo.title || '');
      setStartTime(eventInfo.start ? moment(eventInfo.start).format('HH:mm') : '12:00');
      setEndTime(eventInfo.end ? moment(eventInfo.end).format('HH:mm') : '13:00');
      setDetails(eventInfo.details || '');
      setType(eventInfo.type || '');
      setLocation(eventInfo.location || '');
      const costValue = eventInfo.cost !== undefined ? eventInfo.cost : 0;
      setCost(costValue);
      setDisplayCost(costValue.toFixed(2));
      
      // Initialize cost assignments from costAssignments field
      if (eventInfo.costAssignments) {
        setCostAssignments(eventInfo.costAssignments);
      } else {
        // Default: assign to creator only
        const defaultAssignments = {};
        tripMembers.forEach(member => {
          defaultAssignments[member._id] = member._id === currentID;
        });
        setCostAssignments(defaultAssignments);
      }
    } else {
      setTitle('');
      setStartTime('12:00');
      setEndTime('13:00');
      setDetails('');
      setType('');
      setLocation('');
      setCost(0);
      setDisplayCost('0.00');
      
      // Default: assign to creator only
      const defaultAssignments = {};
      tripMembers.forEach(member => {
        defaultAssignments[member._id] = member._id === currentID;
      });
      setCostAssignments(defaultAssignments);
    }
  }, [eventInfo, isOpen, tripMembers, currentID]);

  const handleCostAssignmentToggle = (memberId) => {
    setCostAssignments(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = {};
    tripMembers.forEach(member => {
      allSelected[member._id] = true;
    });
    setCostAssignments(allSelected);
  };

  const handleDeselectAll = () => {
    const allDeselected = {};
    tripMembers.forEach(member => {
      allDeselected[member._id] = false;
    });
    setCostAssignments(allDeselected);
  };

  const getAssignedCount = () => {
    return Object.values(costAssignments).filter(assigned => assigned).length;
  };

  const getCostPerPerson = () => {
    const assignedCount = getAssignedCount();
    if (assignedCount === 0) return 0;
    return parseFloat(cost) / assignedCount;
  };

  const handleCreate = () => {
    if (!title) {
      alert("Please enter a title.");
      return;
    }
    if (moment(endTime, 'HH:mm').isSameOrBefore(moment(startTime, 'HH:mm'))) {
      alert("End time must be after start time.");
      return;
    }
    if (!type) {
      alert("Please select an event type.");
      return;
    }
    if (getAssignedCount() === 0 && parseFloat(cost) > 0) {
      alert("Please assign the cost to at least one person.");
      return;
    }

    const date = moment(eventInfo.start).format('YYYY-MM-DD');
    const start = moment(`${date} ${startTime}`).toDate();
    const end = moment(`${date} ${endTime}`).toDate();

    // Initialize payments based on cost assignments (all start as unpaid/false)
    const initialPayments = {};
    Object.keys(costAssignments).forEach(memberId => {
      if (costAssignments[memberId]) {
        initialPayments[memberId] = false;
      }
    });

    onCreate({ 
      ...eventInfo,
      title,
      start,
      end,
      type,
      location,
      cost: parseFloat(cost) || 0,
      costAssignments,
      payments: initialPayments,
      details
    });
  };

  const handleSave = () => {
    if (!title) {
      alert("Please enter a title.");
      return;
    }
    if (moment(endTime, 'HH:mm').isSameOrBefore(moment(startTime, 'HH:mm'))) {
      alert("End time must be after start time.");
      return;
    }
    if (!type) {
      alert("Please select an event type.");
      return;
    }
    if (getAssignedCount() === 0 && parseFloat(cost) > 0) {
      alert("Please assign the cost to at least one person.");
      return;
    }

    const date = moment(eventInfo.start).format('YYYY-MM-DD');
    const start = moment(`${date} ${startTime}`).toDate();
    const end = moment(`${date} ${endTime}`).toDate();

    // Update payments: add new assignees as unpaid, keep existing payment status
    const updatedPayments = { ...eventInfo.payments };
    Object.keys(costAssignments).forEach(memberId => {
      if (costAssignments[memberId]) {
        // If newly assigned, set to unpaid; otherwise keep existing status
        if (updatedPayments[memberId] === undefined) {
          updatedPayments[memberId] = false;
        }
      } else {
        // If unassigned, remove from payments
        delete updatedPayments[memberId];
      }
    });

    onSave({
      ...eventInfo,
      title,
      start,
      end,
      type,
      location,
      cost: parseFloat(cost) || 0,
      costAssignments,
      payments: updatedPayments,
      details
    });
  };

  if (!isOpen) return null;

  const eventDate = moment(eventInfo.start).format('dddd, MMMM D, YYYY');
  const assignedCount = getAssignedCount();
  const costPerPerson = getCostPerPerson();

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          {eventInfo?._id ? 'Edit Event' : 'Add New Event'}
        </h3>
        <p className="text-base-content/70 mb-4">{eventDate}</p>
        
        <div className="form-control w-full py-4">
          <label className="label">
            <span className="label-text">Event Title</span>
          </label>
          <input 
            type="text" 
            placeholder="Enter event title" 
            className="input input-bordered w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Start Time</span>
            </label>
            <input 
              type="time" 
              className="input input-bordered w-full"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">End Time</span>
            </label>
            <input 
              type="time" 
              className="input input-bordered w-full"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-control w-full mt-4">
          <label className="label"><span className="label-text">Event Type</span></label>
          <select 
            className={`select select-bordered w-full ${!type && 'text-gray-400'}`}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option className="text-gray-400" value="" disabled>Select event type</option>
            <option value="Flight">Flight</option>
            <option value="Hotel">Hotel</option>
            <option value="Food">Food</option>
            <option value="Activity">Activity</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-control w-full mt-4">
          <label className="label">
            <span className="label-text">Location</span>
          </label>
          <input 
            type="text" 
            placeholder="Enter location" 
            className="input input-bordered w-full"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="form-control w-full mt-4">
          <label className="label">
            <span className="label-text">Cost</span>
          </label>
          <input 
            type="text"
            inputMode="numeric"
            placeholder="0.00"
            className="input input-bordered w-full"
            value={"$ "+displayCost}
            onChange={(e) => {
              const input = e.target.value.replace(/\D/g, '');
              
              if (input === '') {
                setDisplayCost('0.00');
                setCost(0);
                return;
              }
              
              const cents = parseInt(input);
              const dollars = cents / 100;
              
              const formatted = dollars.toFixed(2);
              setDisplayCost(formatted);
              setCost(dollars);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault();
                const currentCents = Math.round(cost * 100);
                const newCents = Math.floor(currentCents / 10);
                const newDollars = newCents / 100;
                setDisplayCost(newDollars.toFixed(2));
                setCost(newDollars);
              }
            }}
          />
        </div>

        {parseFloat(cost) > 0 && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <label className="label">
                <span className="label-text font-semibold">Assign Cost To:</span>
              </label>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleSelectAll}
                  className="btn btn-xs btn-primary"
                >
                  Select All
                </button>
                <button 
                  type="button"
                  onClick={handleDeselectAll}
                  className="btn btn-xs btn-outline"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {tripMembers.map(member => (
                <div key={member._id} className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary"
                      checked={costAssignments[member._id] || false}
                      onChange={() => handleCostAssignmentToggle(member._id)}
                    />
                    <span className="label-text">{member.username}</span>
                  </label>
                </div>
              ))}
            </div>
            
            {assignedCount > 0 && (
              <div className="alert alert-info mt-3">
                <div className="text-sm">
                  <p className="font-semibold">Cost per person: ${costPerPerson.toFixed(2)}</p>
                  <p className="text-xs mt-1">Split among {assignedCount} {assignedCount === 1 ? 'person' : 'people'}</p>
                </div>
              </div>
            )}
            
            {assignedCount === 0 && (
              <div className="alert alert-warning mt-3">
                <span className="text-xs">Please select at least one person</span>
              </div>
            )}
          </div>
        )}

        <div className="form-control w-full mt-4">
          <label className="label">
            <span className="label-text">Details</span>
          </label>
          <textarea 
            className="textarea textarea-bordered w-full" 
            placeholder="Enter event details/description"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn">Cancel</button>
          {eventInfo?._id ? (
            <>
              <button onClick={() => onDelete(eventInfo._id)} className="btn btn-error">
                Delete
              </button>
              <button onClick={handleSave} className="btn btn-primary">
                Save
              </button>
            </>
          ) : (
            <button onClick={handleCreate} className="btn btn-primary">Add</button>
          )}
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
};

export default EventModal;