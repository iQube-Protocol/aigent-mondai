
import { useCallback, useState } from 'react';
import { MCPClient } from '@/integrations/mcp/client';
import { toast } from 'sonner';

/**
 * Hook for handling document fetching functionality
 */
export function useDocumentFetching(client: MCPClient | null, driveConnected: boolean) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch a document's content
  const fetchDocument = useCallback(async (documentId: string) => {
    if (!client || !driveConnected) {
      toast.error('Not connected to Google Drive');
      return null;
    }
    
    setIsLoading(true);
    try {
      return await client.fetchDocumentContent(documentId);
    } catch (error) {
      console.error(`Error fetching document ${documentId}:`, error);
      toast.error('Failed to fetch document', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, driveConnected]);
  
  return {
    fetchDocument,
    isLoading
  };
}
