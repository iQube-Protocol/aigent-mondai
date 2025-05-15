
import React from 'react';
import { AgentMessage } from '@/lib/types';
import MessageList from '../MessageList';
import AgentInputBar from '../AgentInputBar';
import EmptyConversation from '../EmptyConversation';

interface ChatTabProps {
  messages: AgentMessage[];
  inputValue: string;
  isProcessing: boolean;
  playing: string | null;
  agentType: 'learn' | 'earn' | 'connect';
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handlePlayAudio: (messageId: string) => void;
}

const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  inputValue,
  isProcessing,
  playing,
  agentType,
  messagesEndRef,
  handleInputChange,
  handleSubmit,
  handlePlayAudio
}) => {
  return (
    <>
      {messages.length === 0 ? (
        <EmptyConversation agentType={agentType} />
      ) : (
        <MessageList 
          messages={messages} 
          isProcessing={isProcessing} 
          playing={playing} 
          onPlayAudio={handlePlayAudio} 
          messagesEndRef={messagesEndRef}
        />
      )}

      <AgentInputBar
        inputValue={inputValue}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isProcessing={isProcessing}
        agentType={agentType}
      />
    </>
  );
};

export default ChatTab;
