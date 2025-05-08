
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useMCP } from '@/hooks/use-mcp';

interface UseDocumentLoadingProps {
  conversationId: string | null;
  onDocumentAdded?: () => void;
}

/**
 * Hook for loading document context from MCP
 */
export function useDocumentLoading({ conversationId }: UseDocumentLoadingProps) {
  const { client } = useMCP();
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  
  // Load document context when conversation ID or client changes
  const loadDocumentContext = useCallback(async () => {
    if (!client) {
      console.log("Cannot load document context: MCP client not available");
      return;
    }
    
    if (!conversationId) {
      console.log("Cannot load document context: Conversation ID not available");
      return;
    }
    
    try {
      console.log(`Loading documents for conversation ${conversationId}, refresh #${Date.now()}`);
      
      // Always initialize context first to ensure we have the latest
      await client.initializeContext(conversationId);
      console.log(`Context initialized for conversation ${conversationId}`);
      
      // Force refresh from storage to ensure we have latest changes
      client.refreshContext();
      
      const context = client.getModelContext();
      console.log("Loading document context. Context available:", !!context);
      
      if (context?.documentContext) {
        const docs = context.documentContext.map(doc => ({
          id: doc.documentId,
          name: doc.documentName,
          mimeType: `application/${doc.documentType}`,
          content: doc.content
        }));
        
        if (docs.length === 0) {
          console.log("Document context is empty");
        } else {
          console.log(`Documents loaded: ${docs.length}`, docs.map(d => d.name));
          
          // Verify document content is loaded
          let contentMissing = false;
          docs.forEach((doc, index) => {
            console.log(`Document ${index + 1}: ${doc.name}, Content length: ${doc.content?.length || 0}`);
            if (!doc.content || doc.content.length === 0) {
              console.warn(`⚠️ Document ${doc.name} has no content!`);
              contentMissing = true;
            }
          });
          
          if (contentMissing) {
            console.error("Some documents have missing content! Attempting recovery...");
            toast.warning("Some documents may have incomplete content", {
              description: "This might affect the agent's ability to analyze them properly"
            });
          }
        }
        
        setSelectedDocuments(docs);
        setLastRefreshTime(Date.now());
      } else {
        console.log("No document context available");
        setSelectedDocuments([]);
      }
    } catch (error) {
      console.error("Error loading document context:", error);
      toast.error("Failed to load document context", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, [client, conversationId]);

  // Set up event listeners for context changes
  useEffect(() => {
    const handleContextUpdate = (event: CustomEvent) => {
      console.log("Document context updated event received:", event.detail);
      loadDocumentContext();
    };
    
    // TypeScript type assertion for custom event
    window.addEventListener('documentContextUpdated', handleContextUpdate as EventListener);
    
    // Also reload when tab becomes visible
    const handleTabVisibilityChange = () => {
      if (!document.hidden && client && conversationId) {
        console.log("Document became visible, reloading document context");
        loadDocumentContext();
      }
    };
    
    document.addEventListener('visibilitychange', handleTabVisibilityChange);
    
    // Clean up listeners
    return () => {
      window.removeEventListener('documentContextUpdated', handleContextUpdate as EventListener);
      document.removeEventListener('visibilitychange', handleTabVisibilityChange);
    };
  }, [client, conversationId, loadDocumentContext]);
  
  // Initial load of document context
  useEffect(() => {
    loadDocumentContext();
  }, [loadDocumentContext]);
  
  return {
    selectedDocuments,
    setSelectedDocuments,
    loadDocumentContext,
    lastRefreshTime
  };
}
