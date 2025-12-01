import React, { useState, useEffect } from 'react';
import { CheckIcon, TrashIcon } from './Icons';
import { getEventIcon } from '../utils/eventUtils';
import moment from 'moment';

const VotingModal = ({ isOpen, onClose, conflictGroups, currentTrip, currentID, onVote, onRemoveVote }) => {
  const [votes, setVotes] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && conflictGroups.length > 0) {
      const voteData = {};
      conflictGroups.forEach(group => {
        group.events.forEach(event => {
          voteData[event._id] = event.votes || [];
        });
      });
      setVotes(voteData);
    }
  }, [isOpen, conflictGroups]);

  const handleVote = async (eventId, groupIndex) => {
    setIsLoading(true);
    
    const group = conflictGroups[groupIndex];
    const allEventIds = group.events.map(e => e._id);
    
    await onVote(eventId, group.events);
    
    // Update local votes state immediately
    setVotes(prev => {
      const newVotes = { ...prev };
      
      // Remove current user's vote from all events in this conflict group
      allEventIds.forEach(id => {
        if (newVotes[id]) {
          newVotes[id] = newVotes[id].filter(voterId => voterId !== currentID);
        }
      });
      
      // Add vote to selected event
      if (!newVotes[eventId]) {
        newVotes[eventId] = [];
      }
      if (!newVotes[eventId].includes(currentID)) {
        newVotes[eventId] = [...newVotes[eventId], currentID];
      }
      
      return newVotes;
    });
    
    setIsLoading(false);
  };

  const handleRemoveVote = async (eventId, groupIndex) => {
    setIsLoading(true);
    
    const group = conflictGroups[groupIndex];
    
    await onRemoveVote(eventId, group.events);
    
    // Update local votes state immediately
    setVotes(prev => {
      const newVotes = { ...prev };
      
      if (newVotes[eventId]) {
        newVotes[eventId] = newVotes[eventId].filter(voterId => voterId !== currentID);
      }
      
      return newVotes;
    });
    
    setIsLoading(false);
  };

  const getUserVoteInGroup = (groupEvents) => {
    for (const event of groupEvents) {
      if (votes[event._id]?.includes(currentID)) {
        return event._id;
      }
    }
    return null;
  };

  if (!isOpen) return null;

  const eventDate = conflictGroups.length > 0 && conflictGroups[0].events.length > 0
    ? moment(conflictGroups[0].events[0].start).format('dddd, MMMM D, YYYY')
    : '';

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">Vote on Conflicting Events</h3>
        <p className="text-base-content/70 mb-2">{eventDate}</p>
        <p className="text-sm text-warning mb-4">
          These events overlap in time. Vote for your preferred event in each conflict group!
        </p>

        <div className="space-y-6">
          {conflictGroups.map((group, groupIndex) => {
            const userVote = getUserVoteInGroup(group.events);
            
            return (
              <div key={groupIndex} className="border border-base-300 rounded-lg p-4 bg-base-100">
                <h4 className="font-semibold mb-3 text-base-content">
                  Conflict Group {groupIndex + 1}: {group.timeRange}
                </h4>
                
                <div className="space-y-3">
                  {group.events.map((event) => {
                    const voteCount = votes[event._id]?.length || 0;
                    const hasUserVoted = votes[event._id]?.includes(currentID);
                    const maxVotes = Math.max(...group.events.map(e => votes[e._id]?.length || 0));
                    const eventsWithMaxVotes = group.events.filter(e => (votes[e._id]?.length || 0) === maxVotes);
                    const isLeading = voteCount > 0 && voteCount === maxVotes && eventsWithMaxVotes.length === 1;

                    return (
                      <div 
                        key={event._id}
                        className={`card border-2 ${
                          hasUserVoted ? 'border-primary bg-primary/10' : 
                          isLeading ? 'border-success bg-success/5' : 
                          'border-base-300'
                        }`}
                      >
                        <div className="card-body p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-1">
                                {getEventIcon(event.type)}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">{event.title}</h4>
                                <p className="text-sm text-base-content/70">
                                  {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
                                </p>
                                {event.location && (
                                  <p className="text-xs text-base-content/60 mt-1">{event.location}</p>
                                )}
                                {event.details && (
                                  <p className="text-xs text-base-content/70 mt-1">{event.details}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="badge badge-outline">
                                    {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                                  </span>
                                  {isLeading && voteCount > 0 && (
                                    <span className="badge badge-success gap-1">
                                      <CheckIcon size={12} />
                                      Leading
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {hasUserVoted ? (
                                <>
                                  <button
                                    disabled
                                    className="btn btn-sm btn-primary"
                                  >
                                    <CheckIcon size={14} />
                                    Voted
                                  </button>
                                  <button
                                    onClick={() => handleRemoveVote(event._id, groupIndex)}
                                    disabled={isLoading}
                                    className="btn btn-sm btn-outline btn-error"
                                  >
                                    {isLoading ? (
                                      <span className="loading loading-spinner loading-xs"></span>
                                    ) : (
                                      <>
                                        <TrashIcon size={14} />
                                        Remove
                                      </>
                                    )}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleVote(event._id, groupIndex)}
                                  disabled={isLoading}
                                  className="btn btn-sm btn-outline"
                                >
                                  {isLoading ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  ) : (
                                    'Vote'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!userVote && (
                  <div className="alert alert-info mt-3">
                    <span className="text-xs">You haven't voted in this group yet</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="alert alert-warning mt-4">
          <span className="text-sm">
            Click 'Vote' to choose your preferred event in each conflict group. Click 'Remove' to remove your vote.
          </span>
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
};

export default VotingModal;