import React, { useState, useEffect } from 'react';
import { CheckIcon } from './Icons';
import moment from 'moment';

const CostTrackingModal = ({ isOpen, onClose, events, tripMembers, currentID, onMarkPaid }) => {
  const [memberCosts, setMemberCosts] = useState({});
  const [payments, setPayments] = useState({});

  useEffect(() => {
    if (isOpen && events.length > 0) {
      calculateMemberCosts();
    }
  }, [isOpen, events, tripMembers]);

  const calculateMemberCosts = () => {
    const costs = {};
    const paymentTracking = {};

    // Initialize all members
    tripMembers.forEach(member => {
      costs[member._id] = {
        total: 0,
        events: [],
        username: member.username
      };
    });

    // Calculate costs for each event
    events.forEach(event => {
      if (event.cost > 0 && event.costAssignments) {
        const assignedMembers = Object.entries(event.costAssignments)
          .filter(([_, assigned]) => assigned)
          .map(([memberId]) => memberId);

        if (assignedMembers.length > 0) {
          const costPerPerson = event.cost / assignedMembers.length;

          assignedMembers.forEach(memberId => {
            if (costs[memberId]) {
              costs[memberId].total += costPerPerson;
              costs[memberId].events.push({
                ...event,
                costPerPerson,
                isPaid: event.payments?.[memberId] || false
              });
            }
          });

          // Initialize payment tracking
          if (!paymentTracking[event._id]) {
            paymentTracking[event._id] = event.payments || {};
          }
        }
      }
    });

    setMemberCosts(costs);
    setPayments(paymentTracking);
  };

  const handleTogglePayment = async (eventId, memberId) => {
    const newPaymentStatus = !(payments[eventId]?.[memberId] || false);
    
    await onMarkPaid(eventId, memberId, newPaymentStatus);
    
    // Update local state
    setPayments(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [memberId]: newPaymentStatus
      }
    }));

    // Recalculate costs
    calculateMemberCosts();
  };

  const getTripTotal = () => {
    return Object.values(memberCosts).reduce((sum, member) => sum + member.total, 0);
  };

  const getMemberPaidAmount = (memberId) => {
    const member = memberCosts[memberId];
    if (!member) return 0;
    
    return member.events
      .filter(event => event.isPaid)
      .reduce((sum, event) => sum + event.costPerPerson, 0);
  };

  const getMemberUnpaidAmount = (memberId) => {
    const member = memberCosts[memberId];
    if (!member) return 0;
    
    return member.events
      .filter(event => !event.isPaid)
      .reduce((sum, event) => sum + event.costPerPerson, 0);
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-5xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">Cost Tracking</h3>
        
        <div className="stats shadow mb-6 w-full">
          <div className="stat">
            <div className="stat-title">Trip Total</div>
            <div className="stat-value text-primary">${getTripTotal().toFixed(2)}</div>
          </div>
        </div>

        <div className="space-y-6">
          {tripMembers.map(member => {
            const memberData = memberCosts[member._id];
            if (!memberData || memberData.events.length === 0) return null;

            const paidAmount = getMemberPaidAmount(member._id);
            const unpaidAmount = getMemberUnpaidAmount(member._id);

            return (
              <div key={member._id} className="collapse collapse-arrow bg-base-200">
                <input type="checkbox" defaultChecked={member._id === currentID} />
                <div className="collapse-title">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg">
                        {memberData.username}
                        {member._id === currentID && <span className="badge badge-primary badge-sm ml-2">You</span>}
                      </h4>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-success font-semibold">Paid: ${paidAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-error font-semibold">Unpaid: ${unpaidAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-bold">Total: ${memberData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="collapse-content">
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Cost</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberData.events.map((event, index) => (
                          <tr key={event._id || index} className={event.isPaid ? 'opacity-60' : ''}>
                            <td className="font-medium">{event.title}</td>
                            <td>{moment(event.start).format('MMM D, YYYY')}</td>
                            <td>
                              <span className="badge badge-sm">{event.type}</span>
                            </td>
                            <td className="font-semibold">${event.costPerPerson.toFixed(2)}</td>
                            <td>
                              {event.isPaid ? (
                                <span className="badge badge-success gap-1">
                                  <CheckIcon size={12} />
                                  Paid
                                </span>
                              ) : (
                                <span className="badge badge-error">Unpaid</span>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => handleTogglePayment(event._id, member._id)}
                                className={`btn btn-xs ${event.isPaid ? 'btn-outline' : 'btn-success'}`}
                              >
                                {event.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
};

export default CostTrackingModal;