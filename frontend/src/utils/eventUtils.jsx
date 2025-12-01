import { FlightIcon, HotelIcon, FoodIcon, ActivityIcon, OtherIcon } from '../components/Icons';
import moment from 'moment';

export const getEventIcon = (type) => {
  switch(type) {
    case 'Flight': return <FlightIcon/>;
    case 'Hotel': return <HotelIcon/>;
    case 'Food': return <FoodIcon/>;
    case 'Activity': return <ActivityIcon/>;
    default: return <OtherIcon/>;
  }
};

export const getEventColor = (type, hasConflict = false) => {
  if (hasConflict) {
    return 'bg-error/20 border-error hover:bg-error/30';
  }
  switch(type) {
    case 'Flight': return 'bg-sky-100 border-sky-300 hover:bg-sky-200';
    case 'Hotel': return 'bg-purple-100 border-purple-300 hover:bg-purple-200';
    case 'Food': return 'bg-orange-100 border-orange-300 hover:bg-orange-200';
    case 'Activity': return 'bg-green-100 border-green-300 hover:bg-green-200';
    default: return 'bg-gray-100 border-gray-300 hover:bg-gray-200';
  }
};

export const eventsOverlap = (event1, event2) => {
  const start1 = moment(event1.start);
  const end1 = moment(event1.end);
  const start2 = moment(event2.start);
  const end2 = moment(event2.end);

  return start1.isBefore(end2) && start2.isBefore(end1);
};

export const getConflictingEvents = (event, dayEvents) => {
  return dayEvents.filter(e => 
    e._id !== event._id && eventsOverlap(event, e)
  );
};

export const getLeadingEvent = (events) => {
  if (!events || events.length === 0) return null;
  
  let maxVotes = 0;
  let leadingEvent = null;
  let tieCount = 0;
  
  events.forEach(event => {
    const voteCount = (event.votes || []).length;
    
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      leadingEvent = event;
      tieCount = 1;
    } else if (voteCount === maxVotes && voteCount > 0) {
      tieCount++;
    }
  });
  
  // If there's a tie (more than one event with max votes), return null
  if (tieCount > 1) {
    return null;
  }
  
  // Only return leading event if it has at least one vote
  return maxVotes > 0 ? leadingEvent : null;
};

// Get all conflict groups for a day
export const getConflictGroups = (dayEvents) => {
  const conflictGroups = [];
  const processedEvents = new Set();

  dayEvents.forEach(event => {
    if (processedEvents.has(event._id)) return;

    const conflicts = getConflictingEvents(event, dayEvents);
    
    if (conflicts.length > 0) {
      const group = [event, ...conflicts];
      
      // Mark all events in this group as processed
      group.forEach(e => processedEvents.add(e._id));
      
      // Calculate time range for this conflict group
      const startTimes = group.map(e => moment(e.start));
      const endTimes = group.map(e => moment(e.end));
      const earliestStart = moment.min(startTimes);
      const latestEnd = moment.max(endTimes);
      
      conflictGroups.push({
        events: group,
        timeRange: `${earliestStart.format('h:mm A')} - ${latestEnd.format('h:mm A')}`
      });
    }
  });

  return conflictGroups;
};