
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatTab from './ChatTab';
import DocumentContext from '../DocumentContext';
import KnowledgeBase from '../KnowledgeBase';
import { AgentMessage } from '@/lib/types';

interface AgentTabsProps {
  activeTab: 'chat' | 'knowledge' | 'documents';
  setActiveTab: (tab: 'chat' | 'knowledge' | 'documents') => void;
  messages: AgentMessage[];
  inputValue: string;
  isProcessing: boolean;
  playing: string | null;
  agentType: 'learn' | 'earn' | 'connect';
  messagesEndRef: React.RefObject<HTMLDivElement>;
  conversationId: string | null;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handlePlayAudio: (messageId: string) => void;
  handleDocumentAdded: () => void;
}

const AgentTabs: React.FC<AgentTabsProps> = ({
  activeTab,
  setActiveTab,
  messages,
  inputValue,
  isProcessing,
  playing,
  agentType,
  messagesEndRef,
  conversationId,
  handleInputChange,
  handleSubmit,
  handlePlayAudio,
  handleDocumentAdded
}) => {
  return (
    <Tabs 
      value={activeTab} 
      onValueChange={(v) => setActiveTab(v as 'chat' | 'knowledge' | 'documents')}
      className="flex-1 flex flex-col"
    >
      <div className="border-b px-4">
        <TabsList className="h-10">
          <TabsTrigger value="chat" className="data-[state=active]:bg-iqube-primary/20">Chat</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-iqube-primary/20">Documents</TabsTrigger>
          <TabsTrigger value="knowledge" className="data-[state=active]:bg-iqube-primary/20">Knowledge Base</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
        <ChatTab 
          messages={messages}
          inputValue={inputValue}
          isProcessing={isProcessing}
          playing={playing}
          agentType={agentType}
          messagesEndRef={messagesEndRef}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          handlePlayAudio={handlePlayAudio}
        />
      </TabsContent>
      
      <TabsContent value="documents" className="flex-1 p-4 m-0 overflow-y-auto">
        <DocumentContext 
          conversationId={conversationId}
          onDocumentAdded={handleDocumentAdded}
        />
      </TabsContent>

      <TabsContent value="knowledge" className="flex-1 p-4 m-0 overflow-y-auto">
        <KnowledgeBase agentType={agentType} />
      </TabsContent>
    </Tabs>
  );
};

export default AgentTabs;
