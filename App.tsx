import React, { useState, useCallback } from 'react';
import { Ticket, Message, TicketStatus } from './types';
import ChatView from './components/ChatView';
import AdminDashboard from './components/AdminDashboard';
import { createTicketSummary } from './services/geminiService';

enum Tab {
  CHAT = 'chat',
  ADMIN = 'admin',
}

interface EscalationDetails {
  message: string;
  file?: {
    name: string;
    type: string;
    data: string;
  };
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHAT);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const addTicket = useCallback(async (query: string, chatHistory: Message[], escalationDetails: EscalationDetails) => {
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
      };
      setTickets(prevTickets => [...prevTickets, newTicket]);
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
      };
      setTickets(prevTickets => [...prevTickets, newTicket]);
      return newTicket.id;
    }
  }, []);

  const closeTicket = useCallback((ticketId: number) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: TicketStatus.CLOSED } : ticket
      )
    );
  }, []);

  const SegmentedControl: React.FC = () => (
    <div className="p-1 bg-black/20 rounded-full flex items-center space-x-1">
      <button
        onClick={() => setActiveTab(Tab.CHAT)}
        className={`px-6 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
          activeTab === Tab.CHAT
            ? 'bg-cyan-400/80 text-black'
            : 'text-gray-300 hover:bg-white/10'
        }`}
      >
        Chat With Ai
      </button>
      <button
        onClick={() => setActiveTab(Tab.ADMIN)}
        className={`px-6 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
          activeTab === Tab.ADMIN
            ? 'bg-cyan-400/80 text-black'
            : 'text-gray-300 hover:bg-white/10'
        }`}
      >
        Admin
      </button>
    </div>
  );

  return (
    <div className="min-h-screen text-white flex justify-center items-center p-4">
      <div className="w-full max-w-md h-[95vh] max-h-[800px] bg-black/30 backdrop-blur-2xl rounded-3xl shadow-2xl border border-cyan-300/20 flex flex-col overflow-hidden">
        <header className="p-4 flex justify-between items-center border-b border-white/10 shrink-0">
          <h1 className="text-xl font-bold text-cyan-300 tracking-wider">Roboto Ai</h1>
          <SegmentedControl />
        </header>
        
        <main className="flex-1 overflow-y-auto">
          {activeTab === Tab.CHAT && <ChatView onEscalate={addTicket} />}
          {activeTab === Tab.ADMIN && <AdminDashboard tickets={tickets} closeTicket={closeTicket} />}
        </main>
      </div>
    </div>
  );
};

export default App;