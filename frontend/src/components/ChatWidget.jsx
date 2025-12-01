/**
 * ChatWidget Component - Floating chat interface for trip communication
 * Features: Real-time messaging, auto-scroll, message history, polling updates
 * Displays as a collapsible floating button/window in the bottom-right corner
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChatIcon, SendIcon, XMarkIcon } from './Icons';
import moment from 'moment';

const ChatWidget = ({ currentTrip, currentUser, currentID }) => {
  // UI states
  const [isOpen, setIsOpen] = useState(false);  // Controls widget expand/collapse
  const [messages, setMessages] = useState([]);  // All chat messages for this trip
  const [newMessage, setNewMessage] = useState('');  // Current input field value
  
  // Refs for scroll management
  const messagesEndRef = useRef(null);  // Reference to bottom of message list
  const scrollContainerRef = useRef(null);  // Reference to scrollable container
  
  const url = "http://localhost:8000";

  // Don't render chat if no trip is selected
  if (!currentTrip) return null;

  // Smooth scroll to the bottom of the message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to bottom when chat is first opened
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  // Smart scroll: only auto-scroll if user was already near the bottom
  // This prevents interrupting users who are reading old messages
  useEffect(() => {
    if (!isOpen || !scrollContainerRef.current) return;
    
    const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
    // If user is within 200px of the bottom, assume they want to see new messages
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Polling effect: fetch messages when chat is open, then every 3 seconds
  useEffect(() => {
    let interval;
    if (isOpen) {
      fetchMessages();  // Initial fetch
      interval = setInterval(fetchMessages, 3000);  // Poll for new messages every 3 seconds
    }
    return () => clearInterval(interval);  // Cleanup on unmount or close
  }, [isOpen, currentTrip._id]);

  // Fetch all messages for the current trip from the backend
  const fetchMessages = async () => {
    try {
      const response = await fetch(`${url}/calendars/${currentTrip._id}/messages`);
      const data = await response.json();
      if (data.success && data.messages) {
        // Optimize: only update state if messages actually changed
        // This prevents unnecessary re-renders and scroll jumps
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
            return data.messages;
          }
          return prev;
        });
      } else if (data.success && !data.messages) {
          setMessages([]);  // Empty chat
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;  // Ignore empty messages

    // Build message object with required fields
    const message = {
      id: Date.now().toString(),  // Temporary ID (backend generates its own)
      sender_id: String(currentID || "anonymous"),
      sender_username: String(currentUser || "Anonymous"),
      text: String(newMessage),
      timestamp: new Date().toISOString()
    };

    console.log("Sending message payload:", message);

    // Optimistic update: show message immediately for better UX
    setMessages(prev => [...prev, message]);
    setNewMessage('');  // Clear input field
    
    // Force scroll to bottom when user sends a message
    setTimeout(scrollToBottom, 100);

    try {
      // Send message to backend
      const response = await fetch(`${url}/calendars/${currentTrip._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send message:", response.status, errorText);
      } else {
          console.log("Message sent successfully");
          fetchMessages();  // Re-sync with server to get authoritative message list
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-focus transition-all duration-200 transform hover:scale-110"
        >
          <ChatIcon />
        </button>
      )}

      {isOpen && (
        <div className="bg-base-100 w-80 h-96 rounded-lg shadow-2xl flex flex-col border border-base-300">
          {/* Header */}
          <div className="bg-primary text-white p-3 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold">Trip Chat</h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-gray-200">
              <XMarkIcon />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-base-200">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">No messages yet. Say hi!</div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender_id === String(currentID);  // Check if current user sent this
                const nextMsg = messages[index + 1];
                const isNextSameSender = nextMsg && nextMsg.sender_id === msg.sender_id;
                // Only show timestamp if next message is from different sender or >5 mins later
                const isNextClose = nextMsg && moment(nextMsg.timestamp).diff(moment(msg.timestamp), 'minutes') < 5;
                const showTimestamp = !isNextSameSender || !isNextClose;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-2 ${isMe ? 'bg-primary text-white' : 'bg-white text-black'}`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    {showTimestamp && (
                      <span className="text-xs text-gray-500 mt-1">
                        {isMe ? 'You' : msg.sender_username} • {moment(msg.timestamp).fromNow()}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-base-100 border-t border-base-300 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="input input-bordered input-sm flex-1"
            />
            <button type="submit" className="btn btn-primary btn-sm btn-circle">
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;