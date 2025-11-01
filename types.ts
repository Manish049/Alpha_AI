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
}

export interface KBArticle {
  id:string;
  title: string;
  content: string;
}