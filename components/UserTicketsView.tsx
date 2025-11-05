import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, MessageAuthor } from '../types';

interface UserTicketsViewProps {
  tickets: Ticket[];
}

const UserTicketsView: React.FC<UserTicketsViewProps> = ({ tickets }) => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTicket(null);
      }
    };

    if (selectedTicket) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTicket]);

  const sortedTickets = [...tickets].sort((a, b) => b.id - a.id);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-white">Tickets</h2>
      
      <div className="flex flex-col gap-3">
            {sortedTickets.length > 0 ? sortedTickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)} 
                className="bg-black/20 p-4 rounded-lg border border-white/10 cursor-pointer hover:bg-black/40 hover:border-cyan-400/30 transition-all duration-200 shadow-md hover:shadow-cyan-400/10"
                role="button"
                tabIndex={0}
                aria-label={`View details for ticket #${ticket.id}`}
              >
              <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-200 whitespace-no-wrap font-mono text-sm">#{ticket.id}</p>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${ticket.status === TicketStatus.OPEN ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {ticket.status}
                  </span>
              </div>
              <p className="text-white font-semibold truncate mb-3">{ticket.summary}</p>
              <div className="flex justify-end items-center text-xs text-gray-400">
                  <span>{ticket.createdAt}</span>
              </div>
            </div>
            )) : (
              <div className="text-center py-10 text-gray-500 bg-black/20 rounded-lg">
                You haven't created any tickets yet.
              </div>
            )}
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
    </div>
  );
};

export default UserTicketsView;