import { GoogleGenAI } from "@google/genai";
import { Message, MessageAuthor } from '../types';
import { KNOWLEDGE_BASE_JSON } from '../knowledgeBase';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder. The app may not function correctly without a valid API key.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const EMBEDDING_MODEL = 'gemini-embedding-2-preview';

// Types for RAG
interface KnowledgeChunk {
  content: string;
  metadata: string;
  brandName?: string;
  categoryName?: string;
  keywords?: string[];
  embedding?: number[];
  score?: number;
}

let knowledgeChunks: KnowledgeChunk[] = [];
let isKbInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Helper: Cosine Similarity
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
};

// Helper: Keyword Match Score
const getKeywordScore = (query: string, chunk: KnowledgeChunk): number => {
  const queryLower = query.toLowerCase();
  
  // Strip punctuation and split into query terms
  const terms = queryLower
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3);
    
  if (terms.length === 0) return 0;
  
  const contentLower = chunk.content.toLowerCase();
  const metadataLower = chunk.metadata.toLowerCase();
  
  let score = 0;
  
  // 1. Keyword overlap with content and metadata
  terms.forEach(term => {
    if (contentLower.includes(term)) {
      score += 1;
    }
    if (metadataLower.includes(term)) {
      score += 2; // Extra relevance for metadata matches
    }
  });

  // 2. Exact match check
  if (contentLower.includes(queryLower)) {
    score += 10;
  }
  
  // 3. Brand specificity matching
  if (chunk.brandName) {
    const brandLower = chunk.brandName.toLowerCase();
    if (queryLower.includes(brandLower)) {
      score += 8; // Boost significantly if brand is explicitly mentioned in the query
    }
  }

  // 4. Keyword tag matchmaking
  if (chunk.keywords) {
    chunk.keywords.forEach(kw => {
      if (queryLower.includes(kw.toLowerCase())) {
        score += 3; // Boost if query matches the brand's tags/keywords
      }
    });
  }

  return score;
};

// Helper: Flatten structured KB into text chunks with rich attributes
const flattenKnowledgeBase = (): KnowledgeChunk[] => {
  const chunks: KnowledgeChunk[] = [];
  KNOWLEDGE_BASE_JSON.brands.forEach(brand => {
    brand.categories.forEach(category => {
      category.faqs.forEach(faq => {
        chunks.push({
          content: `Brand: ${brand.brand_name}\nCategory: ${category.category_name}\nQuestion: ${faq.question}\nAnswer: ${faq.answer}`,
          metadata: `${brand.brand_name} - ${category.category_name} - FAQ`,
          brandName: brand.brand_name,
          categoryName: category.category_name,
          keywords: brand.keywords || []
        });
      });
      category.policies.forEach(policy => {
        chunks.push({
          content: `Brand: ${brand.brand_name}\nCategory: ${category.category_name}\nPolicy: ${policy.policy_name}\nDetails: ${policy.details}`,
          metadata: `${brand.brand_name} - ${category.category_name} - Policy`,
          brandName: brand.brand_name,
          categoryName: category.category_name,
          keywords: brand.keywords || []
        });
      });
    });
  });
  return chunks;
};

// Auxiliary: Helper to embed chunks individually when a batch request fails
const embedIndividually = async (itemChunks: KnowledgeChunk[]) => {
  for (const chunk of itemChunks) {
    try {
      const singleResponse = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: { parts: [{ text: chunk.content }] }
      });
      if (singleResponse.embeddings && singleResponse.embeddings.length > 0 && singleResponse.embeddings[0].values) {
        chunk.embedding = singleResponse.embeddings[0].values;
      }
    } catch (singleError) {
      console.error(`Failed to generate embedding for specific chunk under metadata: "${chunk.metadata}". Error:`, singleError);
      // Let it survive so active system operation can continue
    }
  }
};

// Initialize embeddings for the knowledge base with batching and fallback
export const initializeKnowledgeBase = async () => {
  if (isKbInitialized) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
      const chunks = flattenKnowledgeBase();
      const BATCH_SIZE = 5;
      
      console.log(`Initializing Knowledge Base Embeddings. Total chunks: ${chunks.length}`);
      
      try {
        // Step through chunks in batches
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batchChunks = chunks.slice(i, i + BATCH_SIZE);
            try {
                console.log(`Requesting batch embedding for chunks ${i} to ${Math.min(i + BATCH_SIZE, chunks.length)}...`);
                const response = await ai.models.embedContent({
                    model: EMBEDDING_MODEL,
                    contents: batchChunks.map(c => c.content)
                });
                
                if (response.embeddings && response.embeddings.length > 0) {
                    response.embeddings.forEach((emb, index) => {
                        if (index < batchChunks.length && emb && emb.values) {
                            batchChunks[index].embedding = emb.values;
                        }
                    });
                } else {
                    console.warn(`Batch embedding returned an empty payload for range indices ${i} to ${i + BATCH_SIZE}. Reverting to fine-grained individual embeddings.`);
                    await embedIndividually(batchChunks);
                }
            } catch (batchError) {
                console.warn(`Batch embedding request failed for range indices ${i} to ${i + BATCH_SIZE} with error. Retrying chunks individually.`, batchError);
                await embedIndividually(batchChunks);
            }
        }
        
        knowledgeChunks = chunks;
        isKbInitialized = true;
        console.log("Knowledge Base Embeddings Ready.");
      } catch (error) {
        console.error("Critical fallback triggered: KB initialization failed entirely.", error);
        // Fail-safe load: load chunks without vector coordinates so keyword search behaves as a full fallback
        knowledgeChunks = chunks;
        isKbInitialized = true; // Still marked initialized so we don't end up on an infinite failed initialization loop
      }
  })();
  
  return initializationPromise;
};

