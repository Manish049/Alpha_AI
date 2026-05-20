export enum MessageAuthor {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export type LoadingState = 'idle' | 'typing' | 'escalating';

export interface Message {
  id: string;
  author: MessageAuthor;
  text: string;
  timestamp: string;
  feedback?: 'up' | 'down';
  suggestions?: string[];
}

export enum TicketStatus {
  OPEN = 'Open',
  PENDING = 'Pending',
  CLOSED = 'Closed',
}

export enum UserRole {
  ADMIN = 'admin',
  SUPPORT = 'support',
  CUSTOMER = 'customer',
}

export interface User {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password: string; // In a real app, this would be a hash
  isActive?: boolean;
  role: UserRole;
}

export interface TicketComment {
  id: string;
  author: string; // Full name of the commenter
  role: UserRole;
  text: string;
  timestamp: string;
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
  closedAt?: string; // The ISO timestamp when the ticket was closed
  assignedTo?: string; // The username of the support agent assigned to it
  comments?: TicketComment[];
}

export interface KBArticle {
  id:string;
  title: string;
  content: string;
}

// New types for the structured knowledge base
export interface Policy {
  policy_name: string;
  details: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Category {
  category_name: string;
  faqs: FAQ[];
  policies: Policy[];
}

export interface Brand {
  brand_name: string;
  keywords: string[];
  categories: Category[];
}

export interface KnowledgeBase {
  brands: Brand[];
}