import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, MessageAuthor, User, UserRole, TicketComment } from '../types';

interface CommentFormProps {
  ticketId: number;
  addCommentToTicket: (ticketId: number, commentText: string) => void;
  onCommentAdded: (comment: TicketComment) => void;
  currentUser: User;
}

const CommentForm: React.FC<CommentFormProps> = ({ ticketId, addCommentToTicket, onCommentAdded, currentUser }) => {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    addCommentToTicket(ticketId, commentText.trim());
    
    const localComment: TicketComment = {
      id: Date.now().toString(),
      author: currentUser.fullName,
      role: currentUser.role,
      text: commentText.trim(),
      timestamp: new Date().toLocaleString(),
    };
    onCommentAdded(localComment);
    setCommentText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Type a message or response..."
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        className="flex-grow p-3 glass-input rounded-xl focus:outline-none text-xs text-gray-900 dark:text-white placeholder-gray-500"
        required
      />
      <button
        type="submit"
        className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-xs shadow-md shadow-cyan-500/20 flex-shrink-0"
      >
        Send
      </button>
    </form>
  );
};

interface UserTicketsViewProps {
  tickets: Ticket[];
  currentUser: User;
  addCommentToTicket: (ticketId: number, commentText: string) => void;
}

const UserTicketsView: React.FC<UserTicketsViewProps> = ({ tickets, currentUser, addCommentToTicket }) => {
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

  // Keep selected ticket state synchronized with real-time updates from parent tickets prop
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(updated);
      }
    }
  }, [tickets, selectedTicket]);

  const sortedTickets = [...tickets].sort((a, b) => b.id - a.id);

  return (
    <div className="h-full flex flex-col p-4 relative">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 animate-spring-up mb-4 flex-shrink-0">My Tickets</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pb-4">
            {sortedTickets.length > 0 ? sortedTickets.map((ticket, idx) => (
              <div 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)} 
                className="glass-panel p-5 rounded-2xl cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 hover:border-cyan-400/30 transition-all duration-300 interactive-card animate-spring-up group"
                style={{ animationDelay: `${idx * 75}ms` }}
                role="button"
                tabIndex={0}
                aria-label={`View details for ticket #${ticket.id}`}
              >
              <div className="flex justify-between items-center mb-3">
                  <p className="text-gray-500 dark:text-gray-400 font-mono text-xs tracking-wide">#{ticket.id}</p>
                  <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${ticket.status === TicketStatus.OPEN ? 'bg-green-100 dark:bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                    {ticket.status}
                  </span>
              </div>
              <p className="text-gray-900 dark:text-white font-semibold line-clamp-2 mb-4 text-lg leading-snug group-hover:text-cyan-700 dark:group-hover:text-cyan-200 transition-colors">{ticket.summary}</p>
              <div className="flex justify-end items-center text-xs text-gray-500 border-t border-gray-200 dark:border-white/5 pt-3">
                  <span>Created {ticket.createdAt}</span>
              </div>
            </div>
            )) : (
              <div className="text-center py-16 text-gray-500 bg-white/50 dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/5 border-dashed animate-spring-up">
                <p className="mb-2">You haven't created any tickets yet.</p>
                <p className="text-xs">Chat with Roboto Ai to get started.</p>
              </div>
            )}
      </div>

      {selectedTicket && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => setSelectedTicket(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
            className="glass-panel p-8 rounded-[32px] shadow-2xl w-full max-w-2xl relative border-white/10 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-6 right-6 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 id="ticket-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center flex-wrap gap-2">
                 <span className="bg-gradient-to-br from-cyan-500 to-blue-600 h-10 px-3 rounded-xl flex items-center justify-center text-sm shadow-lg whitespace-nowrap text-white">#{selectedTicket.id}</span>
                 <span>Ticket Details</span>
            </h3>
            <div className="space-y-6 text-sm overflow-y-auto pr-2 flex-1 custom-scrollbar">
              <div className="flex justify-between items-center bg-white/50 dark:bg-white/5 p-4 rounded-2xl">
                <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">Status</span>
                <span className={`px-3 py-1 text-xs font-bold rounded-lg ${selectedTicket.status === TicketStatus.OPEN ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>{selectedTicket.status}</span>
              </div>

              {/* Assigned Agent Details */}
              <div className="bg-white/50 dark:bg-white/5 p-4 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-xs">Assigned Agent</span>
                <span className="text-gray-900 dark:text-white font-semibold text-sm">
                  {selectedTicket.assignedTo ? (
                    `@${selectedTicket.assignedTo}`
                  ) : (
                    <span className="text-gray-400 italic">Assignee Pending</span>
                  )}
                </span>
              </div>
              
              <div>
                <p className="font-bold text-gray-500 uppercase text-xs mb-2 pl-1">Summary</p>
                <p className="text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-black/20 p-5 rounded-2xl border border-gray-200 dark:border-white/5 leading-relaxed shadow-inner">{selectedTicket.summary}</p>
              </div>
              <div>
                <p className="font-bold text-gray-500 uppercase text-xs mb-2 pl-1">Your Question</p>
                <p className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-black/20 p-5 rounded-2xl border border-gray-200 dark:border-white/5 leading-relaxed shadow-inner italic">"{selectedTicket.query}"</p>
              </div>

              {selectedTicket.escalationMessage && (
                <div>
                  <p className="font-bold text-gray-500 uppercase text-xs mb-2 pl-1">Additional Details</p>
                  <p className="text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-black/20 p-5 rounded-2xl border border-gray-200 dark:border-white/5 whitespace-pre-wrap leading-relaxed shadow-inner">{selectedTicket.escalationMessage}</p>
                </div>
              )}

              {selectedTicket.escalationFile && (
                <div>
                    <p className="font-bold text-gray-500 uppercase text-xs mb-2 pl-1">Attachment</p>
                    <div className="bg-gray-100 dark:bg-black/20 p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-inner">
                        {selectedTicket.escalationFile.type.startsWith('image/') ? (
                            <img src={selectedTicket.escalationFile.data} alt={selectedTicket.escalationFile.name} className="max-w-full h-auto rounded-lg shadow-lg" />
                        ) : (
                             <a href={selectedTicket.escalationFile.data} download={selectedTicket.escalationFile.name} className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline flex items-center space-x-2 p-2 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81a1.5 1.5 0 0 0-2.122-2.122Z" />
                                </svg>
                                <span className="font-medium">{selectedTicket.escalationFile.name}</span>
                            </a>
                        )}
                    </div>
                </div>
              )}

              {selectedTicket.conversationHistory && (
                <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                  <p className="font-bold text-gray-500 uppercase text-xs mb-4 pl-1">Chat History</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedTicket.conversationHistory.map((msg) => {
                       const isUser = msg.author === MessageAuthor.USER;
                       const isSystem = msg.author === MessageAuthor.SYSTEM;

                       if (isSystem) return null;

                       return (
                         <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-2xl max-w-[85%] text-xs ${isUser ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-transparent rounded-tr-sm shadow-sm' : 'bg-gray-200 dark:bg-black/40 text-gray-700 dark:text-gray-400 rounded-tl-sm'}`}>
                               <p>{msg.text}</p>
                            </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              )}

              {/* Comments & Activity Timeline */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                <p className="text-gray-500 text-xs uppercase font-bold mb-3 pl-1">Comments & Activity Timeline</p>
                
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 mb-4 custom-scrollbar">
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    selectedTicket.comments.map((comment) => {
                      const roleBadgeColor = 
                        comment.role === UserRole.ADMIN 
                          ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          : comment.role === UserRole.SUPPORT 
                          ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : 'bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20';

                      return (
                        <div key={comment.id} className="p-3 rounded-xl bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5 space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center space-x-2">
                              <strong className="text-gray-900 dark:text-white">{comment.author}</strong>
                              <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border ${roleBadgeColor}`}>
                                {comment.role}
                              </span>
                            </div>
                            <span className="text-gray-400 text-[10px]">{comment.timestamp}</span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 text-xs whitespace-pre-wrap leading-relaxed">
                            {comment.text}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-500 italic text-center py-4 bg-gray-50 dark:bg-black/10 rounded-xl border border-dashed border-gray-200 dark:border-white/5">
                      No comments yet.
                    </p>
                  )}
                </div>

                {/* New Comment Input */}
                <CommentForm ticketId={selectedTicket.id} addCommentToTicket={addCommentToTicket} onCommentAdded={(newComment) => {
                  setSelectedTicket(prev => prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : null);
                }} currentUser={currentUser} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTicketsView;