import React, { useState, useEffect, useRef } from 'react';
import { ChatIcon, SendIcon, XMarkIcon } from './Icons';
import moment from 'moment';

const ChatWidget = ({ currentTrip, currentUser, currentID }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const url = "http://localhost:8000";

  if (!currentTrip) return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when opening chat
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  // Smart scroll: only scroll if user was already near bottom
  useEffect(() => {
    if (!isOpen || !scrollContainerRef.current) return;
    
    const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
    // If we are within 150px of the bottom, auto-scroll
    // Note: This runs after render, so scrollHeight includes new messages.
    // We approximate "was at bottom" by checking if the distance to bottom is relatively small
    // (meaning the user hasn't scrolled way up)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    let interval;
    if (isOpen) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [isOpen, currentTrip._id]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${url}/calendars/${currentTrip._id}/messages`);
      const data = await response.json();
      if (data.success && data.messages) {
        // Only update state if messages are different to avoid unnecessary re-renders
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
            return data.messages;
          }
          return prev;
        });
      } else if (data.success && !data.messages) {
          setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      sender_id: String(currentID || "anonymous"),
      sender_username: String(currentUser || "Anonymous"),
      text: String(newMessage),
      timestamp: new Date().toISOString()
    };

    console.log("Sending message payload:", message);

    // Optimistic update
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Force scroll to bottom when I send a message
    setTimeout(scrollToBottom, 100);

    try {
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
          fetchMessages(); // Sync with server to be sure
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
                const isMe = msg.sender_id === String(currentID);
                const nextMsg = messages[index + 1];
                const isNextSameSender = nextMsg && nextMsg.sender_id === msg.sender_id;
                // Check if next message is within 5 minutes
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