import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageAuthor, KBArticle, LoadingState } from '../types';
import ChatMessage from './ChatMessage';
import { KNOWLEDGE_BASE } from '../constants';

interface EscalationDetails {
  message: string;
  file?: {
    name: string;
    type: string;
    data: string;
  };
}

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (input: string) => Promise<void>;
  loadingState: LoadingState;
  onEscalate: (query: string, chatHistory: Message[], escalationDetails: EscalationDetails) => Promise<number>;
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const RobotIcon = () => (
  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.4)] dark:drop-shadow-[0_0_15px_rgba(0,240,255,0.7)]">
    <path d="M12 2L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 3.34155C18.9997 4.22717 20.5 6.42857 20.5 9V12C20.5 14.7614 18.2614 17 15.5 17H8.5C5.73858 17 3.5 14.7614 3.5 12V9C3.5 6.42857 5.00031 4.22717 7 3.34155" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 17L7.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.5 17L16.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);


const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, loadingState, onEscalate, onFeedback }) => {
  const [userInput, setUserInput] = useState('');
  const [showEscalateButton, setShowEscalateButton] = useState(false);
  const [isEscalateModalVisible, setIsEscalateModalVisible] = useState(false);
  const [escalationMessage, setEscalationMessage] = useState('');
  const [escalationFile, setEscalationFile] = useState<File | null>(null);
  const [viewingKbArticle, setViewingKbArticle] = useState<KBArticle | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const isLoading = loadingState !== 'idle';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isLoading && messages.length > 1 && messages[messages.length - 1].author === MessageAuthor.BOT) {
      setShowEscalateButton(true);
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setShowEscalateButton(false);
    const textToSend = userInput;
    setUserInput('');
    await onSendMessage(textToSend);
  };
  
  const handleSuggestionClick = async (suggestion: string) => {
      if (isLoading) return;
      
      // Smart action handling based on suggestion text
      if (suggestion === 'Escalate to Agent' || suggestion === 'Create Ticket') {
          setIsEscalateModalVisible(true);
          return;
      }
      
      setShowEscalateButton(false);
      await onSendMessage(suggestion);
  };

  const handleEscalateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Do not close modal immediately, allow state to show processing
    
    const lastUserMessage = [...messages].reverse().find(m => m.author === MessageAuthor.USER);
    if (!lastUserMessage) {
        return;
    }

    let fileData: EscalationDetails['file'] | undefined = undefined;
    if (escalationFile) {
        const base64String = await fileToBase64(escalationFile);
        fileData = {
            name: escalationFile.name,
            type: escalationFile.type,
            data: base64String
        };
    }
    
    await onEscalate(lastUserMessage.text, messages, {
        message: escalationMessage,
        file: fileData,
    });
    
    setEscalationMessage('');
    setEscalationFile(null);
    setShowEscalateButton(false);
    setIsEscalateModalVisible(false); // Close after completion
  };
  
  const handleKbLinkClick = (kbId: string) => {
    const article = KNOWLEDGE_BASE.find(article => article.id === kbId);
    if (article) {
      setViewingKbArticle(article);
    }
  };

  const showWelcomeScreen = messages.length <= 1 && messages[0]?.id === 'initial';

  return (
    <div className="flex flex-col h-full relative">
        {showWelcomeScreen ? (
             <div className="flex-1 flex flex-col justify-center items-center text-center p-8 animate-spring-up">
                <div className="mb-8 animate-float">
                    <RobotIcon />
                </div>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight drop-shadow-lg">Control with Roboto Ai</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg max-w-sm leading-relaxed">Let's meet a powerful AI Assistant designed for your brand.</p>
                
                {/* Initial Suggestions for Welcome Screen */}
                <div className="flex flex-wrap gap-3 justify-center max-w-lg">
                    {messages[0]?.suggestions?.map((suggestion, idx) => (
                         <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-sm font-semibold bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 hover:text-cyan-600 dark:hover:text-white px-5 py-3 rounded-2xl transition-all duration-300 btn-press backdrop-blur-md shadow-lg"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
             </div>
        ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map(msg => (
                  msg.id !== 'initial' && 
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    onFeedback={onFeedback} 
                    onKbLinkClick={handleKbLinkClick} 
                    onSuggestionClick={handleSuggestionClick}
                  />
                ))}
                {loadingState === 'typing' && !isEscalateModalVisible && (
                <div className="flex justify-start animate-spring-up">
                    <div className="flex flex-col">
                         <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5 block ml-1">Roboto Ai</span>
                        <div className="px-4 py-3 rounded-2xl shadow-sm glass-panel text-gray-900 dark:text-gray-200 mr-auto flex items-center space-x-2">
                             <div className="flex space-x-1">
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                </div>
                )}
                <div ref={chatEndRef} />
            </div>
        )}
      
      {showEscalateButton && !isLoading && !showWelcomeScreen && (
        <div className="p-4 border-t border-gray-200 dark:border-white/5 text-center animate-spring-up">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest font-bold">Need more help?</p>
            <button 
                onClick={() => setIsEscalateModalVisible(true)}
                disabled={isLoading}
                className="border border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-300 text-sm font-bold py-2.5 px-6 rounded-full transition-all hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-95 disabled:opacity-50"
            >
                Escalate to Agent
            </button>
        </div>
      )}

      <div className="p-4 bg-gradient-to-t from-white/90 dark:from-black/60 to-transparent">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3 glass-panel p-2 rounded-2xl shadow-2xl">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 p-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none text-base"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="bg-cyan-400 text-black w-10 h-10 rounded-xl hover:bg-cyan-300 disabled:bg-cyan-400/20 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-90 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.5)]"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 transform rotate-90 translate-x-[1px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
            </svg>
          </button>
        </form>
      </div>
      
      {isEscalateModalVisible && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => !isLoading && setIsEscalateModalVisible(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="escalate-modal-title"
            className="glass-panel p-6 rounded-3xl shadow-2xl w-full max-w-md relative border-cyan-500/20"
            onClick={(e) => e.stopPropagation()}
          >
             <button 
              onClick={() => setIsEscalateModalVisible(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Close modal"
              disabled={isLoading}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="mb-6">
                <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-4 text-cyan-600 dark:text-cyan-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                </div>
                <h3 id="escalate-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Escalate Ticket</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Our human agents are ready to help. Provide details below.</p>
            </div>
            <form onSubmit={handleEscalateSubmit} className="space-y-4">
              <textarea
                value={escalationMessage}
                onChange={(e) => setEscalationMessage(e.target.value)}
                placeholder="Describe your issue in more detail..."
                rows={4}
                className="w-full p-4 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white placeholder-gray-500"
                aria-label="Additional details"
                required
                disabled={isLoading}
              />
              <div>
                <label htmlFor="file-upload" className={`w-full text-sm font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 rounded-xl p-4 flex items-center justify-center cursor-pointer transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/80 dark:hover:bg-white/10 hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-300'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81a1.5 1.5 0 0 0-2.122-2.122Z" />
                    </svg>
                  {escalationFile ? <span className="text-gray-900 dark:text-white">{escalationFile.name}</span> : 'Attach a screenshot'}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={(e) => setEscalationFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-4 px-4 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 mt-2 flex justify-center items-center"
                disabled={isLoading}
              >
                {loadingState === 'escalating' ? (
                   <>
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Ticket...
                   </>
                ) : 'Submit Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {viewingKbArticle && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-spring-up"
          onClick={() => setViewingKbArticle(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="kb-modal-title"
            className="glass-panel p-6 rounded-3xl shadow-2xl w-full max-w-2xl relative max-h-[80vh] flex flex-col border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setViewingKbArticle(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 id="kb-modal-title" className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 mb-6 border-b border-gray-200 dark:border-white/10 pb-4">{viewingKbArticle.title}</h3>
            <div className="overflow-y-auto pr-2 text-gray-800 dark:text-gray-300 whitespace-pre-wrap text-base leading-relaxed">
              {viewingKbArticle.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatView;