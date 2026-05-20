import React from 'react';
import { Message, MessageAuthor } from '../types';

interface ChatMessageProps {
  message: Message;
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
  onKbLinkClick: (kbId: string) => void;
  onSuggestionClick: (suggestion: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onFeedback, onKbLinkClick, onSuggestionClick }) => {
  const isUser = message.author === MessageAuthor.USER;
  const isBot = message.author === MessageAuthor.BOT;
  const isSystem = message.author === MessageAuthor.SYSTEM;

  const baseClasses = 'max-w-xl p-4 rounded-2xl shadow-lg break-words transition-all duration-300';
  
  const authorStyles = {
    [MessageAuthor.USER]: 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white ml-auto rounded-tr-sm',
    [MessageAuthor.BOT]: 'glass-panel text-gray-800 dark:text-gray-100 mr-auto rounded-tl-sm border border-gray-200 dark:border-white/5',
    [MessageAuthor.SYSTEM]: 'text-cyan-600/90 dark:text-cyan-400/80 text-xs text-center mx-auto my-4 w-full max-w-2xl font-medium tracking-wide bg-cyan-100/50 dark:bg-cyan-900/10 py-1 rounded-full border border-cyan-500/10',
  };

  const containerStyles = {
    [MessageAuthor.USER]: 'flex justify-end animate-spring-up',
    [MessageAuthor.BOT]: 'flex justify-start animate-spring-up',
    [MessageAuthor.SYSTEM]: 'flex justify-center animate-spring-up',
  }

  const AuthorLabel = () => {
    if (isBot) return <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5 block ml-1">Roboto Ai</span>;
    if (isUser) return <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-600 dark:text-cyan-300/70 mb-1.5 block text-right mr-1">You</span>;
    return null;
  }

  const ThumbsUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  );

  const ThumbsDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-2.867a4 4 0 00.8-2.4z" />
    </svg>
  );

  const renderMessageContent = () => {
    const text = message.text;
    const parts = text.split(/(\[KB:[^\]]+\]|\*\*.*?\*\*)/g).filter(part => part);

    return parts.map((part, index) => {
      const kbMatch = part.match(/\[KB:(KB\d+)\]/);
      if (kbMatch) {
        const kbId = kbMatch[1];
        return (
          <a
            key={index}
            href="#"
            onClick={(e) => { e.preventDefault(); onKbLinkClick(kbId); }}
            className="inline-flex items-center text-cyan-600 dark:text-cyan-300 font-semibold border-b border-cyan-500/30 hover:border-cyan-400 transition-colors mx-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
            {kbId}
          </a>
        );
      }
      
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-gray-900 dark:text-white font-bold">{part.slice(2, -2)}</strong>;
      }

      return part;
    });
  };

  if (isSystem) {
      return (
          <div className={containerStyles[message.author]}>
              <div className={authorStyles[message.author]}>
                <p>{message.text}</p>
              </div>
          </div>
      )
  }

  const { suggestions } = message;

  return (
    <div className={containerStyles[message.author]}>
        <div className="flex flex-col max-w-[90%]">
            <AuthorLabel />
            <div className={`${baseClasses} ${authorStyles[message.author]}`}>
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{renderMessageContent()}</div>
            </div>
            
            {/* Interactive Suggestions */}
            {isBot && suggestions && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 ml-1 mb-1 animate-spring-up delay-100">
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSuggestionClick(suggestion)}
                            className="text-xs font-semibold border border-cyan-500/30 bg-white/50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 active:scale-95 px-4 py-2 rounded-xl transition-all duration-200 shadow-sm backdrop-blur-sm"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

             <div className={`flex items-center space-x-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'} opacity-60 hover:opacity-100 transition-opacity`}>
                {isBot && (
                    <div className="flex items-center space-x-3 bg-gray-200/50 dark:bg-black/20 rounded-full px-2 py-1">
                        <button
                            onClick={() => onFeedback(message.id, 'up')}
                            className={`p-1 rounded-full transition-all duration-200 active:scale-90 ${message.feedback === 'up' ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-400/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/10'}`}
                            aria-label="Good response"
                        >
                            <ThumbsUpIcon />
                        </button>
                        <button
                            onClick={() => onFeedback(message.id, 'down')}
                            className={`p-1 rounded-full transition-all duration-200 active:scale-90 ${message.feedback === 'down' ? 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-400/10' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/10'}`}
                            aria-label="Bad response"
                        >
                            <ThumbsDownIcon />
                        </button>
                    </div>
                )}
                <span className="text-[10px] font-mono text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    </div>
  );
};

export default ChatMessage;