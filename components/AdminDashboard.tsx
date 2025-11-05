import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, MessageAuthor, User } from '../types';

// A simple mock for CSV generation to avoid a heavy library dependency.
const generateCsvContent = (tickets: Ticket[]): string => {
  const header = ['ID', 'Summary', 'Query', 'Status', 'Created At', 'Created By'];
  const rows = tickets.map(t => [t.id, `"${t.summary.replace(/"/g, '""')}"`, `"${t.query.replace(/"/g, '""')}"`, t.status, t.createdAt, t.createdBy]);
  return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
};

const downloadCsv = (tickets: Ticket[]) => {
  const csvContent = generateCsvContent(tickets);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tickets.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


interface AdminDashboardProps {
  tickets: Ticket[];
  closeMultipleTickets: (ticketIds: number[]) => void;
  users: User[];
  deleteUser: (username: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ tickets, closeMultipleTickets, users, deleteUser }) => {
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'users'>('tickets');


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTicket(null);
        setSelectedUser(null);
        setIsConfirmModalVisible(false);
        setUserToDelete(null);
      }
    };

    if (selectedTicket || isConfirmModalVisible || selectedUser || userToDelete) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTicket, isConfirmModalVisible, selectedUser, userToDelete]);
  
  const handleConfirmClose = () => {
    if (selectedTicketIds.length > 0) {
        closeMultipleTickets(selectedTicketIds);
        setSelectedTicketIds([]);
    }
    setIsConfirmModalVisible(false);
  }

  const handleCancelClose = () => {
    setIsConfirmModalVisible(false);
  }

  const handleConfirmDeleteUser = () => {
    if (userToDelete) {
        deleteUser(userToDelete.username);
        setUserToDelete(null);
    }
  }

  const filteredTickets = useMemo(() => tickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchLower) return true;
    return (
        ticket.id.toString().includes(searchLower) ||
        ticket.summary.toLowerCase().includes(searchLower) ||
        ticket.query.toLowerCase().includes(searchLower) ||
        ticket.createdBy.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => b.id - a.id), [tickets, searchTerm]);
  
  const openFilteredTicketIds = useMemo(() => 
    filteredTickets.filter(t => t.status === TicketStatus.OPEN).map(t => t.id),
    [filteredTickets]
  );

  const handleTicketSelect = (ticketId: number) => {
    setSelectedTicketIds(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };
  
  const handleSelectAll = () => {
      const allSelected = openFilteredTicketIds.length > 0 && openFilteredTicketIds.every(id => selectedTicketIds.includes(id));
      if (allSelected) {
        setSelectedTicketIds(prev => prev.filter(id => !openFilteredTicketIds.includes(id)));
      } else {
        setSelectedTicketIds(prev => [...new Set([...prev, ...openFilteredTicketIds])]);
      }
  };
  
  const renderTicketsTab = () => (
    <>
      <div className="space-y-4">
        <input
            type="text"
            placeholder="Search tickets by ID, summary, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20"
            aria-label="Search tickets"
        />
        
        {openFilteredTicketIds.length > 0 && (
             <div className="flex items-center space-x-3 text-sm">
                <input
                    type="checkbox"
                    id="select-all"
                    className="h-4 w-4 rounded bg-black/30 border-gray-500 text-cyan-400 focus:ring-cyan-500"
                    checked={openFilteredTicketIds.every(id => selectedTicketIds.includes(id))}
                    onChange={handleSelectAll}
                    aria-label="Select all open tickets"
                />
                <label htmlFor="select-all" className="text-gray-300">Select all {openFilteredTicketIds.length} open tickets</label>
            </div>
        )}
      </div>
      
      <div className="flex flex-col gap-3">
        {filteredTickets.length > 0 ? filteredTickets.map(ticket => {
            const isSelected = selectedTicketIds.includes(ticket.id);
            return (
              <div 
                key={ticket.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 shadow-md flex items-start space-x-4 ${isSelected ? 'bg-cyan-900/30 border-cyan-400/50' : 'bg-black/20 border-white/10 hover:bg-black/40 hover:border-cyan-400/30'}`}
              >
                {ticket.status === TicketStatus.OPEN && (
                  <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTicketSelect(ticket.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 rounded bg-black/30 border-gray-500 text-cyan-400 focus:ring-cyan-500 mt-1 flex-shrink-0"
                      aria-label={`Select ticket #${ticket.id}`}
                  />
                )}
                <div className="flex-grow min-w-0" onClick={() => setSelectedTicket(ticket)} role="button" tabIndex={0}>
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-gray-200 whitespace-no-wrap font-mono text-sm">#{ticket.id}</p>
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${ticket.status === TicketStatus.OPEN ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {ticket.status}
                      </span>
                  </div>
                  <p className="text-white font-semibold truncate mb-3">{ticket.summary}</p>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>@{ticket.createdBy}</span>
                      <span>{ticket.createdAt}</span>
                  </div>
                </div>
              </div>
            )
        }) : (
            <div className="text-center py-10 text-gray-500 bg-black/20 rounded-lg">
                {searchTerm ? 'No tickets match search.' : 'No tickets created yet.'}
            </div>
        )}
      </div>
    </>
  );

  const renderUsersTab = () => (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full">
        <thead className="bg-black/30">
          <tr>
            {['Full Name', 'Username', 'Email', 'Actions'].map(header => (
               <th key={header} className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {header}
               </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {users.length > 0 ? users.map(user => (
            <tr key={user.username} className="hover:bg-black/20 transition-colors">
              <td onClick={() => setSelectedUser(user)} className="px-5 py-4 text-sm cursor-pointer"><p className="text-white font-semibold">{user.fullName}</p></td>
              <td onClick={() => setSelectedUser(user)} className="px-5 py-4 text-sm cursor-pointer"><p className="text-gray-300">@{user.username}</p></td>
              <td onClick={() => setSelectedUser(user)} className="px-5 py-4 text-sm cursor-pointer"><p className="text-gray-400">{user.email}</p></td>
              <td className="px-5 py-4 text-sm text-center">
                {user.username !== 'admin' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setUserToDelete(user); }}
                    className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-500/20 transition-colors"
                    aria-label={`Delete user ${user.username}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="text-center py-10 text-gray-500">
                No users have signed up yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 space-y-4 relative h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        {activeTab === 'tickets' && (
          <button
            onClick={() => downloadCsv(tickets)}
            disabled={tickets.length === 0}
            className="bg-green-500/20 border border-green-400/50 text-green-300 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2 hover:bg-green-500/40 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Export</span>
          </button>
        )}
      </div>

      <div className="border-b border-white/10 mb-4">
        <nav className="flex space-x-4">
          <button onClick={() => setActiveTab('tickets')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tickets' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>
            Tickets
          </button>
          <button onClick={() => setActiveTab('users')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>
            Onboarded Users
          </button>
        </nav>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 pb-20">
        {activeTab === 'tickets' ? renderTicketsTab() : renderUsersTab()}
      </div>

      {selectedTicketIds.length > 0 && activeTab === 'tickets' && (
          <div className="absolute bottom-4 left-4 right-4 bg-gray-900/80 backdrop-blur-md border border-white/20 rounded-xl p-4 flex justify-between items-center shadow-lg animate-fade-in-up">
              <span className="font-semibold text-white">{selectedTicketIds.length} ticket(s) selected</span>
              <button
                onClick={() => setIsConfirmModalVisible(true)}
                className="bg-red-500/80 hover:bg-red-500 text-white font-bold py-2 px-5 rounded-lg transition-colors"
              >
                Close Selected
              </button>
          </div>
      )}

      {selectedTicket && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
            className="bg-[#0A1F1F] border border-cyan-500/30 p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 id="ticket-modal-title" className="text-xl font-bold text-cyan-300 mb-4">Ticket #{selectedTicket.id}</h3>
            <div className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-400">Created By:</span>
                <span className="text-gray-300 font-mono">@{selectedTicket.createdBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-400">Status:</span>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${selectedTicket.status === TicketStatus.OPEN ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{selectedTicket.status}</span>
              </div>
               <div className="flex justify-between">
                <span className="font-semibold text-gray-400">Created At:</span>
                <span className="text-gray-300">{selectedTicket.createdAt}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-400 mb-1">AI Summary:</p>
                <p className="text-gray-200 bg-black/30 p-3 rounded-md border border-white/10 break-words">{selectedTicket.summary}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400 mb-1">Initial User Query:</p>
                <p className="text-gray-200 bg-black/30 p-3 rounded-md border border-white/10 break-words">{selectedTicket.query}</p>
              </div>

              {selectedTicket.escalationMessage && (
                <div>
                  <p className="font-semibold text-gray-400 mb-1">User's Detailed Message:</p>
                  <p className="text-gray-200 bg-black/30 p-3 rounded-md border border-white/10 whitespace-pre-wrap">{selectedTicket.escalationMessage}</p>
                </div>
              )}

              {selectedTicket.escalationFile && (
                <div>
                    <p className="font-semibold text-gray-400 mb-2">Attachment:</p>
                    <div className="bg-black/30 p-3 rounded-md border border-white/10">
                        {selectedTicket.escalationFile.type.startsWith('image/') ? (
                            <img src={selectedTicket.escalationFile.data} alt={selectedTicket.escalationFile.name} className="max-w-full h-auto rounded-md" />
                        ) : (
                             <a href={selectedTicket.escalationFile.data} download={selectedTicket.escalationFile.name} className="text-cyan-400 hover:underline flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81a1.5 1.5 0 0 0-2.122-2.122Z" />
                                </svg>
                                <span>{selectedTicket.escalationFile.name}</span>
                            </a>
                        )}
                    </div>
                </div>
              )}

              {selectedTicket.conversationHistory && (
                <div>
                  <p className="font-semibold text-gray-400 mb-2">Full Conversation History:</p>
                  <div className="space-y-4 bg-black/30 p-3 rounded-md max-h-60 overflow-y-auto border border-white/10">
                    {selectedTicket.conversationHistory.map((msg) => {
                       const isUser = msg.author === MessageAuthor.USER;
                       const isSystem = msg.author === MessageAuthor.SYSTEM;

                       if (isSystem) {
                         return (
                           <div key={msg.id} className="w-full text-center text-xs text-cyan-400/80 py-1 italic">
                             {msg.text}
                           </div>
                         )
                       }

                       return (
                         <div key={msg.id} className={`flex items-end gap-2 text-sm ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-[80%] shadow ${isUser ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                               <p className="font-bold text-xs mb-1">{isUser ? 'User' : 'Roboto Ai'}</p>
                               <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            className="bg-[#0A1F1F] border border-cyan-500/30 p-6 rounded-2xl shadow-2xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 id="user-modal-title" className="text-xl font-bold text-cyan-300 mb-4">User Details</h3>
            <div className="space-y-3 text-sm">
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Full Name:</span> <span className="text-gray-200">{selectedUser.fullName}</span></p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Username:</span> <span className="text-gray-200">@{selectedUser.username}</span></p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Email:</span> <span className="text-gray-200">{selectedUser.email}</span></p>
                <p><span className="font-semibold text-gray-400 w-24 inline-block">Phone:</span> <span className="text-gray-200">{selectedUser.phone}</span></p>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
          onClick={handleCancelClose}
        >
          <div 
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="bg-[#0A1F1F] border border-red-500/30 p-6 rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-xl font-bold text-white mb-4">Confirm Closure</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to close the selected {selectedTicketIds.length} ticket(s)?</p>
            <div className="flex justify-end space-x-4">
                <button
                    onClick={handleCancelClose}
                    className="bg-gray-500/20 border border-gray-400/50 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-gray-500/40"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirmClose}
                    className="bg-red-500/80 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    Yes, Close Tickets
                </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
          onClick={() => setUserToDelete(null)}
        >
          <div 
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-user-dialog-title"
            className="bg-[#0A1F1F] border border-red-500/30 p-6 rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-user-dialog-title" className="text-xl font-bold text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete user <strong className="text-red-400">@{userToDelete.username}</strong>? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
                <button
                    onClick={() => setUserToDelete(null)}
                    className="bg-gray-500/20 border border-gray-400/50 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-gray-500/40"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirmDeleteUser}
                    className="bg-red-500/80 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    Yes, Delete User
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;