import React from 'react';
import { Message, MessageAuthor } from '../types';

interface ChatMessageProps {
  message: Message;
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
  onKbLinkClick: (kbId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onFeedback, onKbLinkClick }) => {
  const isUser = message.author === MessageAuthor.USER;
  const isBot = message.author === MessageAuthor.BOT;
  const isSystem = message.author === MessageAuthor.SYSTEM;

  const baseClasses = 'max-w-xl p-3 rounded-lg shadow-md break-words';
  
  const authorStyles = {
    [MessageAuthor.USER]: 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white ml-auto',
    [MessageAuthor.BOT]: 'bg-gray-800/60 text-gray-200 mr-auto',
    [MessageAuthor.SYSTEM]: 'text-cyan-400/90 text-xs text-center mx-auto my-2 w-full max-w-2xl italic',
  };

  const containerStyles = {
    [MessageAuthor.USER]: 'flex justify-end',
    [MessageAuthor.BOT]: 'flex justify-start',
    [MessageAuthor.SYSTEM]: 'flex justify-center',
  }

  const AuthorLabel = () => {
    if (isBot) return <span className="text-xs font-bold text-gray-400 mb-1">Roboto Ai</span>;
    if (isUser) return <span className="text-xs font-bold text-cyan-200 mb-1">You</span>;
    return null;
  }

  const ThumbsUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
    </svg>
  );

  const ThumbsDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-2.867a4 4 0 00.8-2.4z" />
    </svg>
  );

  const renderMessageContent = () => {
    const text = message.text;
    // Regex to find and split by [KB:KBXXX] tags, keeping the delimiter
    const parts = text.split(/(\[KB:[^\]]+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[KB:(KB\d+)\]/);
      if (match) {
        const kbId = match[1];
        return (
          <a
            key={index}
            href="#"
            onClick={(e) => { e.preventDefault(); onKbLinkClick(kbId); }}
            className="text-cyan-400 font-semibold underline hover:text-cyan-300 transition-colors"
          >
            {kbId}
          </a>
        );
      }
      return part; // Return the text part as is
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

  return (
    <div className={containerStyles[message.author]}>
        <div className="flex flex-col">
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-3`}>
                <AuthorLabel />
            </div>
            <div className={`${baseClasses} ${authorStyles[message.author]}`}>
                <div className="text-sm whitespace-pre-wrap">{renderMessageContent()}</div>
            </div>
             <div className={`flex items-center space-x-2 mt-2 px-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {isBot && (
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => onFeedback(message.id, 'up')}
                            className={`transition-colors duration-200 ${message.feedback === 'up' ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
                            aria-label="Good response"
                        >
                            <ThumbsUpIcon />
                        </button>
                        <button
                            onClick={() => onFeedback(message.id, 'down')}
                            className={`transition-colors duration-200 ${message.feedback === 'down' ? 'text-red-500' : 'text-gray-600 hover:text-gray-400'}`}
                            aria-label="Bad response"
                        >
                            <ThumbsDownIcon />
                        </button>
                    </div>
                )}
                <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    </div>
  );
};

export default ChatMessage;