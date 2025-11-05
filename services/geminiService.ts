import { GoogleGenAI } from "@google/genai";
import { Message, MessageAuthor } from '../types';
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
    .slice(-10) // Keep history concise
    .map(msg => `${msg.author === 'user' ? 'User' : 'Bot'}: ${msg.text}`)
    .join('\n');

  const systemInstruction = `You are "Roboto Ai", a friendly and highly knowledgeable customer support assistant for OnePlus devices. 
Your primary goal is to resolve user issues accurately using ONLY the information provided in the "KNOWLEDGE BASE CONTEXT".
- NEVER use any external knowledge. If the answer isn't in the provided context, you MUST state that you don't have the information and recommend escalating to a human agent.
- Be empathetic and polite. Acknowledge the user's issue before providing a solution.
- Keep your answers clear, concise, and easy to understand. Use bullet points or numbered lists for steps.
- When you reference a specific knowledge base article, you MUST wrap its ID in a special tag like this: [KB:KB101]. For example: "According to article [KB:KB101], you might be eligible for a free screen replacement."
- After providing a solution, always ask if the user needs further assistance.
- Do not make up information, policies, or procedures.`;

  const contents = `
    KNOWLEDGE BASE CONTEXT:
    ---
    ${relevantContext}
    ---

    RECENT CONVERSATION HISTORY:
    ---
    ${historyString}
    ---

    CURRENT USER QUESTION: "${query}"

    Based strictly on the provided knowledge base and conversation history, provide your response.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
      },
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
  
  const cleanHistory = chatHistory.filter(msg => msg.author !== MessageAuthor.SYSTEM);
  const historyString = cleanHistory
    .map(msg => `${msg.author === 'user' ? 'User' : 'Bot'}: ${msg.text}`)
    .join('\n');

  const prompt = `
    Analyze the following support conversation. Your task is to create a clear, concise, and action-oriented ticket summary for a human agent.
    The summary should be a single sentence, no more than 15 words.
    It must capture the user's primary issue and the product involved.
    
    Example:
    CONVERSATION:
    User: My OnePlus 11 screen has a green line. I updated it and it's still there.
    Bot: I see. For out-of-warranty devices, OnePlus may offer a free screen replacement.
    SUMMARY: User reports green line on OnePlus 11 display after software update.

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
      config: {
        temperature: 0.2,
      },
    });
    return response.text.trim().replace(/\n/g, ' ');
  } catch (error) {
    console.error("Error creating ticket summary:", error);
    throw new Error("Failed to summarize ticket.");
  }
};