import React, { useState, useEffect } from 'react';
import { PlusIcon, CheckIcon } from '../components/Icons';
import Navbar from '../components/Navbar';
import EventModal from '../components/EventModal';
import VotingModal from '../components/VotingModal';
import MembersModal from '../components/MembersModal';
import TripManagementModal from '../components/TripManagementModal';
import CostTrackingModal from '../components/CostTrackingModal';
import PackingListModal from '../components/PackingListModal';
import { getEventIcon, getEventColor, getConflictingEvents, getLeadingEvent, getConflictGroups } from '../utils/eventUtils';
import moment from 'moment';

function Itinerary({ setCurrentPage, theme, toggleTheme, currentUser, currentID, currentTrip, onLogout }) {
  const [events, setEvents] = useState([]);
  const [tripMembers, setTripMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showPackingListModal, setShowPackingListModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conflictGroups, setConflictGroups] = useState([]);
  const [localTrip, setLocalTrip] = useState(currentTrip);

  const url = "http://localhost:8000";
  const isOwner = localTrip?.owner === currentID;

  useEffect(() => {
    setLocalTrip(currentTrip);
  }, [currentTrip]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch events
        const eventsResponse = await fetch(url + "/events/trip/" + localTrip._id, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const eventsData = await eventsResponse.json();
        
        if (eventsData.success) {
          const sortedEvents = eventsData.events
            .map(event => ({
              ...event,
              start: new Date(event.start),
              end: new Date(event.end),
              votes: event.votes || [],
              costAssignments: event.cost_assignments || {},
              payments: event.payments || {}
            }))
            .sort((a, b) => a.start - b.start);
          
          setEvents(sortedEvents);
          setError(null);
        } else {
          setError(null);
          setEvents([]);
        }

        // Fetch trip members
        const memberPromises = localTrip.members.map(async (memberId) => {
          const response = await fetch(url + '/profiles/id/' + memberId, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          const data = await response.json();
          if (data.success) {
            return data.profile;
          }
          return null;
        });

        const memberDetails = await Promise.all(memberPromises);
        setTripMembers(memberDetails.filter(m => m !== null));

      } catch (err) {
        setError('Failed to fetch data');
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (localTrip) {
      fetchData();
    }
  }, [localTrip, url]);

  const getUserTotalCost = () => {
    let total = 0;
    events.forEach(event => {
      if (event.cost > 0 && event.costAssignments?.[currentID]) {
        const assignedCount = Object.values(event.costAssignments).filter(assigned => assigned).length;
        if (assignedCount > 0) {
          total += event.cost / assignedCount;
        }
      }
    });
    return total;
  };

  const getTripTotalCost = () => {
    return events.reduce((sum, event) => sum + (event.cost || 0), 0);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleVoteClick = (dayEvents) => {
    const groups = getConflictGroups(dayEvents);
    setConflictGroups(groups);
    setShowVotingModal(true);
  };

  const handleVote = async (eventId, conflictingEvs) => {
    try {
      for (const event of conflictingEvs) {
        if ((event.votes || []).includes(currentID) && event._id !== eventId) {
          const updatedVotes = event.votes.filter(id => id !== currentID);
          await fetch(url + "/events/" + event._id, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...event,
              start: moment(event.start).toISOString(),
              end: moment(event.end).toISOString(),
              votes: updatedVotes
            })
          });
        }
      }

      const selectedEvent = conflictingEvs.find(e => e._id === eventId);
      const currentVotes = selectedEvent.votes || [];
      const updatedVotes = currentVotes.includes(currentID) 
        ? currentVotes 
        : [...currentVotes, currentID];

      const response = await fetch(url + "/events/" + eventId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selectedEvent,
          start: moment(selectedEvent.start).toISOString(),
          end: moment(selectedEvent.end).toISOString(),
          votes: updatedVotes
        })
      });

      const data = await response.json();
      if (data.success) {
        setEvents(prev => prev.map(event => {
          const conflictingEvent = conflictingEvs.find(e => e._id === event._id);
          if (conflictingEvent) {
            if (event._id === eventId) {
              return {
                ...event,
                votes: updatedVotes
              };
            } else if ((event.votes || []).includes(currentID)) {
              return {
                ...event,
                votes: event.votes.filter(id => id !== currentID)
              };
            }
          }
          return event;
        }));
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleRemoveVote = async (eventId, conflictingEvs) => {
    try {
      const selectedEvent = conflictingEvs.find(e => e._id === eventId);
      const currentVotes = selectedEvent.votes || [];
      const updatedVotes = currentVotes.filter(id => id !== currentID);

      const response = await fetch(url + "/events/" + eventId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selectedEvent,
          start: moment(selectedEvent.start).toISOString(),
          end: moment(selectedEvent.end).toISOString(),
          votes: updatedVotes
        })
      });

      const data = await response.json();
      if (data.success) {
        setEvents(prev => prev.map(event => {
          if (event._id === eventId) {
            return {
              ...event,
              votes: updatedVotes
            };
          }
          return event;
        }));
      }
    } catch (err) {
      console.error('Failed to remove vote:', err);
    }
  };

  const handleMarkPaid = async (eventId, memberId, isPaid) => {
    try {
      const event = events.find(e => e._id === eventId);
      const updatedPayments = {
        ...event.payments,
        [memberId]: isPaid
      };

      const response = await fetch(url + "/events/" + eventId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...event,
          start: moment(event.start).toISOString(),
          end: moment(event.end).toISOString(),
          payments: updatedPayments
        })
      });

      const data = await response.json();
      if (data.success) {
        setEvents(prev => prev.map(e => {
          if (e._id === eventId) {
            return {
              ...e,
              payments: updatedPayments
            };
          }
          return e;
        }));
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
    }
  };

  const handleCreateEvent = async (eventData) => {
    try {
      const response = await fetch(url + "/events", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          trip_id: localTrip._id,
          creator: currentID,
          cost_assignments: eventData.costAssignments || {},
          votes: [],
          payments: eventData.payments || {}
        })
      });

      const data = await response.json();

      if (data.success) {
        const newEvent = {
          ...data.event,
          start: new Date(data.event.start),
          end: new Date(data.event.end),
          votes: data.event.votes || [],
          costAssignments: data.event.cost_assignments || {},
          payments: data.event.payments || {}
        };
        setEvents(prev => [...prev, newEvent].sort((a, b) => a.start - b.start));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to save event');
    }
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (eventData) => {
    try {
      const response = await fetch(url + "/events/" + eventData._id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          start: moment(eventData.start).toISOString(),
          end: moment(eventData.end).toISOString(),
          cost_assignments: eventData.costAssignments,
          payments: eventData.payments
        })
      });
      const data = await response.json();
      if (data.success) {
        const updatedEvent = {
          ...data.event,
          start: new Date(data.event.start),
          end: new Date(data.event.end),
          votes: data.event.votes || [],
          costAssignments: data.event.cost_assignments || {},
          payments: data.event.payments || {}
        };
        setEvents(prev => 
          prev.map(event => event._id === eventData._id ? updatedEvent : event)
            .sort((a, b) => a.start - b.start)
        );
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to save event');
    }
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      const response = await fetch(url + "/events/" + selectedEvent._id, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (data.success) {
        setEvents(prev => prev.filter(event => event._id !== selectedEvent._id));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to delete event');
    }
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleSavePackingList = async (packingListContent) => {
    if (!localTrip) return;
    try {
      const updatedTrip = { ...localTrip, packing_list: packingListContent };
      
      const response = await fetch(url + "/calendars/" + localTrip._id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: updatedTrip.owner,
          name: updatedTrip.name,
          start: updatedTrip.start,
          end: updatedTrip.end,
          description: updatedTrip.description,
          members: updatedTrip.members,
          packing_list: updatedTrip.packing_list
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLocalTrip(data.calendar);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error("Error saving packing list:", err);
      setError('Failed to update packing list');
    }
  };
  
  const handleUpdateTrip = async (updatedTrip) => {
    try {
      const newStart = moment(updatedTrip.start);
      const newEnd = moment(updatedTrip.end);

      const eventsToDelete = events.filter(event => {
        const eventDate = moment(event.start);
        return eventDate.isBefore(newStart, 'day') || eventDate.isAfter(newEnd, 'day');
      });

      for (const event of eventsToDelete) {
        await fetch(url + "/events/" + event._id, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      }

      setEvents(prev => prev.filter(event => {
        const eventDate = moment(event.start);
        return !eventDate.isBefore(newStart, 'day') && !eventDate.isAfter(newEnd, 'day');
      }));

      const response = await fetch(url + "/calendars/" + updatedTrip._id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: updatedTrip.owner,
          name: updatedTrip.name,
          start: updatedTrip.start,
          end: updatedTrip.end,
          description: updatedTrip.description,
          members: updatedTrip.members,
          packing_list: updatedTrip.packing_list
        })
      });

      const data = await response.json();
      if (data.success) {
        setLocalTrip(updatedTrip);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update trip');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      const response = await fetch(url + "/calendars/" + tripId, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      if (data.success) {
        setCurrentPage('trips');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to delete trip');
    }
    setShowTripModal(false);
  };

  const handleMembersUpdate = (updatedMembers) => {
    setLocalTrip(prev => ({
      ...prev,
      members: updatedMembers
    }));
  };

  const generateDayCards = () => {
    if (!localTrip?.start || !localTrip?.end) return [];
    
    const start = moment(localTrip.start);
    const end = moment(localTrip.end);
    const days = [];
    
    for (let date = start.clone(); date.isSameOrBefore(end); date.add(1, 'days')) {
      const dayEvents = events.filter(event => 
        moment(event.start).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
      );
      
      days.push({
        date: date.clone(),
        events: dayEvents
      });
    }
    
    return days;
  };

  const handleAddEvent = (date) => {
    const start = date.toDate();
    const end = moment(start).add(1, 'hour').toDate();
    setSelectedEvent({ start, end });
    setShowModal(true);
  };

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200">
      <Navbar 
        theme={theme}
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        onLogout={onLogout}
        setCurrentPage={setCurrentPage}
      />
      
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">{localTrip?.name || 'Trip Itinerary'}</h1>
            <p className="text-base-content/70 mt-2">
              {moment(localTrip?.start).format('MMM D')} - {moment(localTrip?.end).format('MMM D, YYYY')}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPackingListModal(true)} 
              className="btn btn-info gap-2"
            >
              Packing List
            </button>
            <button 
              onClick={() => setShowCostModal(true)} 
              className="btn btn-success gap-2"
            >
              Costs
            </button>
            <button 
              onClick={() => setShowMembersModal(true)} 
              className="btn btn-primary gap-2"
            >
              Members
            </button>
            {isOwner && (
              <button 
                onClick={() => setShowTripModal(true)} 
                className="btn btn-warning gap-2"
              >
                Manage Trip
              </button>
            )}
            <button 
              onClick={() => setCurrentPage('trips')} 
              className="btn btn-ghost"
            >
              Back to Trips
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-error max-w-2xl mx-auto mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="btn btn-xs btn-ghost">Dismiss</button>
              </div>
            )}
            <div className="overflow-x-auto flex gap-6 pl-6 pr-6 pb-6 snap-x snap-mandatory">
              {generateDayCards().map(({ date, events: dayEvents }) => {
                const conflictGroupsForDay = getConflictGroups(dayEvents);
                const hasConflicts = conflictGroupsForDay.length > 0;

                return (
                  <div 
                    key={date.format('YYYY-MM-DD')}
                    className="card bg-base-100 shadow-xl min-w-[320px] snap-center hover:shadow-2xl transition-shadow"
                  >
                    <div className="card-body p-6">
                      <h2 className="card-title justify-between">
                        <div>
                          <div className="text-lg font-bold">{date.format('ddd, MMM D')}</div>
                          <div className="text-sm font-normal text-base-content/60">
                            Day {date.diff(moment(localTrip.start), 'days') + 1}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAddEvent(date)}
                          className="btn btn-circle btn-sm btn-primary"
                        >
                          <PlusIcon size={16}/>
                        </button>
                      </h2>

                      {hasConflicts && (
                        <div className="flex items-center justify-between alert alert-warning py-2 mt-2">
                          <span className="text-xs">{conflictGroupsForDay.length} time conflict{conflictGroupsForDay.length > 1 ? 's' : ''} detected</span>
                          <button 
                            onClick={() => handleVoteClick(dayEvents)}
                            className="btn btn-xs btn-warning"
                          >
                            Vote
                          </button>
                        </div>
                      )}
                      
                      {dayEvents.length === 0 ? (
                        <div className="text-center py-8 text-base-content/50">
                          No events planned
                        </div>
                      ) : (
                        <div className="space-y-3 mt-4">
                          {dayEvents.map((event, index) => {
                            const conflicts = getConflictingEvents(event, dayEvents);
                            const hasConflict = conflicts.length > 0;
                            const conflictGroup = hasConflict ? [event, ...conflicts] : [];
                            const leadingEvent = getLeadingEvent(conflictGroup);
                            const isWinning = leadingEvent && leadingEvent._id === event._id;
                            const voteCount = (event.votes || []).length;

                            return (
                              <div 
                                key={event._id || index}
                                className={`card ${getEventColor(event.type, hasConflict)} border-2 cursor-pointer transition-all relative`}
                                onClick={() => handleSelectEvent(event)}
                              >
                                {isWinning && hasConflict && (
                                  <div className="absolute top-2 right-2 z-10">
                                    <span className="badge badge-success badge-sm gap-1">
                                      <CheckIcon size={10} />
                                      {voteCount} vote{voteCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                                {hasConflict && !isWinning && voteCount > 0 && (
                                  <div className="absolute top-2 right-2 z-10">
                                    <span className="badge badge-outline badge-sm">
                                      {voteCount} vote{voteCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                                <div className="card-body p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                      {getEventIcon(event.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-neutral leading-tight">{event.title}</h3>
                                      <p className="text-sm text-neutral/60 mt-1">
                                        {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
                                      </p>
                                      {event.location && (
                                        <p className="text-xs text-neutral/60 mt-1">{event.location}</p>
                                      )}
                                      {event.cost > 0 && (
                                        <p className="text-xs text-neutral/60 mt-1">${event.cost.toFixed(2)}</p>
                                      )}
                                      {event.details && (
                                        <p className="text-xs text-neutral/70 line-clamp-2 mt-1">{event.details}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="stats shadow mt-6">
              <div className="stat">
                <div className="stat-title">Your Total Cost</div>
                <div className="stat-value text-success">${getUserTotalCost().toFixed(2)}</div>
              </div>
              
              <div className="stat">
                <div className="stat-title">Trip Total Cost</div>
                <div className="stat-value text-primary">${getTripTotalCost().toFixed(2)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <EventModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedEvent(null);
        }}
        onCreate={handleCreateEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        eventInfo={selectedEvent}
        tripMembers={tripMembers}
        currentID={currentID}
      />

      <TripManagementModal
        isOpen={showTripModal}
        onClose={() => setShowTripModal(false)}
        currentTrip={localTrip}
        events={events}
        onSaveChanges={handleUpdateTrip}
        onDeleteTrip={handleDeleteTrip}
      />

      <MembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        currentTrip={localTrip}
        currentID={currentID}
        isOwner={isOwner}
        onMembersUpdate={handleMembersUpdate}
      />

      <VotingModal
        isOpen={showVotingModal}
        onClose={() => setShowVotingModal(false)}
        conflictGroups={conflictGroups}
        currentTrip={localTrip}
        currentID={currentID}
        onVote={handleVote}
        onRemoveVote={handleRemoveVote}
      />

      <CostTrackingModal
        isOpen={showCostModal}
        onClose={() => setShowCostModal(false)}
        events={events}
        tripMembers={tripMembers}
        currentID={currentID}
        onMarkPaid={handleMarkPaid}
      />

      <PackingListModal
        isOpen={showPackingListModal}
        onClose={() => setShowPackingListModal(false)}
        packingList={localTrip?.packing_list}
        onSave={handleSavePackingList}
        currentID={currentID}
      />
    </div>
  );
}

export default Itinerary;