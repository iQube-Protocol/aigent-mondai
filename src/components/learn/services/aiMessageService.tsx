
import React from 'react';
import { toast } from 'sonner';
import { AgentMessage } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { getMCPClient } from '@/integrations/mcp/client';

export const sendMessage = async (
  message: string,
  conversationId: string | null,
  agentType = 'learn',
  onMessageReceived: (message: AgentMessage) => void,
  historicalContext?: string
): Promise<AgentMessage> => {
  try {
    console.log(`Sending message to ${agentType} agent with conversation ID ${conversationId}`);

    // Create pending message to show in UI immediately
    const pendingMessage: AgentMessage = {
      id: `pending-${Date.now()}`,
      sender: 'agent',
      message: '...',
      timestamp: new Date().toISOString(),
      metadata: { status: 'pending' }
    };
    
    onMessageReceived(pendingMessage);

    // Get document context from MCP if available
    let documentContext = null;
    const mcpClient = getMCPClient();
    if (!mcpClient) {
      console.error("MCP client not available, cannot access document context");
      throw new Error("Document context service unavailable");
    }
    
    // Force initialize context with the conversation ID to ensure we have latest data
    if (conversationId) {
      try {
        await mcpClient.initializeContext(conversationId);
        console.log("Context initialized for document access");
        
        // Force refresh from storage
        mcpClient.refreshContext();
      } catch (error) {
        console.error("Error initializing context:", error);
        toast.error("Error accessing document context", {
          description: "Some documents might not be included in the response"
        });
      }
    }
    
    const context = mcpClient.getModelContext();
    documentContext = context?.documentContext || null;
    
    if (!documentContext || documentContext.length === 0) {
      console.log("No documents available in context to send to AI service");
    } else {
      console.log(`Including ${documentContext.length} documents in request to AI service:`, 
        documentContext.map(doc => doc.documentName));
      
      // Debug document content
      let hasContentIssues = false;
      let docsWithContent = 0;
      
      documentContext.forEach((doc, i) => {
        console.log(`Document ${i+1}: ${doc.documentName}`);
        console.log(`Type: ${doc.documentType}, Content length: ${doc.content?.length || 0}`);
        
        if (!doc.content || doc.content.length === 0) {
          console.error(`⚠️ Document ${doc.documentName} has NO CONTENT! This will affect AI response.`);
          hasContentIssues = true;
        } else {
          docsWithContent++;
          console.log(`Content preview: ${doc.content.substring(0, 100)}...`);
        }
      });
      
      console.log(`Documents with content: ${docsWithContent} out of ${documentContext.length}`);
      
      if (hasContentIssues) {
        toast.warning("Some documents have content issues", {
          description: "Document content may not be properly included in the AI response"
        });
      } else if (docsWithContent > 0) {
        toast.success(`Including ${docsWithContent} document(s) in your request`, {
          description: "The AI will use these documents to provide a better response"
        });
      }
    }

    // Prepare payload for edge function
    const payload = {
      message,
      conversationId,
      historicalContext,
      documentContext // Include document context in the request
    };

    console.log("Sending request to AI service with:", {
      message,
      conversationId,
      hasHistoricalContext: !!historicalContext,
      documentCount: documentContext ? documentContext.length : 0
    });

    // Call the appropriate edge function
    const { data, error } = await supabase.functions.invoke(`${agentType}-ai`, {
      body: payload
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(`Edge function error: ${error.message}`);
    }

    // Process the response from the edge function
    if (!data || !data.response) {
      console.error("Invalid response from edge function:", data);
      throw new Error('Invalid response from edge function');
    }

    console.log("AI service response:", data);
    
    // Create the full message with the response
    const responseMessage: AgentMessage = {
      id: data.id || `msg-${Date.now()}`,
      sender: 'agent',
      message: data.response,
      timestamp: new Date().toISOString(),
      metadata: {
        status: 'complete',
        reliability: data.reliability || 0.85,
        sources: data.sources || [],
        conversationId: data.conversationId || conversationId,
        documentsUsed: data.documentsUsed || false // Flag to indicate if documents were used
      }
    };

    if (data.documentsUsed) {
      console.log("AI response used documents in context");
      toast.success("Referenced documents in response", {
        description: "The AI used your uploaded documents to answer"
      });
    }

    // Return the complete message
    return responseMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Show toast with error
    toast.error('Failed to get response', {
      description: error instanceof Error ? error.message : 'Unknown error occurred'
    });

    // Create error message
    const errorMessage: AgentMessage = {
      id: `error-${Date.now()}`,
      sender: 'agent',
      message: 'Sorry, I encountered an error processing your request. Please try again.',
      timestamp: new Date().toISOString(),
      metadata: { status: 'error' }
    };

    return errorMessage;
  }
};
