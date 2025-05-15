
import React from 'react';
import { AgentInterface } from '@/components/shared/agent';
import { MetaQube, BlakQube } from '@/lib/types';
import { useMetisActivation } from './hooks/useMetisActivation';
import { useDocumentContextUpdates } from './hooks/useDocumentContextUpdates';
import { useConversationContext } from './hooks/useConversationContext';
import { processAiMessage } from './services/aiMessageService';

interface AgentPanelProps {
  metaQube: MetaQube;
  blakQube?: BlakQube;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  isPanelCollapsed: boolean;
}

const AgentPanel = ({ 
  metaQube, 
  blakQube,
  conversationId, 
  setConversationId,
  isPanelCollapsed 
}: AgentPanelProps) => {
  const { metisActive, setMetisActive } = useMetisActivation();
  const { documentContextUpdated, handleDocumentContextUpdated } = useDocumentContextUpdates();
  const { historicalContext, isLoading, mcpClient } = useConversationContext(
    conversationId, 
    setConversationId
  );

  const handleAIMessage = async (message: string) => {
    const response = await processAiMessage({
      message,
      metaQube,
      blakQube,
      conversationId,
      metisActive,
      mcpClient,
      historicalContext,
      setConversationId,
    });
    
    // Check if Metis was activated through the payment flow
    if (response.metadata?.metisActive !== undefined && response.metadata.metisActive !== metisActive) {
      setMetisActive(response.metadata.metisActive);
      
      // Persist Metis activation status to localStorage
      localStorage.setItem('metisActive', 'true');
      
      // Dispatch global event to notify other components
      const activationEvent = new Event('metisActivated');
      window.dispatchEvent(activationEvent);
      
      console.log(`Metis agent status updated to: ${response.metadata.metisActive}`);
    }
    
    return response;
  };

  if (isLoading) {
    console.log('AgentPanel is loading conversation context...');
  }

  return (
    <div className={`${isPanelCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'} flex flex-col`}>
      <AgentInterface
        title="Learning Assistant"
        description="Personalized web3 education based on your iQube data"
        agentType="learn"
        onMessageSubmit={handleAIMessage}
        onDocumentAdded={handleDocumentContextUpdated}
        documentContextUpdated={documentContextUpdated}
        conversationId={conversationId}
        initialMessages={[
          {
            id: "1",
            sender: "agent",
            message: "Hi there! I'm your Learning Assistant, here to help you explore the world of Web3 and blockchain. Based on your iQube profile, I see you're interested in several Web3 topics. You can now add Google Drive documents to our conversation for me to analyze. What aspects of blockchain or Web3 are you curious about today?",
            timestamp: new Date().toISOString(),
            metadata: {
              version: "1.0",
              modelUsed: "gpt-4o-mini",
              metisActive: metisActive
            }
          }
        ]}
      />
    </div>
  );
};

export default AgentPanel;
