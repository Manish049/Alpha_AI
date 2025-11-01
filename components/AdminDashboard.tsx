import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, MessageAuthor } from '../types';

// A simple mock for CSV generation to avoid a heavy library dependency.
const generateCsvContent = (tickets: Ticket[]): string => {
  const header = ['ID', 'Summary', 'Query', 'Status', 'Created At'];
  const rows = tickets.map(t => [t.id, `"${t.summary.replace(/"/g, '""')}"`, `"${t.query.replace(/"/g, '""')}"`, t.status, t.createdAt]);
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
  closeTicket: (ticketId: number) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ tickets, closeTicket }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ticketIdToClose, setTicketIdToClose] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [ticketIdToConfirm, setTicketIdToConfirm] = useState<number | null>(null);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTicket(null);
        setIsConfirmModalVisible(false);
      }
    };

    if (selectedTicket || isConfirmModalVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTicket, isConfirmModalVisible]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === '1234') {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleAttemptCloseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(ticketIdToClose, 10);
    if (!isNaN(id) && tickets.some(t => t.id === id && t.status === TicketStatus.OPEN)) {
      setTicketIdToConfirm(id);
      setIsConfirmModalVisible(true);
    } else {
      alert('Invalid, non-existent, or already closed Ticket ID.');
    }
  };

  const handleConfirmClose = () => {
    if (ticketIdToConfirm !== null) {
        closeTicket(ticketIdToConfirm);
        setTicketIdToClose('');
    }
    setIsConfirmModalVisible(false);
    setTicketIdToConfirm(null);
  }

  const handleCancelClose = () => {
    setIsConfirmModalVisible(false);
    setTicketIdToConfirm(null);
  }

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchLower) return true;
    return (
        ticket.id.toString().includes(searchLower) ||
        ticket.summary.toLowerCase().includes(searchLower) ||
        ticket.query.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => b.id - a.id);
  
  if (!isLoggedIn) {
    return (
      <div className="p-8 flex flex-col justify-center items-center h-full">
        <div className="w-full max-w-sm">
            <h2 className="text-3xl font-bold text-center text-white mb-6">Admin Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-cyan-300/80 text-sm font-bold mb-2" htmlFor="username">
                Username
                </label>
                <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20"
                placeholder="admin"
                />
            </div>
            <div>
                <label className="block text-cyan-300/80 text-sm font-bold mb-2" htmlFor="password">
                Password
                </label>
                <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20"
                placeholder="1234"
                />
            </div>
            {error && <p className="text-red-400 text-xs italic">{error}</p>}
            <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
            >
                Sign In
            </button>
            </form>
            <p className="text-center text-xs text-gray-500 mt-6">
            Hint: Use <strong>admin</strong> & <strong>1234</strong> for this demo.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Ticket Dashboard</h2>
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
      </div>

      <div className="space-y-4">
        <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20"
            aria-label="Search tickets"
        />
        <form onSubmit={handleAttemptCloseTicket} className="flex items-center space-x-2">
            <input
              type="text"
              value={ticketIdToClose}
              onChange={e => setTicketIdToClose(e.target.value)}
              placeholder="Enter Ticket ID to close"
              className="flex-grow p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none text-white placeholder-gray-500 border border-white/20"
            />
            <button type="submit" className="bg-red-500/80 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
              Close
            </button>
        </form>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full">
          <thead className="bg-black/30">
            <tr>
              {['ID', 'Summary', 'Status', 'Created At'].map(header => (
                 <th key={header} className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    {header}
                 </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
              <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="cursor-pointer hover:bg-black/20 transition-colors">
                <td className="px-5 py-4 text-sm"><p className="text-gray-200 whitespace-no-wrap font-mono">#{ticket.id}</p></td>
                <td className="px-5 py-4 text-sm max-w-xs"><p className="text-white font-semibold truncate">{ticket.summary}</p></td>
                <td className="px-5 py-4 text-sm">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${ticket.status === TicketStatus.OPEN ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm"><p className="text-gray-400 whitespace-no-wrap">{ticket.createdAt}</p></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-500">
                    {searchTerm ? 'No tickets match search.' : 'No tickets created yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                <span className="font-semibold text-gray-400">Status:</span>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${selectedTicket.status === TicketStatus.OPEN ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{selectedTicket.status}</span>
              </div>
               <div className="flex justify-between">
                <span className="font-semibold text-gray-400">Created At:</span>
                <span className="text-gray-300">{selectedTicket.createdAt}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-400 mb-1">AI Summary:</p>
                <p className="text-gray-200 bg-black/30 p-3 rounded-md border border-white/10">{selectedTicket.summary}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-400 mb-1">Initial User Query:</p>
                <p className="text-gray-200 bg-black/30 p-3 rounded-md border border-white/10">{selectedTicket.query}</p>
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
            <p className="text-gray-300 mb-6">Are you sure you want to close Ticket #{ticketIdToConfirm}?</p>
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
                    Yes, Close Ticket
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;