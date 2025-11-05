export enum MessageAuthor {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export interface Message {
  id: string;
  author: MessageAuthor;
  text: string;
  timestamp: string;
  feedback?: 'up' | 'down';
}

export enum TicketStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
}

export interface User {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string; // In a real app, this would be a hash
}

export interface Ticket {
  id: number;
  summary: string;
  query: string;
  status: TicketStatus;
  createdAt: string;
  conversationHistory: Message[];
  escalationMessage?: string;
  escalationFile?: {
    name: string;
    type: string;
    data: string; // Base64 encoded file
  };
  createdBy: string; // The username of the user who created the ticket
}

export interface KBArticle {
  id:string;
  title: string;
  content: string;
}