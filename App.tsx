import React, { useState, useCallback, useEffect } from 'react';
import { Ticket, Message, TicketStatus, MessageAuthor, User, LoadingState, UserRole, TicketComment } from './types';
import ChatView from './components/ChatView';
import AdminDashboard from './components/AdminDashboard';
import Auth from './components/Auth';
import UserTicketsView from './components/UserTicketsView';
import { createTicketSummary, getAiResponse, initializeKnowledgeBase } from './services/geminiService';

enum Tab {
  CHAT = 'chat',
  ADMIN = 'admin',
  MY_TICKETS = 'my_tickets',
}

interface EscalationDetails {
  message: string;
  file?: {
    name: string;
    type: string;
    data: string;
  };
}

const initialMessages: Message[] = [
  {
    id: 'initial',
    author: MessageAuthor.BOT,
    text: "Hi there! I'm Roboto Ai. 👋\n\nI can help you with **Urban Streak** fashion, **Barbary Lion** luxury goods, **FitMax** activewear, or **NovaTech** electronics.\n\nWhat can I do for you today?",
    timestamp: new Date().toISOString(),
    suggestions: ["Return Policy", "Track Order", "Troubleshoot Device", "Reset Password"],
  },
];

const RobotIconHeader = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] dark:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] flex-shrink-0 animate-float">
    <path d="M12 2L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 3.34155C18.9997 4.22717 20.5 6.42857 20.5 9V12C20.5 14.7614 18.2614 17 15.5 17H8.5C5.73858 17 3.5 14.7614 3.5 12V9C3.5 6.42857 5.00031 4.22717 7 3.34155" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 17L7.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.5 17L16.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHAT);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  })  // Apply theme to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  
  // Initialize users with default demo accounts if missing
  const [users, setUsers] = useState<User[]>(() => {
    const demoAdmin: User = {
        username: 'admin',
        password: 'admin123',
        fullName: 'System Admin',
        email: 'admin@ticketing.com',
        phone: '123-456-7890',
        isActive: true,
        role: UserRole.ADMIN
    };
    const demoSupport: User = {
        username: 'support',
        password: 'support123',
        fullName: 'Support Agent',
        email: 'support@ticketing.com',
        phone: '123-456-7891',
        isActive: true,
        role: UserRole.SUPPORT
    };
    const demoCustomer: User = {
        username: 'customer',
        password: 'customer123',
        fullName: 'Demo Customer',
        email: 'customer@ticketing.com',
        phone: '123-456-7892',
        isActive: true,
        role: UserRole.CUSTOMER
    };
    const defaultUsers = [demoAdmin, demoSupport, demoCustomer];

    try {
      const storedUsers = localStorage.getItem('helpdesk-users');
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        if (Array.isArray(parsedUsers)) {
          let updatedUsers = [...parsedUsers];
          defaultUsers.forEach(defUser => {
            const exists = updatedUsers.some(u => u.username === defUser.username);
            if (!exists) {
              updatedUsers.push(defUser);
            } else {
              // Ensure credentials are updated to match the requested demo data
              const index = updatedUsers.findIndex(u => u.username === defUser.username);
              updatedUsers[index] = { ...updatedUsers[index], ...defUser };
            }
          });
          return updatedUsers;
        }
      }
      return defaultUsers;
    } catch (error) {
      console.error("Error parsing users from localStorage", error);
      return defaultUsers;
    }
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const storedTickets = localStorage.getItem('helpdesk-tickets');
      return storedTickets ? JSON.parse(storedTickets) : [];
    } catch (error) {
      console.error("Error parsing tickets from localStorage", error);
      return [];
    }
  });

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  
  // Initialize Embeddings on mount
  useEffect(() => {
    initializeKnowledgeBase();
  }, []);

  // Check for logged-in session on mount
  useEffect(() => {
    try {
      const loggedInUsername = localStorage.getItem('helpdesk-currentUser');
      if (loggedInUsername) {
        const user = users.find((u: User) => u.username === loggedInUsername);
        if (user) {
          if (user.isActive === false) {
             localStorage.removeItem('helpdesk-currentUser');
             setCurrentUser(null);
          } else {
             setCurrentUser(user);
             if (user.role === UserRole.ADMIN) {
                setIsAdmin(true);
                setActiveTab(Tab.ADMIN);
             } else if (user.role === UserRole.SUPPORT) {
                setIsAdmin(false);
                setActiveTab(Tab.ADMIN);
             } else {
                setIsAdmin(false);
                setActiveTab(Tab.CHAT);
             }
          }
        }
      }
    } catch (error) {
      console.error("Error loading currentUser from localStorage", error);
    }
  }, [users]); 

  // Persist tickets whenever they change
  useEffect(() => {
    localStorage.setItem('helpdesk-tickets', JSON.stringify(tickets));
  }, [tickets]);
  
  // Persist users whenever they change
  useEffect(() => {
    localStorage.setItem('helpdesk-users', JSON.stringify(users));
  }, [users]);

  // Real-time updates: listen for cross-tab storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'helpdesk-tickets') {
        try {
          const newTickets = e.newValue ? JSON.parse(e.newValue) : [];
          setTickets(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newTickets)) {
              return newTickets;
            }
            return prev;
          });
        } catch (err) {
          console.error("Error parsing tickets from storage event:", err);
        }
      }
      if (e.key === 'helpdesk-users') {
        try {
          const newUsers = e.newValue ? JSON.parse(e.newValue) : [];
          setUsers(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newUsers)) {
              return newUsers;
            }
            return prev;
          });
        } catch (err) {
          console.error("Error parsing users from storage event:", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Real-time updates: backup fast polling to reflect direct non-event state changes instantly
  useEffect(() => {
    const intervalId = setInterval(() => {
      try {
        const storedTicketsStr = localStorage.getItem('helpdesk-tickets');
        if (storedTicketsStr) {
          const storedTickets = JSON.parse(storedTicketsStr);
          setTickets(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(storedTickets)) {
              return storedTickets;
            }
            return prev;
          });
        }
        const storedUsersStr = localStorage.getItem('helpdesk-users');
        if (storedUsersStr) {
          const storedUsers = JSON.parse(storedUsersStr);
          setUsers(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(storedUsers)) {
              return storedUsers;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Error active polling sync:", err);
      }
    }, 1000); // Check every second for snappy and prompt real-time updates

    return () => clearInterval(intervalId);
  }, []);

  // Load/save messages when the current user changes
  useEffect(() => {
    if (currentUser) {
      try {
        const storedMessages = localStorage.getItem(`helpdesk-messages-${currentUser.username}`);
        if (storedMessages) {
            const parsed = JSON.parse(storedMessages);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
            } else {
              setMessages(initialMessages);
            }
        } else {
          setMessages(initialMessages);
        }
      } catch (error) {
          console.error("Error parsing messages from localStorage", error);
          setMessages(initialMessages);
      }
    } else {
      setMessages(initialMessages);
    }
  }, [currentUser]);

  // Persist messages for the current user
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`helpdesk-messages-${currentUser.username}`, JSON.stringify(messages));
    }
  }, [messages, currentUser]);
  
  // Redirect customer if they somehow land on Tab.ADMIN
  useEffect(() => {
    if (currentUser && currentUser.role === UserRole.CUSTOMER && activeTab === Tab.ADMIN) {
      setActiveTab(Tab.CHAT);
    }
  }, [currentUser, activeTab]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const addTicket = useCallback(async (query: string, chatHistory: Message[], escalationDetails: EscalationDetails) => {
    if (!currentUser) return 0;
    setLoadingState('escalating');
    let newTicketId: number;
    try {
      const summary = await createTicketSummary(chatHistory);
      const newTicket: Ticket = {
        id: Date.now(),
        summary: summary,
        query: query,
        status: TicketStatus.OPEN,
        createdAt: new Date().toLocaleString(),
        conversationHistory: chatHistory,
        escalationMessage: escalationDetails.message,
        escalationFile: escalationDetails.file,
        createdBy: currentUser.username,
      };
      newTicketId = newTicket.id;
      setTickets(prevTickets => [...prevTickets, newTicket]);
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        author: MessageAuthor.SYSTEM,
        text: `Ticket #${newTicket.id} created. An agent will review it shortly.`,
        timestamp: new Date().toISOString(),
      };
      addMessage(systemMessage);
      return newTicket.id;
    } catch (error) {
      console.error("Failed to create ticket summary:", error);
      const newTicket: Ticket = {
        id: Date.now(),
        summary: "Could not generate AI summary.",
        query: query,
        status: TicketStatus.OPEN,
        createdAt: new Date().toLocaleString(),
        conversationHistory: chatHistory,
        escalationMessage: escalationDetails.message,
        escalationFile: escalationDetails.file,
        createdBy: currentUser.username,
      };
      newTicketId = newTicket.id;
      setTickets(prevTickets => [...prevTickets, newTicket]);
       const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        author: MessageAuthor.SYSTEM,
        text: `Ticket #${newTicket.id} created (AI summary failed). An agent will review it shortly.`,
        timestamp: new Date().toISOString(),
      };
      addMessage(systemMessage);
      return newTicket.id;
    } finally {
      setLoadingState('idle');
    }
  }, [addMessage, currentUser]);

  const closeMultipleTickets = useCallback((ticketIds: number[]) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticketIds.includes(ticket.id) ? { ...ticket, status: TicketStatus.CLOSED, closedAt: new Date().toISOString() } : ticket
      )
    );
  }, []);

  const updateTicketStatus = useCallback((ticketId: number, status: TicketStatus) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { 
          ...ticket, 
          status, 
          closedAt: status === TicketStatus.CLOSED ? new Date().toISOString() : undefined 
        } : ticket
      )
    );
  }, []);

  const addCommentToTicket = useCallback((ticketId: number, commentText: string) => {
    if (!currentUser) return;
    const newComment: TicketComment = {
      id: Date.now().toString(),
      author: currentUser.fullName,
      role: currentUser.role,
      text: commentText,
      timestamp: new Date().toLocaleString(),
    };
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? {
          ...ticket,
          comments: [...(ticket.comments || []), newComment]
        } : ticket
      )
    );
  }, [currentUser]);

  const assignTicket = useCallback((ticketId: number, assigneeUsername: string) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? {
          ...ticket,
          assignedTo: assigneeUsername
        } : ticket
      )
    );
  }, []);
  
  const deleteUser = useCallback((usernameToDelete: string) => {
    if (usernameToDelete === 'admin') {
      alert("The admin user cannot be deleted.");
      return;
    }
    setUsers(prevUsers => prevUsers.filter(user => user.username !== usernameToDelete));
  }, []);

  const addSupportAgent = useCallback((newAgent: User) => {
    setUsers(prevUsers => [...prevUsers, newAgent]);
  }, []);

  const handleEditUser = useCallback((updatedUser: User) => {
    setUsers(prevUsers => prevUsers.map(user => user.username === updatedUser.username ? updatedUser : user));
  }, []);

  const toggleUserStatus = useCallback((username: string) => {
    if (username === 'admin') {
      alert("The admin user cannot be deactivated.");
      return;
    }
    setUsers(prevUsers => prevUsers.map(user => 
      user.username === username ? { ...user, isActive: user.isActive === undefined ? false : !user.isActive } : user
    ));
  }, []);

  const handleResetPassword = useCallback((username: string, newPassword: string) => {
     setUsers(prevUsers => prevUsers.map(user => user.username === username ? { ...user, password: newPassword } : user));
  }, []);

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || loadingState !== 'idle') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      author: MessageAuthor.USER,
      text: userInput,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoadingState('typing');

    try {
      const { text: botResponseText, suggestions } = await getAiResponse(userInput, newMessages);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        author: MessageAuthor.BOT,
        text: botResponseText,
        timestamp: new Date().toISOString(),
        suggestions: suggestions,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch(error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        author: MessageAuthor.BOT,
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoadingState('idle');
    }
  };

  const handleFeedback = useCallback((messageId: string, feedback: 'up' | 'down') => {
    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, feedback: msg.feedback === feedback ? undefined : feedback };
        }
        return msg;
      })
    );
  }, []);
  
  const handleNewChat = () => {
    setMessages(initialMessages);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    localStorage.removeItem('helpdesk-currentUser');
  };

  const handleLogin = (user: User) => {
    if (user.role === UserRole.ADMIN) {
        setIsAdmin(true);
        setActiveTab(Tab.ADMIN);
    } else if (user.role === UserRole.SUPPORT) {
        setIsAdmin(false);
        setActiveTab(Tab.ADMIN);
    } else {
        setIsAdmin(false);
        setActiveTab(Tab.CHAT);
    }
    setCurrentUser(user);
    localStorage.setItem('helpdesk-currentUser', user.username);
  };
  
  const handleSignup = (newUser: User) => {
    const userWithStatus = { ...newUser, isActive: true, role: UserRole.CUSTOMER };
    setUsers(prevUsers => [...prevUsers, userWithStatus]);
    handleLogin(userWithStatus);
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 overflow-y-auto bg-transparent">
        <div className="w-full max-w-md my-8 relative z-10">
           <Auth onLogin={handleLogin} onSignup={handleSignup} onResetPassword={handleResetPassword} users={users} />
        </div>
      </div>
    )
  }

  const SegmentedControl: React.FC = () => (
    <div className="bg-gray-200/50 dark:bg-black/30 backdrop-blur-md rounded-full flex items-center p-1 border border-gray-300 dark:border-white/5">
      <button
        onClick={() => setActiveTab(Tab.CHAT)}
        className={`flex items-center space-x-2 px-3 sm:px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
          activeTab === Tab.CHAT
            ? 'bg-white dark:bg-cyan-400 text-black shadow-lg shadow-gray-200/50 dark:shadow-cyan-500/30'
            : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.06c-.247.007-.49.032-.728.082a.75.75 0 0 1-.634-.89A11.952 11.952 0 0 0 15 12c0-1.953-.423-3.8-1.157-5.498a.75.75 0 0 1 .634-.89c.238.05.48.075.728.082l3.722.06A2.25 2.25 0 0 1 20.25 8.511Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12c0-1.355-.322-2.662-.898-3.868c-1.921-3.92-6.06-6.632-10.852-6.632C2.122 1.5 1.5 2.122 1.5 3v8.692c0 4.79 3.865 8.692 8.692 8.692c.35 0 .69-.012 1.026-.035c2.31-.192 4.4-1.043 6.096-2.428c.456-.323.533-.94.173-1.314c-.36-.373-.936-.42-1.358-.113c-1.173.834-2.492 1.343-3.87 1.488c-.563.045-1.12.068-1.67.068c-4.032 0-7.308-3.276-7.308-7.308V3c0-.414.336-.75.75-.75c4.116 0 7.74 2.456 9.42 5.868C15.428 9.338 15.75 10.645 15.75 12Z" />
        </svg>
        <span className="hidden sm:inline">Chat</span>
      </button>
      {currentUser.role !== UserRole.CUSTOMER ? (
        <button
          onClick={() => setActiveTab(Tab.ADMIN)}
          className={`flex items-center space-x-2 px-3 sm:px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
            activeTab === Tab.ADMIN
              ? 'bg-white dark:bg-cyan-400 text-black shadow-lg shadow-gray-200/50 dark:shadow-cyan-500/30'
              : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.6-3.75a11.959 11.959 0 0 1-2.102-3.036m-7.222-7.036a11.959 11.959 0 0 0-2.102 3.036M15 2.25a11.959 11.959 0 0 0-2.102 3.036m0 0A11.959 11.959 0 0 1 12 2.25c-2.786 0-5.433.608-7.818 1.74a11.959 11.959 0 0 0-2.102 3.036" />
          </svg>
          <span className="hidden sm:inline">
            {currentUser.role === UserRole.ADMIN ? 'Admin' : 'Support'}
          </span>
        </button>
      ) : (
         <button
          onClick={() => setActiveTab(Tab.MY_TICKETS)}
          className={`flex items-center space-x-2 px-3 sm:px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
            activeTab === Tab.MY_TICKETS
              ? 'bg-white dark:bg-cyan-400 text-black shadow-lg shadow-gray-200/50 dark:shadow-cyan-500/30'
              : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18m-3 .75h18A2.25 2.25 0 0 0 21 16.5V7.5A2.25 2.25 0 0 0 18.75 5.25H5.25A2.25 2.25 0 0 0 3 7.5v9A2.25 2.25 0 0 0 5.25 18.75Z" />
          </svg>
          <span className="hidden sm:inline">Tickets</span>
        </button>
      )}
    </div>
  );

  const userTickets = tickets.filter(t => t.createdBy === currentUser.username);

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      
      {/* Floating Action Buttons Left Side - Centered Vertically */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 sm:left-6 z-50 flex flex-col gap-4">
         {/* Theme Toggle */}
         <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="p-3 sm:p-4 rounded-full glass-panel shadow-lg hover:shadow-cyan-500/20 border border-gray-200 dark:border-white/20 bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-white/10 transition-all duration-300 active:scale-90 group animate-spring-up" 
            aria-label="Toggle Theme"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
         >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 group-hover:rotate-12 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 group-hover:-rotate-12 transition-transform">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
         </button>

         {/* Reset / New Chat */}
         {activeTab === Tab.CHAT && (
            <button 
              onClick={handleNewChat} 
              className="p-3 sm:p-4 rounded-full glass-panel shadow-lg hover:shadow-cyan-500/20 border border-gray-200 dark:border-white/20 bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-white/10 transition-all duration-300 active:scale-90 group animate-spring-up" 
              style={{ animationDelay: '100ms' }}
              aria-label="New Chat"
              title="Start New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 dark:text-cyan-400 group-hover:rotate-180 transition-transform duration-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.992m0 0h-4.992m4.992 0-3.181-3.183a8.25 8.25 0 0 0-11.667 0L2.985 16.952" />
              </svg>
            </button>
          )}
      </div>

      <div className="w-full max-w-[450px] h-full max-h-[850px] glass-panel rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-spring-up transition-all duration-300 relative z-10 border border-white/20">
        <header className="p-4 sm:p-5 flex items-center border-b border-gray-200 dark:border-white/5 shrink-0 bg-white/40 dark:bg-black/20">
          <div className="flex items-center space-x-3 min-w-0">
             <RobotIconHeader />
             <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px]">@{currentUser.username}</span>
             </div>
          </div>
           <div className="flex items-center space-x-2 ml-auto">
            <SegmentedControl />
            <button onClick={handleLogout} className="p-2 sm:p-3 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all active:scale-90" aria-label="Logout">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {activeTab === Tab.CHAT && <ChatView messages={messages} onSendMessage={handleSendMessage} loadingState={loadingState} onEscalate={addTicket} onFeedback={handleFeedback} />}
          {activeTab === Tab.ADMIN && currentUser.role !== UserRole.CUSTOMER && (
            <AdminDashboard 
              tickets={tickets} 
              closeMultipleTickets={closeMultipleTickets} 
              users={users} 
              deleteUser={deleteUser} 
              editUser={handleEditUser} 
              toggleUserStatus={toggleUserStatus} 
              updateTicketStatus={updateTicketStatus}
              currentUser={currentUser}
              addCommentToTicket={addCommentToTicket}
              assignTicket={assignTicket}
              addSupportAgent={addSupportAgent}
            />
          )}
          {activeTab === Tab.MY_TICKETS && currentUser.role === UserRole.CUSTOMER && (
            <UserTicketsView 
              tickets={userTickets} 
              currentUser={currentUser}
              addCommentToTicket={addCommentToTicket}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;