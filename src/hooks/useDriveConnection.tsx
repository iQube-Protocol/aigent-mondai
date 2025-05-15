
import { useState, useEffect } from 'react';
import { useMCP } from '@/hooks/use-mcp';
import { toast } from 'sonner';

export function useDriveConnection() {
  const { driveConnected, connectToDrive, isLoading, client } = useMCP();
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  
  // Try to load saved credentials from localStorage
  useEffect(() => {
    const savedClientId = localStorage.getItem('gdrive-client-id');
    const savedApiKey = localStorage.getItem('gdrive-api-key');
    
    if (savedClientId) setClientId(savedClientId);
    if (savedApiKey) setApiKey(savedApiKey);
    
    if (client?.isConnectedToDrive()) {
      console.log('Drive is already connected based on client state');
    }
  }, [client]);
  
  const handleConnect = async () => {
    if (!clientId || !apiKey) {
      toast.error('Missing Google API credentials', {
        description: 'Both Client ID and API Key are required'
      });
      return false;
    }
    
    // Save credentials for convenience
    localStorage.setItem('gdrive-client-id', clientId);
    localStorage.setItem('gdrive-api-key', apiKey);
    
    const success = await connectToDrive(clientId, apiKey);
    return success;
  };
  
  return {
    driveConnected,
    isLoading,
    clientId,
    setClientId,
    apiKey,
    setApiKey,
    handleConnect
  };
}
