import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, MessageAuthor, User, UserRole, TicketComment } from '../types';

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

const generateUserCsvContent = (users: User[]): string => {
  const header = ['Full Name', 'Username', 'Email', 'Phone', 'Status'];
  // Exclude password for security in export
  const rows = users.map(u => [`"${u.fullName.replace(/"/g, '""')}"`, u.username, u.email, u.phone, u.isActive !== false ? 'Active' : 'Inactive']);
  return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
};

const downloadUserCsv = (users: User[]) => {
  const csvContent = generateUserCsvContent(users);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'users.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

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
    
    // Construct local comment object for instant state feedback
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
        placeholder="Type a response or internal note..."
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

interface AdminDashboardProps {
  tickets: Ticket[];
  closeMultipleTickets: (ticketIds: number[]) => void;
  users: User[];
  deleteUser: (username: string) => void;
  editUser: (user: User) => void;
  toggleUserStatus: (username: string) => void;
  updateTicketStatus: (ticketId: number, status: TicketStatus) => void;
  currentUser: User;
  addCommentToTicket: (ticketId: number, commentText: string) => void;
  assignTicket: (ticketId: number, assigneeUsername: string) => void;
  addSupportAgent: (newUser: User) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  tickets, 
  closeMultipleTickets, 
  users, 
  deleteUser, 
  editUser, 
  toggleUserStatus, 
  updateTicketStatus,
  currentUser,
  addCommentToTicket,
  assignTicket,
  addSupportAgent
}) => {
  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  const currentSelectedTicket = useMemo(() => {
    if (!selectedTicket) return null;
    return tickets.find(t => t.id === selectedTicket.id) || selectedTicket;
  }, [tickets, selectedTicket]);

  // Keep selected ticket state synchronized with real-time updates from parent tickets prop
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTicket)) {
        setSelectedTicket(updated);
      }
    }
  }, [tickets, selectedTicket]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Edit User State
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<User>({
      fullName: '',
      email: '',
      phone: '',
      username: '',
      password: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'users' | 'analytics'>('tickets');

  // Add Support Agent State
  const [isAddAgentModalVisible, setIsAddAgentModalVisible] = useState(false);
  const [addAgentFormData, setAddAgentFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
  });
  const [addAgentError, setAddAgentError] = useState('');


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTicket(null);
        setSelectedUser(null);
        setIsConfirmModalVisible(false);
        setUserToDelete(null);
        setUserToEdit(null);
        setIsAddAgentModalVisible(false);
        setAddAgentError('');
      }
    };

    if (selectedTicket || isConfirmModalVisible || selectedUser || userToDelete || userToEdit || isAddAgentModalVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTicket, isConfirmModalVisible, selectedUser, userToDelete, userToEdit, isAddAgentModalVisible]);
  
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

  const handleEditClick = (e: React.MouseEvent, user: User) => {
      e.stopPropagation();
      setUserToEdit(user);
      setEditFormData(user);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (userToEdit) {
          editUser(editFormData);
          setUserToEdit(null);
      }
  };

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

  const handleExport = () => {
      if (activeTab === 'tickets') {
          downloadCsv(tickets);
      } else {
          downloadUserCsv(users);
      }
  };
  
  const renderTicketsTab = () => (
    <>
      <div className="space-y-4 animate-spring-up px-2 pt-2">
        <input
            type="text"
            placeholder="Search tickets by ID, summary, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 glass-input rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
            aria-label="Search tickets"
        />
        
        {openFilteredTicketIds.length > 0 && (
             <div className="flex items-center space-x-3 text-sm px-1">
                <input
                    type="checkbox"
                    id="select-all"
                    className="h-4 w-4 rounded bg-white/50 dark:bg-white/10 border-gray-300 dark:border-gray-500 text-cyan-400 focus:ring-cyan-500 cursor-pointer"
                    checked={openFilteredTicketIds.every(id => selectedTicketIds.includes(id))}
                    onChange={handleSelectAll}
                    aria-label="Select all open tickets"
                />
                <label htmlFor="select-all" className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-black dark:hover:text-white">Select all {openFilteredTicketIds.length} open tickets</label>
            </div>
        )}
      </div>
      
      <div className="flex flex-col gap-3 pt-2 px-2 pb-24">
        {filteredTickets.length > 0 ? filteredTickets.map((ticket, idx) => {
            const isSelected = selectedTicketIds.includes(ticket.id);
            return (
              <div 
                key={ticket.id}
                className={`p-4 rounded-xl border interactive-card cursor-pointer flex items-start space-x-4 animate-spring-up ${isSelected ? 'bg-cyan-100 dark:bg-cyan-900/20 border-cyan-500/50' : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {ticket.status === TicketStatus.OPEN && (
                  <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTicketSelect(ticket.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 rounded bg-white/50 dark:bg-white/10 border-gray-300 dark:border-gray-500 text-cyan-400 focus:ring-cyan-500 mt-1 flex-shrink-0 cursor-pointer"
                      aria-label={`Select ticket #${ticket.id}`}
                  />
                )}
                <div className="flex-grow min-w-0" onClick={() => setSelectedTicket(ticket)} role="button" tabIndex={0}>
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-gray-500 dark:text-gray-400 font-mono text-xs">#{ticket.id}</p>
                      <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${ticket.status === TicketStatus.OPEN ? 'bg-green-100 dark:bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                        {ticket.status}
                      </span>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100 font-semibold line-clamp-1 mb-2">{ticket.summary}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">@{ticket.createdBy}</span>
                      <span>{ticket.createdAt}</span>
                  </div>
                </div>
              </div>
            )
        }) : (
            <div className="text-center py-12 text-gray-500 bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 border-dashed animate-spring-up">
                {searchTerm ? 'No tickets match search.' : 'No tickets created yet.'}
            </div>
        )}
      </div>
    </>
  );

  const renderAnalyticsTab = () => {
    // 1. Ticket status statistics
    const openTicketsCount = tickets.filter(t => t.status === TicketStatus.OPEN).length;
    const pendingTicketsCount = tickets.filter(t => t.status === TicketStatus.PENDING).length;
    const closedTicketsCount = tickets.filter(t => t.status === TicketStatus.CLOSED).length;

    // 2. Customer & Support status statistics
    const customerUsers = users.filter(u => u.role === UserRole.CUSTOMER);
    const activeCustomersCount = customerUsers.filter(u => u.isActive !== false).length;
    const inactiveCustomersCount = customerUsers.filter(u => u.isActive === false).length;

    const supportAgents = users.filter(u => u.role === UserRole.SUPPORT);
    const activeSupportCount = supportAgents.filter(u => u.isActive !== false).length;
    const inactiveSupportCount = supportAgents.filter(u => u.isActive === false).length;

    // 3. Average TAT (Turnaround Time) calculation
    // Support either closedAt timestamp or fallback to Date.now (or typical average simulation if fields are empty)
    let totalTatSeconds = 0;
    let computedClosedCount = 0;

    tickets.forEach(ticket => {
      if (ticket.status === TicketStatus.CLOSED) {
        const start = ticket.id; // ticket.id is generated via Date.now() timestamp
        const end = ticket.closedAt ? new Date(ticket.closedAt).getTime() : Date.now();
        const diffMs = end - start;
        if (diffMs > 0) {
          totalTatSeconds += diffMs / 1000;
          computedClosedCount++;
        }
      }
    });

    const averageTatMinutes = computedClosedCount > 0 
      ? Math.round(totalTatSeconds / 60 / computedClosedCount) 
      : 0;

    // 4. Chat chatbot efficiency analytics
    // Traverse historical conversation loops and log ratings
    let upVotes = 0;
    let downVotes = 0;

    // Aggregate feedback votes from conversation loops
    tickets.forEach(ticket => {
      if (ticket.conversationHistory) {
        ticket.conversationHistory.forEach(msg => {
          if (msg.feedback === 'up') upVotes++;
          if (msg.feedback === 'down') downVotes++;
        });
      }
    });

    const totalVotes = upVotes + downVotes;
    const chatbotEfficiencyRate = totalVotes > 0 
      ? Math.round((upVotes / totalVotes) * 100) 
      : 92; // default high-quality initial target behavior

    return (
      <div className="space-y-6 px-2 pt-2 pb-24 animate-spring-up">
        {/* Core Multi-Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Ticket Lifecycle Operations */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/5 space-y-4">
            <div className="flex items-center space-x-3 text-cyan-600 dark:text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18m-3 .75h18A2.25 2.25 0 0 0 21 16.5V7.5A2.25 2.25 0 0 0 18.75 5.25H5.25A2.25 2.25 0 0 0 3 7.5v9A2.25 2.25 0 0 0 5.25 18.75Z" />
              </svg>
              <h3 className="font-bold text-gray-900 dark:text-white">Ticket Status Distribution</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-green-100/50 dark:bg-green-500/10 p-3 rounded-xl text-center border border-green-500/10">
                <p className="text-2xl font-black text-green-600 dark:text-green-400">{openTicketsCount}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Open</p>
              </div>
              <div className="bg-yellow-105 dark:bg-yellow-500/10 p-3 rounded-xl text-center border border-yellow-500/10">
                <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{pendingTicketsCount}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Pending</p>
              </div>
              <div className="bg-blue-100/50 dark:bg-blue-500/10 p-3 rounded-xl text-center border border-blue-500/10">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{closedTicketsCount}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Closed</p>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 leading-relaxed">
              Total Managed Tickets: <strong className="text-gray-900 dark:text-white">{tickets.length}</strong>
            </div>
          </div>

          {/* Customer Directory Operations */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/5 space-y-4">
            <div className="flex items-center space-x-3 text-cyan-600 dark:text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A12.018 12.018 0 0 1 12 21c-3.12 0-5.867-.119-7.824-.355V20.13m0-1.002V18c0-1.11.303-2.13.824-3.003L4.121 15C1.86 16.149 1 18.062 1 19.5v.5h2.122m3.123-5a5.25 5.25 0 0 1 10.5 0M9 7.875a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
              </svg>
              <h3 className="font-bold text-gray-900 dark:text-white">Customer Directory</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-green-100/30 dark:bg-green-500/5 p-3 rounded-xl flex justify-between items-center border border-green-500/10">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Active</span>
                <strong className="text-xl text-green-600 dark:text-green-400 font-extrabold">{activeCustomersCount}</strong>
              </div>
              <div className="bg-red-100/30 dark:bg-red-500/5 p-3 rounded-xl flex justify-between items-center border border-red-500/10">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Inactive</span>
                <strong className="text-xl text-red-600 dark:text-red-400 font-extrabold">{inactiveCustomersCount}</strong>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 leading-relaxed">
              Total customer users: <strong className="text-gray-900 dark:text-white">{customerUsers.length}</strong>
            </div>
          </div>

          {/* Support Agent Directory Operations */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/5 space-y-4">
            <div className="flex items-center space-x-3 text-cyan-600 dark:text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <h3 className="font-bold text-gray-900 dark:text-white">Support Directory</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-green-100/30 dark:bg-green-500/5 p-3 rounded-xl flex justify-between items-center border border-green-500/10">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Active</span>
                <strong className="text-xl text-green-600 dark:text-green-400 font-extrabold">{activeSupportCount}</strong>
              </div>
              <div className="bg-red-100/30 dark:bg-red-500/5 p-3 rounded-xl flex justify-between items-center border border-red-500/10">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Inactive</span>
                <strong className="text-xl text-red-600 dark:text-red-400 font-extrabold">{inactiveSupportCount}</strong>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 leading-relaxed">
              Total support agents: <strong className="text-gray-900 dark:text-white">{supportAgents.length}</strong>
            </div>
          </div>

          {/* Average TAT Resolution Efficiency */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/5 space-y-4">
            <div className="flex items-center space-x-3 text-cyan-600 dark:text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <h3 className="font-bold text-gray-900 dark:text-white">Average Resolution TAT</h3>
            </div>

            <div className="flex items-baseline space-x-2 pt-1">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {averageTatMinutes > 0 ? averageTatMinutes : "N/A"}
              </span>
              <span className="text-sm text-gray-500 font-bold uppercase tracking-lighter">{averageTatMinutes > 0 ? "Minutes" : "Closed Tickets Required"}</span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Computed as hours or minutes between initial customer chat transition and formal administrator closed checkoff events.
            </p>
          </div>

          {/* AI Chatbot Efficiency Rating */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/5 space-y-4">
            <div className="flex items-center space-x-3 text-cyan-600 dark:text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-11.825a.9.9 0 0 0-1.406-1.127l-5.717 6.07M21 12A9 9 0 1 1 3 12a9 9 0 0 1 19 0Z" />
              </svg>
              <h3 className="font-bold text-gray-900 dark:text-white">Chatbot Efficiency Rating</h3>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-4xl font-black text-cyan-500">
                  {chatbotEfficiencyRate}%
                </span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                  {upVotes} Upvotes / {totalVotes} Feedbacks
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${chatbotEfficiencyRate}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Efficiency computed over registered upvotes vs downvotes across actual automated chat events.
            </p>
          </div>

        </div>
      </div>
    );
  };

  const renderUsersTab = () => (
    <div className="space-y-4 px-2">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          Manage system users and support personnel.
        </p>
        <button
          onClick={() => setIsAddAgentModalVisible(true)}
          className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 text-xs shadow-md shadow-cyan-500/20 flex items-center space-x-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Add Support Agent</span>
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-x-auto animate-spring-up mb-20">
        <table className="min-w-full">
          <thead className="bg-gray-100/50 dark:bg-white/5">
            <tr>
              {['Full Name', 'Username', 'Email', 'Status', 'Actions'].map(header => (
                 <th key={header} className="px-5 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {header}
                 </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/5">
            {users.length > 0 ? users.map((user, idx) => (
              <tr key={user.username} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors animate-spring-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <td onClick={() => setSelectedUser(user)} className="px-5 py-4 text-sm cursor-pointer whitespace-nowrap"><p className="text-gray-900 dark:text-white font-medium">{user.fullName}</p></td>
                <td onClick={() => setSelectedUser(user)} className="px-5 py-4 text-sm cursor-pointer whitespace-nowrap"><p className="text-gray-600 dark:text-gray-300">@{user.username}</p></td>
                <td onClick={() => setSelectedUser(user)} className="px-5 py-4 text-sm cursor-pointer whitespace-nowrap"><p className="text-gray-500 dark:text-gray-400">{user.email}</p></td>
                <td className="px-5 py-4 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${user.isActive !== false ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                      {user.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-5 py-4 text-sm text-center whitespace-nowrap">
                  {user.username !== 'admin' && (
                    <div className="flex space-x-2 justify-start">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleUserStatus(user.username); }}
                          className={`p-2 rounded-full transition-colors btn-press ${user.isActive !== false ? 'text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10' : 'text-green-500 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/10'}`}
                          title={user.isActive !== false ? "Deactivate User" : "Activate User"}
                          aria-label={user.isActive !== false ? "Deactivate User" : "Activate User"}
                        >
                           {user.isActive !== false ? (
                             // Stop/Deactivate Icon
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                           ) : (
                             // Play/Activate Icon
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                              </svg>
                           )}
                        </button>
                       <button
                          onClick={(e) => handleEditClick(e, user)}
                          className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 p-2 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-500/10 transition-colors btn-press"
                          aria-label={`Edit user ${user.username}`}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setUserToDelete(user); }}
                          className="text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors btn-press"
                          aria-label={`Delete user ${user.username}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-500">
                  No users have signed up yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-2 space-y-4 relative h-full flex flex-col">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">Dashboard</h2>
         <button
            onClick={handleExport}
            disabled={(activeTab === 'tickets' && tickets.length === 0) || (activeTab === 'users' && users.length === 0) || activeTab === 'analytics'}
            className="bg-green-100 dark:bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 font-bold py-2 px-4 rounded-xl transition-all hover:bg-green-200 dark:hover:bg-green-500/20 active:scale-95 flex items-center space-x-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="text-sm">Export</span>
          </button>
      </div>

      <div className="border-b border-gray-200 dark:border-white/5 mb-2 mx-2">
        <nav className="flex space-x-6">
          <button onClick={() => setActiveTab('tickets')} className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'tickets' ? 'border-cyan-400 text-cyan-600 dark:text-cyan-300' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            Tickets
          </button>
          {currentUser.role === UserRole.ADMIN && (
            <>
              <button onClick={() => setActiveTab('users')} className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users' ? 'border-cyan-400 text-cyan-600 dark:text-cyan-300' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                Onboarded Users
              </button>
              <button onClick={() => setActiveTab('analytics')} className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'analytics' ? 'border-cyan-400 text-cyan-600 dark:text-cyan-300' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                Analytics
              </button>
            </>
          )}
        </nav>
      </div>

      <div className="flex-grow overflow-y-auto scroll-smooth">
        {activeTab === 'tickets' && renderTicketsTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>

      {selectedTicketIds.length > 0 && activeTab === 'tickets' && (
          <div className="absolute bottom-6 left-4 right-4 glass-panel border border-cyan-500/20 rounded-2xl p-4 flex justify-between items-center shadow-2xl animate-spring-up z-20">
              <span className="font-bold text-gray-900 dark:text-white ml-2">{selectedTicketIds.length} selected</span>
              <button
                onClick={() => setIsConfirmModalVisible(true)}
                className="bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
              >
                Close Tickets
              </button>
          </div>
      )}

      {selectedTicket && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => setSelectedTicket(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
            className="glass-panel p-6 rounded-3xl shadow-2xl w-full max-w-2xl relative border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 id="ticket-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center flex-wrap gap-2">
                <span className="bg-white/50 dark:bg-white/10 px-3 py-2 rounded-lg mr-3">#{selectedTicket.id}</span>
                Ticket Details
            </h3>
            <div className="space-y-6 text-sm max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Created By</p>
                    <p className="text-gray-900 dark:text-white font-mono">@{selectedTicket.createdBy}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1.5">Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(TicketStatus) as Array<keyof typeof TicketStatus>).map(statusKey => {
                        const statusVal = TicketStatus[statusKey];
                        const isSelectedStatus = selectedTicket.status === statusVal;
                        let btnStyle = "bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10";
                        if (isSelectedStatus) {
                          if (statusVal === TicketStatus.OPEN) {
                            btnStyle = "bg-green-500 text-white font-bold border border-green-500 shadow-md shadow-green-500/20";
                          } else if (statusVal === TicketStatus.PENDING) {
                            btnStyle = "bg-yellow-500 text-black font-bold border border-yellow-500 shadow-md shadow-yellow-500/20";
                          } else if (statusVal === TicketStatus.CLOSED) {
                            btnStyle = "bg-blue-500 text-white font-bold border border-blue-500 shadow-md shadow-blue-500/20";
                          }
                        }
                        return (
                          <button
                            key={statusVal}
                            type="button"
                            onClick={() => {
                              updateTicketStatus(selectedTicket.id, statusVal);
                              setSelectedTicket(prev => prev ? { ...prev, status: statusVal } : null);
                            }}
                            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-md transition-all active:scale-95 font-bold ${btnStyle}`}
                            aria-label={`Mark ticket as ${statusVal}`}
                          >
                            {statusVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Assignment Area */}
                  <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl col-span-2">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-2">Assignee</p>
                    {currentUser.role === UserRole.ADMIN ? (
                      <select
                        value={selectedTicket.assignedTo || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          assignTicket(selectedTicket.id, val);
                          setSelectedTicket(prev => prev ? { ...prev, assignedTo: val || undefined } : null);
                        }}
                        className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs font-semibold focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {users
                          .filter(u => u.role === UserRole.SUPPORT || u.role === UserRole.ADMIN)
                          .map(u => (
                            <option key={u.username} value={u.username}>
                              {u.fullName} (@{u.username})
                            </option>
                          ))
                        }
                      </select>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-gray-900 dark:text-white text-sm font-semibold">
                          {selectedTicket.assignedTo ? (
                            <span>Assigned to: <strong className="text-cyan-600 dark:text-cyan-400">@{selectedTicket.assignedTo}</strong></span>
                          ) : (
                            <span className="text-gray-500 italic">Unassigned</span>
                          )}
                        </p>
                        {currentUser.role === UserRole.SUPPORT && selectedTicket.assignedTo !== currentUser.username && (
                          <button
                            type="button"
                            onClick={() => {
                              assignTicket(selectedTicket.id, currentUser.username);
                              setSelectedTicket(prev => prev ? { ...prev, assignedTo: currentUser.username } : null);
                            }}
                            className="bg-cyan-400 hover:bg-cyan-300 text-black text-[11px] uppercase tracking-wider font-bold py-2 px-4 rounded-xl transition-all active:scale-95 shadow-md shadow-cyan-500/20"
                          >
                            Assign to Me
                          </button>
                        )}
                      </div>
                    )}
                  </div>
               </div>
               
              <div>
                <p className="text-gray-500 text-xs uppercase font-bold mb-2">AI Summary</p>
                <p className="text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 leading-relaxed">{selectedTicket.summary}</p>
              </div>

              {selectedTicket.escalationMessage && (
                <div>
                  <p className="text-gray-500 text-xs uppercase font-bold mb-2">Detailed Message</p>
                  <p className="text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 whitespace-pre-wrap leading-relaxed">{selectedTicket.escalationMessage}</p>
                </div>
              )}

              {selectedTicket.escalationFile && (
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold mb-2">Attachment</p>
                    <div className="bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                        {selectedTicket.escalationFile.type.startsWith('image/') ? (
                            <img src={selectedTicket.escalationFile.data} alt={selectedTicket.escalationFile.name} className="max-w-full h-auto rounded-lg shadow-lg" />
                        ) : (
                             <a href={selectedTicket.escalationFile.data} download={selectedTicket.escalationFile.name} className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81a1.5 1.5 0 0 0-2.122-2.122Z" />
                                </svg>
                                <span>{selectedTicket.escalationFile.name}</span>
                            </a>
                        )}
                    </div>
                </div>
              )}

               {/* Comments & Timeline */}
               <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                 <p className="text-gray-500 text-xs uppercase font-bold mb-3">Comments & Activity Timeline</p>
                 
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
                       No comments yet. Start the conversation below.
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

      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
            className="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-md relative border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3 shadow-lg">
                    {selectedUser.fullName.charAt(0)}
                </div>
                <h3 id="user-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white">{selectedUser.fullName}</h3>
                <p className="text-cyan-600 dark:text-cyan-400">@{selectedUser.username}</p>
            </div>
            
            <div className="space-y-4">
                <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl flex items-center">
                    <div className="bg-gray-200 dark:bg-black/30 p-2 rounded-lg mr-3 text-gray-500 dark:text-gray-400">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                        <p className="text-gray-900 dark:text-gray-200 text-sm">{selectedUser.email}</p>
                    </div>
                </div>
                <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl flex items-center">
                    <div className="bg-gray-200 dark:bg-black/30 p-2 rounded-lg mr-3 text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                    </div>
                     <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Phone</p>
                        <p className="text-gray-900 dark:text-gray-200 text-sm">{selectedUser.phone}</p>
                    </div>
                </div>
                 <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl flex items-center">
                    <div className="bg-gray-200 dark:bg-black/30 p-2 rounded-lg mr-3 text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
                        </svg>
                    </div>
                     <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Account Status</p>
                         <span className={`text-sm font-bold ${selectedUser.isActive !== false ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {isConfirmModalVisible && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={handleCancelClose}
        >
          <div 
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-sm border-red-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Action</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">Are you sure you want to close {selectedTicketIds.length} ticket(s)? This action is irreversible.</p>
            <div className="flex justify-end space-x-3">
                <button
                    onClick={handleCancelClose}
                    className="bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirmClose}
                    className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                    Yes, Close
                </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => setUserToDelete(null)}
        >
          <div 
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-user-dialog-title"
            className="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-sm border-red-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-user-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete User</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">Permanently delete <strong className="text-gray-900 dark:text-white">@{userToDelete.username}</strong>? This cannot be undone.</p>
            <div className="flex justify-end space-x-3">
                <button
                    onClick={() => setUserToDelete(null)}
                    className="bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirmDeleteUser}
                    className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
                >
                    Delete
                </button>
            </div>
          </div>
        </div>
      )}

      {userToEdit && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => setUserToEdit(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-dialog-title"
            className="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-md border-cyan-500/20"
            onClick={(e) => e.stopPropagation()}
          >
             <h3 id="edit-user-dialog-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Profile</h3>
             <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Full Name</label>
                    <input 
                        name="fullName" 
                        value={editFormData.fullName} 
                        onChange={handleEditChange} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white" 
                        required 
                    />
                </div>
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Email</label>
                    <input 
                        name="email" 
                        type="email" 
                        value={editFormData.email} 
                        onChange={handleEditChange} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white" 
                        required 
                    />
                </div>
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Phone</label>
                    <input 
                        name="phone" 
                        value={editFormData.phone} 
                        onChange={handleEditChange} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white" 
                        required 
                    />
                </div>
                 <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Username</label>
                    <input 
                        name="username" 
                        value={editFormData.username} 
                        readOnly
                        className="w-full p-3 bg-gray-200 dark:bg-white/5 rounded-xl text-gray-500 border border-white/5 cursor-not-allowed" 
                    />
                </div>
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Password</label>
                    <input 
                        name="password" 
                        type="text" 
                        value={editFormData.password} 
                        onChange={handleEditChange} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white font-mono" 
                        required 
                    />
                </div>

                <div className="flex justify-end space-x-3 mt-8">
                    <button
                        type="button"
                        onClick={() => setUserToEdit(null)}
                        className="bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                    >
                        Save
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {isAddAgentModalVisible && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => {
            setIsAddAgentModalVisible(false);
            setAddAgentError('');
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-agent-dialog-title"
            className="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-md border-cyan-500/20"
            onClick={(e) => e.stopPropagation()}
          >
             <h3 id="add-agent-dialog-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-cyan-400">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6 6 0 0 1 6-6h.75a6 6 0 0 1 6 6v.111c0 .762-.408 1.467-1.07 1.837A15.977 15.977 0 0 1 12 21a15.977 15.977 0 0 1-4.68-1.063c-.662-.37-1.07-1.075-1.07-1.838Z" />
                 </svg>
                 <span>Add Support Agent</span>
             </h3>

             {addAgentError && (
               <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                 </svg>
                 <span>{addAgentError}</span>
               </div>
             )}

             <form onSubmit={(e) => {
               e.preventDefault();
               setAddAgentError('');

               const normalizedUsername = addAgentFormData.username.trim().toLowerCase();
               const normalizedEmail = addAgentFormData.email.trim().toLowerCase();

               if (users.some(u => u.username.toLowerCase() === normalizedUsername)) {
                 setAddAgentError('Username is already taken.');
                 return;
               }
               if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
                 setAddAgentError('Email is already in use.');
                 return;
               }

               const newAgent: User = {
                 fullName: addAgentFormData.fullName.trim(),
                 email: normalizedEmail,
                 phone: addAgentFormData.phone.trim(),
                 username: normalizedUsername,
                 password: addAgentFormData.password,
                 role: UserRole.SUPPORT,
                 isActive: true,
               };

               addSupportAgent(newAgent);
               setIsAddAgentModalVisible(false);
               setAddAgentFormData({
                 fullName: '',
                 email: '',
                 phone: '',
                 username: '',
                 password: '',
               });
               setAddAgentError('');
             }} className="space-y-4">
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Full Name</label>
                    <input 
                        name="fullName" 
                        value={addAgentFormData.fullName} 
                        onChange={(e) => setAddAgentFormData({ ...addAgentFormData, fullName: e.target.value })} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white" 
                        placeholder="e.g. John Doe"
                        required 
                    />
                </div>
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Email</label>
                    <input 
                        name="email" 
                        type="email" 
                        value={addAgentFormData.email} 
                        onChange={(e) => setAddAgentFormData({ ...addAgentFormData, email: e.target.value })} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white" 
                        placeholder="e.g. john@ticketing.com"
                        required 
                    />
                </div>
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Phone</label>
                    <input 
                        name="phone" 
                        value={addAgentFormData.phone} 
                        onChange={(e) => setAddAgentFormData({ ...addAgentFormData, phone: e.target.value })} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white" 
                        placeholder="e.g. 123-456-7890"
                        required 
                    />
                </div>
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Username</label>
                    <input 
                        name="username" 
                        value={addAgentFormData.username} 
                        onChange={(e) => setAddAgentFormData({ ...addAgentFormData, username: e.target.value })} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white" 
                        placeholder="e.g. johndoe"
                        required 
                    />
                </div>
                <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase mb-1.5 ml-1">Password</label>
                    <input 
                        name="password" 
                        type="text" 
                        value={addAgentFormData.password} 
                        onChange={(e) => setAddAgentFormData({ ...addAgentFormData, password: e.target.value })} 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white font-mono" 
                        placeholder="Choose a password"
                        required 
                    />
                </div>

                <div className="flex justify-end space-x-3 mt-8">
                    <button
                        type="button"
                        onClick={() => {
                          setIsAddAgentModalVisible(false);
                          setAddAgentError('');
                        }}
                        className="bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                    >
                        Add Agent
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;