// Retrieve most relevant chunks based on query embedding or keyword fallback
const getRelevantContext = async (query: string): Promise<string> => {
   await initializeKnowledgeBase();

   let topChunks: KnowledgeChunk[] = [];
   const hasEmbeddings = knowledgeChunks.some(c => c.embedding);

   // Try Vector Search first
   if (hasEmbeddings) {
     try {
       const queryEmbResponse = await ai.models.embedContent({
         model: EMBEDDING_MODEL,
         contents: { parts: [{ text: query }] }
       });

       const queryEmb = queryEmbResponse.embeddings?.[0]?.values;
       if (queryEmb) {
            const scoredChunks = knowledgeChunks.map(chunk => ({
                ...chunk,
                score: chunk.embedding ? cosineSimilarity(queryEmb, chunk.embedding) : -1
            }));
            // Get top 5 by vector score
            topChunks = scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);
       }
     } catch (error) {
        console.warn("Vector search failed on query embedding, proceeding to keyword search strategy fallback:", error);
     }
   }

   // Fallback to Keyword Search if Vector Search didn't yield results, was not possible, or errored out
   if (topChunks.length === 0) {
      console.log("Using keyword search strategy");
      const scoredChunks = knowledgeChunks.map(chunk => {
          const score = getKeywordScore(query, chunk);
          return { 
              ...chunk, 
              score: score 
          };
      });

      // Get top 5 with non-zero keyword score
      topChunks = scoredChunks
        .filter(c => (c.score || 0) > 0)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5);
   }

   // If still no chunks, return full JSON as last resort (or we could return empty string and let LLM decide)
   if (topChunks.length === 0) {
      return JSON.stringify(KNOWLEDGE_BASE_JSON, null, 2);
   }

   return topChunks.map(c => `[SOURCE: ${c.metadata}]\n${c.content}`).join('\n\n');
};

export const getAiResponse = async (query: string, chatHistory: Message[]): Promise<{ text: string; suggestions: string[] }> => {
  
  // 1. Retrieve relevant info using Vector Search
  const retrievedContext = await getRelevantContext(query);
  
  const historyString = chatHistory
    .slice(-10) // Keep history concise
    .map(msg => `${msg.author === 'user' ? 'User' : 'Bot'}: ${msg.text}`)
    .join('\n');

  const systemInstruction = `You are **Roboto Ai**, a friendly and intelligent virtual support agent.
You serve four specific brands: **Urban Streak** (Fashion), **Barbary Lion** (Luxury Bags), **FitMax Apparel** (Activewear), and **NovaTech** (Electronics/Tech Support).

### PERSONA & STYLE
- **Name**: Always refer to yourself as "Roboto Ai".
- **Tone**: Warm, professional, and proactive. Avoid sounding overly mechanical or repetitive.
- **Variety**: Do not repeat the same opening phrases. Vary your language (e.g., instead of always saying "Here is the answer," try "I've got that details for you," or "Let's look at that policy").
- **Empathy**: If the user seems frustrated, acknowledge it briefly before solving the problem.

### INSTRUCTIONS
1. **Use Retrieved Context**: Answer the user's question using ONLY the information provided in the "RETRIEVED KNOWLEDGE BASE CONTEXT" section below.
2. **Be Honest**: If the retrieved context does not contain the answer, admit it. Do not make up policies. Suggest "Escalate to Agent" if you cannot answer.
3. **Clarify**: If the context suggests multiple brands might be relevant and the user wasn't specific, ask for clarification (e.g., "Are you asking about Urban Streak or FitMax?").

### SUGGESTIONS FORMAT
At the very end of your response, you MUST provide 2-4 short follow-up options for the user.
Format them exactly like this:
|SUGGESTIONS: ["Option 1", "Option 2", "Option 3"]|
`;

  const contents = `
### RETRIEVED KNOWLEDGE BASE CONTEXT
${retrievedContext}

### RECENT CONVERSATION HISTORY
${historyString}

### CURRENT USER QUESTION
"${query}"

Based on the retrieved context, provide your response with suggestions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, // Increased slightly for more variety in wording
      },
    });

    let text = response.text || "";
    let suggestions: string[] = [];

    // Parse specific suggestion format
    const suggestionMatch = text.match(/\|SUGGESTIONS:\s*(\[.*?\])\|/s);
    if (suggestionMatch) {
        try {
            suggestions = JSON.parse(suggestionMatch[1]);
            // Remove the suggestion block from the visible text
            text = text.replace(suggestionMatch[0], '').trim();
        } catch (e) {
            console.error("Failed to parse suggestions JSON", e);
        }
    }

    return { text, suggestions };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      text: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.",
      suggestions: ["Retry"]
    };
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