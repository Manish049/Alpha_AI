import React, { useState, useCallback, useEffect } from 'react';
import { Ticket, Message, TicketStatus, MessageAuthor, User } from './types';
import ChatView from './components/ChatView';
import AdminDashboard from './components/AdminDashboard';
import Auth from './components/Auth';
import UserTicketsView from './components/UserTicketsView';
import { createTicketSummary, getAiResponse } from './services/geminiService';

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
    text: "Hello! I'm Roboto Ai. How can I assist you with your OnePlus device today?",
    timestamp: new Date().toISOString(),
  },
];

const RobotIconHeader = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] flex-shrink-0">
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
  
  // Use lazy initializer to load users from localStorage only once on initial render
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const storedUsers = localStorage.getItem('helpdesk-users');
      return storedUsers ? JSON.parse(storedUsers) : [];
    } catch (error) {
      console.error("Error parsing users from localStorage", error);
      return [];
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
  const [isLoading, setIsLoading] = useState(false);
  
  // This effect now only checks for a logged-in session on mount
  useEffect(() => {
    try {
      const loggedInUsername = localStorage.getItem('helpdesk-currentUser');
      if (loggedInUsername) {
        const user = users.find((u: User) => u.username === loggedInUsername);
        if (user) {
          setCurrentUser(user);
          if (user.username === 'admin') {
              setIsAdmin(true);
              setActiveTab(Tab.ADMIN);
          }
        }
      }
    } catch (error) {
      console.error("Error loading currentUser from localStorage", error);
    }
  }, []); // Note: `users` is stable on first render due to lazy init, so it's not needed as a dependency.

  // Persist tickets whenever they change
  useEffect(() => {
    localStorage.setItem('helpdesk-tickets', JSON.stringify(tickets));
  }, [tickets]);
  
  // Persist users whenever they change
  useEffect(() => {
    localStorage.setItem('helpdesk-users', JSON.stringify(users));
  }, [users]);

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
  
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const addTicket = useCallback(async (query: string, chatHistory: Message[], escalationDetails: EscalationDetails) => {
    if (!currentUser) return 0;
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [addMessage, currentUser]);

  const closeMultipleTickets = useCallback((ticketIds: number[]) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticketIds.includes(ticket.id) ? { ...ticket, status: TicketStatus.CLOSED } : ticket
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

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      author: MessageAuthor.USER,
      text: userInput,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const botResponseText = await getAiResponse(userInput, newMessages);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        author: MessageAuthor.BOT,
        text: botResponseText,
        timestamp: new Date().toISOString(),
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
      setIsLoading(false);
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
    if (user.username === 'admin' && user.password === '1234') {
        setIsAdmin(true);
        setActiveTab(Tab.ADMIN);
    } else {
        setIsAdmin(false);
        setActiveTab(Tab.CHAT);
    }
    setCurrentUser(user);
    localStorage.setItem('helpdesk-currentUser', user.username);
  };
  
  const handleSignup = (newUser: User) => {
    // Use functional update to ensure we're always updating from the latest state
    setUsers(prevUsers => [...prevUsers, newUser]);
    handleLogin(newUser);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen text-white flex justify-center items-center p-4">
        <Auth onLogin={handleLogin} onSignup={handleSignup} users={users} />
      </div>
    )
  }

  const SegmentedControl: React.FC = () => (
    <div className="bg-black/20 rounded-full flex items-center space-x-1">
      <button
        onClick={() => setActiveTab(Tab.CHAT)}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
          activeTab === Tab.CHAT
            ? 'bg-cyan-400/80 text-black'
            : 'text-gray-300 hover:bg-white/10'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.06c-.247.007-.49.032-.728.082a.75.75 0 0 1-.634-.89A11.952 11.952 0 0 0 15 12c0-1.953-.423-3.8-1.157-5.498a.75.75 0 0 1 .634-.89c.238.05.48.075.728.082l3.722.06A2.25 2.25 0 0 1 20.25 8.511Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12c0-1.355-.322-2.662-.898-3.868c-1.921-3.92-6.06-6.632-10.852-6.632C2.122 1.5 1.5 2.122 1.5 3v8.692c0 4.79 3.865 8.692 8.692 8.692c.35 0 .69-.012 1.026-.035c2.31-.192 4.4-1.043 6.096-2.428c.456-.323.533-.94.173-1.314c-.36-.373-.936-.42-1.358-.113c-1.173.834-2.492 1.343-3.87 1.488c-.563.045-1.12.068-1.67.068c-4.032 0-7.308-3.276-7.308-7.308V3c0-.414.336-.75.75-.75c4.116 0 7.74 2.456 9.42 5.868C15.428 9.338 15.75 10.645 15.75 12Z" />
        </svg>
        <span>Chat</span>
      </button>
      {isAdmin ? (
        <button
          onClick={() => setActiveTab(Tab.ADMIN)}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
            activeTab === Tab.ADMIN
              ? 'bg-cyan-400/80 text-black'
              : 'text-gray-300 hover:bg-white/10'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.6-3.75a11.959 11.959 0 0 1-2.102-3.036m-7.222-7.036a11.959 11.959 0 0 0-2.102 3.036M15 2.25a11.959 11.959 0 0 0-2.102 3.036m0 0A11.959 11.959 0 0 1 12 2.25c-2.786 0-5.433.608-7.818 1.74a11.959 11.959 0 0 0-2.102 3.036" />
          </svg>
          <span>Admin</span>
        </button>
      ) : (
         <button
          onClick={() => setActiveTab(Tab.MY_TICKETS)}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
            activeTab === Tab.MY_TICKETS
              ? 'bg-cyan-400/80 text-black'
              : 'text-gray-300 hover:bg-white/10'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18m-3 .75h18A2.25 2.25 0 0 0 21 16.5V7.5A2.25 2.25 0 0 0 18.75 5.25H5.25A2.25 2.25 0 0 0 3 7.5v9A2.25 2.25 0 0 0 5.25 18.75Z" />
          </svg>
          <span>Tickets</span>
        </button>
      )}
    </div>
  );

  const userTickets = tickets.filter(t => t.createdBy === currentUser.username);

  return (
    <div className="min-h-screen text-white flex justify-center items-center p-4">
      <div className="w-full max-w-md h-[95vh] max-h-[800px] bg-black/30 backdrop-blur-2xl rounded-3xl shadow-2xl border border-cyan-300/20 flex flex-col overflow-hidden">
        <header className="p-4 flex items-center border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
             <RobotIconHeader />
             <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded-full truncate">@{currentUser.username}</span>
          </div>
           <div className="flex items-center space-x-2 ml-auto">
            {activeTab === Tab.CHAT && (
              <button onClick={handleNewChat} className="p-2.5 text-gray-300 hover:text-white hover:bg-black/20 rounded-full transition-colors" aria-label="New Chat">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.992m0 0h-4.992m4.992 0-3.181-3.183a8.25 8.25 0 0 0-11.667 0L2.985 16.952" />
                </svg>
              </button>
            )}
            <SegmentedControl />
            <button onClick={handleLogout} className="p-2.5 text-gray-300 hover:text-white hover:bg-black/20 rounded-full transition-colors" aria-label="Logout">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          {activeTab === Tab.CHAT && <ChatView messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} onEscalate={addTicket} onFeedback={handleFeedback} />}
          {activeTab === Tab.ADMIN && <AdminDashboard tickets={tickets} closeMultipleTickets={closeMultipleTickets} users={users} deleteUser={deleteUser} />}
          {activeTab === Tab.MY_TICKETS && !isAdmin && <UserTicketsView tickets={userTickets} />}
        </main>
      </div>
    </div>
  );
};

export default App;