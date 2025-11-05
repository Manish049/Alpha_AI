import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageAuthor, KBArticle } from '../types';
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
  isLoading: boolean;
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
  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.7)]">
    <path d="M12 2L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 3.34155C18.9997 4.22717 20.5 6.42857 20.5 9V12C20.5 14.7614 18.2614 17 15.5 17H8.5C5.73858 17 3.5 14.7614 3.5 12V9C3.5 6.42857 5.00031 4.22717 7 3.34155" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 17L7.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.5 17L16.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);


const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, isLoading, onEscalate, onFeedback }) => {
  const [userInput, setUserInput] = useState('');
  const [showEscalateButton, setShowEscalateButton] = useState(false);
  const [isEscalateModalVisible, setIsEscalateModalVisible] = useState(false);
  const [escalationMessage, setEscalationMessage] = useState('');
  const [escalationFile, setEscalationFile] = useState<File | null>(null);
  const [viewingKbArticle, setViewingKbArticle] = useState<KBArticle | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleEscalateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEscalateModalVisible(false);

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
  };
  
  const handleKbLinkClick = (kbId: string) => {
    const article = KNOWLEDGE_BASE.find(article => article.id === kbId);
    if (article) {
      setViewingKbArticle(article);
    }
  };

  const showWelcomeScreen = messages.length <= 1 && messages[0]?.id === 'initial';

  return (
    <div className="flex flex-col h-full">
        {showWelcomeScreen ? (
             <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                <div className="mb-6">
                    <RobotIcon />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Control with Roboto Ai</h2>
                <p className="text-gray-300/80">Let's meet a powerful AI Assistant.</p>
             </div>
        ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                  msg.id !== 'initial' && <ChatMessage key={msg.id} message={msg} onFeedback={onFeedback} onKbLinkClick={handleKbLinkClick} />
                ))}
                {isLoading && !isEscalateModalVisible && (
                <div className="flex justify-start">
                    <div className="flex flex-col">
                        <div className="flex justify-start px-3">
                            <span className="text-xs font-bold text-gray-400 mb-1">Roboto Ai</span>
                        </div>
                        <div className="max-w-xl p-3 rounded-lg shadow-sm bg-gray-800/60 text-gray-200 mr-auto flex items-center space-x-3">
                            <div className="flex space-x-1.5 items-center justify-center">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                </div>
                )}
                <div ref={chatEndRef} />
            </div>
        )}
      
      {showEscalateButton && !isLoading && (
        <div className="p-4 border-t border-white/10 text-center">
            <p className="text-sm text-gray-400 mb-2">Not the answer you wanted?</p>
            <button 
                onClick={() => setIsEscalateModalVisible(true)}
                disabled={isLoading}
                className="border border-red-500/50 text-red-400 text-sm font-semibold py-2 px-4 rounded-full transition-all hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
            >
                Escalate to Agent
            </button>
        </div>
      )}

      <div className="border-t border-white/10 p-4 bg-black/20">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-400"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="bg-cyan-400 text-black px-4 py-3 rounded-lg hover:bg-cyan-300 disabled:bg-cyan-400/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
      
      {isEscalateModalVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
          onClick={() => setIsEscalateModalVisible(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="escalate-modal-title"
            className="bg-[#0A1F1F] border border-cyan-500/30 p-6 rounded-2xl shadow-2xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
             <button 
              onClick={() => setIsEscalateModalVisible(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 id="escalate-modal-title" className="text-xl font-bold text-white mb-4">Escalate to Human Agent</h3>
            <p className="text-gray-400 text-sm mb-6">Please provide additional details and attach any relevant files (e.g., screenshots).</p>
            <form onSubmit={handleEscalateSubmit} className="space-y-4">
              <textarea
                value={escalationMessage}
                onChange={(e) => setEscalationMessage(e.target.value)}
                placeholder="Describe your issue in more detail..."
                rows={4}
                className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20"
                aria-label="Additional details"
                required
              />
              <div>
                <label htmlFor="file-upload" className="w-full text-sm font-medium text-gray-300 bg-black/30 border border-dashed border-white/30 rounded-lg p-3 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81a1.5 1.5 0 0 0-2.122-2.122Z" />
                    </svg>
                  {escalationFile ? escalationFile.name : 'Attach a file'}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={(e) => setEscalationFile(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {viewingKbArticle && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
          onClick={() => setViewingKbArticle(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="kb-modal-title"
            className="bg-[#0A1F1F] border border-cyan-500/30 p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setViewingKbArticle(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h3 id="kb-modal-title" className="text-xl font-bold text-cyan-300 mb-4">{viewingKbArticle.title}</h3>
            <div className="overflow-y-auto pr-2 text-gray-300 whitespace-pre-wrap text-sm">
              {viewingKbArticle.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatView;