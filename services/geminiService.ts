import { GoogleGenAI } from "@google/genai";
import { Message } from '../types';
import { KNOWLEDGE_BASE } from '../constants';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. The app may not function correctly without a valid API key.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Simple text-based retrieval
const findRelevantKB = (query: string): string => {
  const queryLower = query.toLowerCase();
  let relevantArticles = KNOWLEDGE_BASE.filter(article => 
    article.title.toLowerCase().includes(queryLower) ||
    article.content.toLowerCase().includes(queryLower)
  );

  // Fallback for more generic terms
  if (relevantArticles.length === 0) {
    if (queryLower.includes('warranty')) {
        relevantArticles = KNOWLEDGE_BASE.filter(a => a.id === 'KB102');
    } else if (queryLower.includes('green line') || queryLower.includes('display')) {
        relevantArticles = KNOWLEDGE_BASE.filter(a => a.id === 'KB101');
    }
  }

  if (relevantArticles.length === 0) {
    return "No specific knowledge base articles found. Try to answer generally or suggest escalation.";
  }

  return relevantArticles.map(a => `Article ID: ${a.id}\n${a.content}`).join('\n\n---\n\n');
};

export const getAiResponse = async (query: string, chatHistory: Message[]): Promise<string> => {
  const relevantContext = findRelevantKB(query);
  
  const historyString = chatHistory
    .map(msg => `${msg.author === 'user' ? 'User' : 'Bot'}: ${msg.text}`)
    .join('\n');

  const prompt = `
    You are an AI Helpdesk Bot for OnePlus products. Your goal is to answer user questions based ONLY on the provided knowledge base context. 
    If the answer is not in the context, clearly state that you don't have enough information and suggest escalating to a human agent. 
    Be helpful, polite, and concise. Do not use any information you know outside of the provided context.
    After providing a helpful answer, ask if there is anything else you can help with.

    KNOWLEDGE BASE CONTEXT:
    ---
    ${relevantContext}
    ---

    CONVERSATION HISTORY:
    ---
    ${historyString}
    ---

    CURRENT USER QUESTION: "${query}"

    Based on all the above, provide your response:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
};

export const createTicketSummary = async (chatHistory: Message[]): Promise<string> => {
  if (chatHistory.length === 0) {
    return "No conversation history.";
  }
  
  const historyString = chatHistory
    .map(msg => `${msg.author === 'user' ? 'User' : 'Bot'}: ${msg.text}`)
    .join('\n');

  const prompt = `
    Summarize the following user support conversation into a concise ticket title/summary (max 15 words). 
    Focus on the core problem the user is facing.

    CONVERSATION:
    ---
    ${historyString}
    ---

    TICKET SUMMARY:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error creating ticket summary:", error);
    throw new Error("Failed to summarize ticket.");
  }
};
