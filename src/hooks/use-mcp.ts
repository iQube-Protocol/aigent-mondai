import { useState, useEffect } from 'react';
import { MCPClient, getMCPClient } from '@/integrations/mcp/client';
import { useAuth } from '@/hooks/use-auth';
import { useDriveContext } from './mcp/useDriveContext';
import { useDocumentContext } from './mcp/useDocumentContext';
import { useConversationContext } from './mcp/useConversationContext';

/**
 * Main MCP hook that provides MCP client and related functionality
 */
export function useMCP() {
  const [client, setClient] = useState<MCPClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();
  
  // Initialize MCP client
  useEffect(() => {
    if (user) {
      const mcpClient = getMCPClient({
        // Check for metisActive status from localStorage
        metisActive: localStorage.getItem('metisActive') === 'true'
      });
      
      setClient(mcpClient);
      setIsInitialized(true);
    }
  }, [user]);
  
  // Use the separated hooks
  const drive = useDriveContext(client);
  const document = useDocumentContext(client, drive.driveConnected);
  const conversation = useConversationContext(client);
  
  return {
    client,
    isInitialized,
    ...drive,
    ...document,
    ...conversation
  };
}
