/**
 * MembersModal Component - Manage trip members and invitations
 * Features: View members, invite users, remove members, revoke invitations
 * Owner-only actions: invite, remove members, revoke invitations
 */

import React, { useState, useEffect } from 'react';
import { TrashIcon, PlusIcon } from './Icons';

const MembersModal = ({ isOpen, onClose, currentTrip, currentID, isOwner, onMembersUpdate }) => {
  // Data states
  const [members, setMembers] = useState([]);  // Full member details with profiles
  const [pendingInvitations, setPendingInvitations] = useState([]);  // Pending invites for this trip
  
  // Form states
  const [username, setUsername] = useState('');  // Username input for new invitation
  const [isLoading, setIsLoading] = useState(false);  // Loading state for async operations
  const [message, setMessage] = useState('');  // Success/error message text
  const [messageType, setMessageType] = useState('');  // 'success' or 'error'
  const [showInviteForm, setShowInviteForm] = useState(false);  // Toggle invite form visibility

  const url = "http://localhost:8000";

  useEffect(() => {
    if (isOpen && currentTrip) {
      fetchMembers();
      fetchPendingInvitations();
    }
  }, [isOpen, currentTrip]);

  const fetchMembers = async () => {
    try {
      const memberPromises = currentTrip.members.map(async (memberId) => {
        const response = await fetch(url + '/profiles/id/' + memberId, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const data = await response.json();
        if (data.success) {
          return { ...data.profile, isOwner: memberId === currentTrip.owner };
        }
        return null;
      });

      const memberDetails = await Promise.all(memberPromises);
      setMembers(memberDetails.filter(m => m !== null));
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch(url + '/invitations/trip/' + currentTrip._id, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (data.success) {
        setPendingInvitations(data.invitations);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(url + '/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: currentTrip._id,
          inviter_id: currentID,
          invitee_username: username
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Invitation sent successfully!');
        setMessageType('success');
        setUsername('');
        setShowInviteForm(false);
        fetchPendingInvitations();
      } else {
        setMessage(data.message);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Failed to send invitation');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberUsername) => {
    if (!window.confirm(`Are you sure you want to remove ${memberUsername} from this trip?`)) {
      return;
    }

    try {
      const updatedMembers = currentTrip.members.filter(id => id !== memberId);
      
      const response = await fetch(url + '/calendars/' + currentTrip._id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentTrip,
          members: updatedMembers
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`${memberUsername} removed from trip`);
        setMessageType('success');
        fetchMembers();
        onMembersUpdate(updatedMembers);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Failed to remove member');
      setMessageType('error');
    }
  };

  const handleRevokeInvitation = async (invitationId, inviteeUsername) => {
    if (!window.confirm(`Are you sure you want to revoke the invitation to ${inviteeUsername}?`)) {
      return;
    }

    try {
      const response = await fetch(url + '/invitations/' + invitationId + '/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Invitation revoked');
        setMessageType('success');
        fetchPendingInvitations();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message);
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Failed to revoke invitation');
      setMessageType('error');
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Trip Members</h3>
        <p className="text-base-content/70 mb-4">Manage members for "{currentTrip?.name}"</p>
        
        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
            <span>{message}</span>
          </div>
        )}

        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center justify-between">
            <span>Current Members ({members.length})</span>
          </h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member._id} className="flex items-center justify-between bg-base-200 p-3 rounded-lg">
                <div>
                  <p className="font-medium">
                    {member.username}
                    {member.isOwner && <span className="badge badge-primary badge-sm ml-2">Owner</span>}
                  </p>
                  <p className="text-sm text-base-content/60">{member.email}</p>
                </div>
                {isOwner && !member.isOwner && (
                  <button
                    onClick={() => handleRemoveMember(member._id, member.username)}
                    className="btn btn-ghost btn-sm btn-error"
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isOwner && pendingInvitations.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Pending Invitations ({pendingInvitations.length})</h4>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div key={invitation._id} className="flex items-center justify-between bg-warning/10 p-3 rounded-lg border border-warning/30">
                  <div>
                    <p className="font-medium">{invitation.invitee_username}</p>
                    <p className="text-sm text-base-content/60">Invitation pending</p>
                  </div>
                  <button
                    onClick={() => handleRevokeInvitation(invitation._id, invitation.invitee_username)}
                    className="btn btn-ghost btn-sm"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div className="mb-4">
            {!showInviteForm ? (
              <button
                onClick={() => setShowInviteForm(true)}
                className="btn btn-primary btn-sm"
              >
                <PlusIcon size={16} />
                Invite User
              </button>
            ) : (
              <div className="bg-base-200 p-4 rounded-lg">
                <form onSubmit={handleInvite}>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Username</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Enter username" 
                      className="input input-bordered w-full"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
                      {isLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Send Invite'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowInviteForm(false);
                        setUsername('');
                        setMessage('');
                      }} 
                      className="btn btn-ghost btn-sm"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="modal-action">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
};

export default MembersModal;