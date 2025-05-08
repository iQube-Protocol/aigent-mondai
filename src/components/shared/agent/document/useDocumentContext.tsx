
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useMCP } from '@/hooks/use-mcp';

interface UseDocumentContextProps {
  conversationId: string | null;
  onDocumentAdded?: () => void;
}

/**
 * Custom hook for managing document context
 */
export default function useDocumentContext({ conversationId, onDocumentAdded }: UseDocumentContextProps) {
  const { client, fetchDocument, isLoading } = useMCP();
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [viewingDocument, setViewingDocument] = useState<{id: string, content: string, name: string, mimeType: string} | null>(null);
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
  
  // Initial load of document context
  useEffect(() => {
    loadDocumentContext();
  }, [loadDocumentContext]);
  
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
  
  const handleDocumentSelect = async (document: any) => {
    if (!client) {
      toast.error('MCP client not initialized');
      return;
    }
    
    if (!conversationId) {
      toast.error('No active conversation');
      return;
    }
    
    // Check if document is already in context
    if (selectedDocuments.some(doc => doc.id === document.id)) {
      toast.error('Document already in context');
      return;
    }
    
    try {
      console.log(`Adding document to context: ${document.name} (${document.id})`);
      
      // Initialize the context with the conversation ID
      await client.ensureContextInitialized(conversationId);
      
      // Fetch document content with progress feedback
      toast.loading(`Fetching document: ${document.name}`, { id: 'doc-fetch' });
      const content = await fetchDocument(document.id);
      toast.dismiss('doc-fetch');
      
      if (!content) {
        throw new Error('Failed to fetch document content');
      }
      
      if (content.length === 0) {
        throw new Error('Document content is empty');
      }
      
      console.log(`Document content fetched, length: ${content.length}`);
      toast.loading(`Adding document: ${document.name}`, { id: 'doc-add' });
      
      // Add content to the document object for local tracking
      document.content = content;
      
      // Update local state immediately to show the document in the UI
      setSelectedDocuments(prev => [...prev, document]);
      
      // Extract document type from mimeType
      const documentType = document.mimeType.split('/').pop() || 'unknown';
      
      // Add to model context
      console.log(`Adding document to MCP context: ${document.name}, type: ${documentType}`);
      client.addDocumentToContext(
        document.id,
        document.name,
        documentType,
        content
      );
      
      toast.dismiss('doc-add');
      
      // Verify the document was added to context
      const updatedContext = client.getModelContext();
      const docInContext = updatedContext?.documentContext?.find(d => d.documentId === document.id);
      
      if (docInContext) {
        console.log(`Document successfully added to context. Content length: ${docInContext.content.length}`);
        
        // Double-check content
        if (docInContext.content.length === 0) {
          console.error("Document added but content is empty!");
          throw new Error("Document content is empty after adding to context");
        }
      } else {
        console.error("Document not found in context after adding!");
        throw new Error("Failed to add document to context");
      }
      
      // Dispatch event that document context was updated
      const event = new CustomEvent('documentContextUpdated', { 
        detail: { documentId: document.id, action: 'added' } 
      });
      window.dispatchEvent(event);
      
      if (onDocumentAdded) {
        onDocumentAdded();
      }
      
      toast.success('Document added to conversation context');
      return document;
    } catch (error) {
      console.error('Error handling document selection:', error);
      toast.error('Failed to add document', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Remove the document from local state if it was added but failed in context
      setSelectedDocuments(prev => prev.filter(doc => doc.id !== document.id));
      
      throw error;
    }
  };
  
  const handleRemoveDocument = (documentId: string) => {
    try {
      console.log(`Removing document from context: ${documentId}`);
      
      // Find the document name before removing it
      const documentToRemove = selectedDocuments.find(doc => doc.id === documentId);
      const documentName = documentToRemove?.name || documentId;
      
      toast.loading(`Removing document: ${documentName}`, { id: 'doc-remove' });
      
      // Remove from the client context
      if (client && conversationId) {
        // Ensure context is initialized
        client.ensureContextInitialized(conversationId)
          .then(() => {
            // Remove from MCP context
            const removed = client.removeDocumentFromContext(documentId);
            console.log(`Document ${documentId} removal from MCP context: ${removed ? 'successful' : 'failed'}`);
            
            // Verify document was removed
            const updatedContext = client.getModelContext();
            const stillInContext = updatedContext?.documentContext?.some(d => d.documentId === documentId);
            
            if (stillInContext) {
              console.warn(`Document ${documentName} still in context after removal attempt!`);
              toast.error(`Failed to remove document: ${documentName}`);
            } else {
              console.log(`Document ${documentName} successfully removed from context`);
              // Update local state
              setSelectedDocuments(prev => prev.filter(doc => doc.id !== documentId));
              toast.success(`Document "${documentName}" removed from context`);
            }
            
            toast.dismiss('doc-remove');
          })
          .catch(error => {
            console.error('Error initializing context for document removal:', error);
            toast.error('Failed to initialize context for document removal');
            toast.dismiss('doc-remove');
          });
      } else {
        // Just update local state if client or conversationId not available
        setSelectedDocuments(prev => prev.filter(doc => doc.id !== documentId));
        toast.dismiss('doc-remove');
        toast.success(`Document "${documentName}" removed`);
      }
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document');
    }
  };
  
  const handleViewDocument = (document: any) => {
    setViewingDocument({
      id: document.id,
      name: document.name,
      content: document.content || "Content not available",
      mimeType: document.mimeType
    });
  };

  return {
    selectedDocuments,
    viewingDocument,
    setViewingDocument,
    isLoading,
    handleDocumentSelect,
    handleRemoveDocument,
    handleViewDocument,
    loadDocumentContext, // Expose this so other components can trigger a refresh
    lastRefreshTime
  };
}
