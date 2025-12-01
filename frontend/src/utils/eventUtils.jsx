/**
 * Event Utilities - Helper functions for itinerary event management
 * Contains: Icon mapping, color coding, conflict detection, voting logic
 * Used by: Itinerary page and related modals for event display and conflict resolution
 */

import { FlightIcon, HotelIcon, FoodIcon, ActivityIcon, OtherIcon } from '../components/Icons';
import moment from 'moment';

// Map event type to corresponding icon component
export const getEventIcon = (type) => {
  switch(type) {
    case 'Flight': return <FlightIcon/>;
    case 'Hotel': return <HotelIcon/>;
    case 'Food': return <FoodIcon/>;
    case 'Activity': return <ActivityIcon/>;
    default: return <OtherIcon/>;
  }
};

// Get Tailwind CSS classes for event card styling based on type and conflict status
export const getEventColor = (type, hasConflict = false) => {
  // Override with error styling if event has time conflicts
  if (hasConflict) {
    return 'bg-error/20 border-error hover:bg-error/30';
  }
  // Color-code events by type for easy visual identification
  switch(type) {
    case 'Flight': return 'bg-sky-100 border-sky-300 hover:bg-sky-200';
    case 'Hotel': return 'bg-purple-100 border-purple-300 hover:bg-purple-200';
    case 'Food': return 'bg-orange-100 border-orange-300 hover:bg-orange-200';
    case 'Activity': return 'bg-green-100 border-green-300 hover:bg-green-200';
    default: return 'bg-gray-100 border-gray-300 hover:bg-gray-200';
  }
};

// Check if two events overlap in time
export const eventsOverlap = (event1, event2) => {
  const start1 = moment(event1.start);
  const end1 = moment(event1.end);
  const start2 = moment(event2.start);
  const end2 = moment(event2.end);

  return start1.isBefore(end2) && start2.isBefore(end1);
};

// Find all events that overlap with a given event on the same day
export const getConflictingEvents = (event, dayEvents) => {
  return dayEvents.filter(e => 
    e._id !== event._id && eventsOverlap(event, e)
  );
};

// Determine which event in a conflict group has the most votes
// Returns null if there's a tie or no votes
export const getLeadingEvent = (events) => {
  if (!events || events.length === 0) return null;
  
  let maxVotes = 0;
  let leadingEvent = null;
  let tieCount = 0;
  
  // Find event(s) with the most votes
  events.forEach(event => {
    const voteCount = (event.votes || []).length;
    
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      leadingEvent = event;
      tieCount = 1;
    } else if (voteCount === maxVotes && voteCount > 0) {
      tieCount++;  // Another event has same vote count
    }
  });
  
  // Return null if tie (multiple events with same max votes)
  if (tieCount > 1) {
    return null;
  }
  
  // Only return leading event if it has at least one vote
  return maxVotes > 0 ? leadingEvent : null;
};

// Group all overlapping events on a day into conflict groups for voting
export const getConflictGroups = (dayEvents) => {
  const conflictGroups = [];
  const processedEvents = new Set();  // Track events already assigned to a group

  dayEvents.forEach(event => {
    if (processedEvents.has(event._id)) return;  // Skip if already in a group

    const conflicts = getConflictingEvents(event, dayEvents);
    
    // If this event conflicts with others, create a conflict group
    if (conflicts.length > 0) {
      const group = [event, ...conflicts];
      
      // Mark all events in this group as processed to avoid duplicates
      group.forEach(e => processedEvents.add(e._id));
      
      // Calculate the overall time range spanned by all conflicting events
      const startTimes = group.map(e => moment(e.start));
      const endTimes = group.map(e => moment(e.end));
      const earliestStart = moment.min(startTimes);
      const latestEnd = moment.max(endTimes);
      
      conflictGroups.push({
        events: group,  // All events in this conflict
        timeRange: `${earliestStart.format('h:mm A')} - ${latestEnd.format('h:mm A')}`
      });
    }
  });

  return conflictGroups;
};