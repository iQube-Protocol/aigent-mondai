
import { useDocumentOperations } from './document';

/**
 * Hook for handling document browsing and fetching functionality
 */
export function useDocumentContext(client: any, driveConnected: boolean) {
  const documentOperations = useDocumentOperations(client, driveConnected);
  
  return {
    ...documentOperations
  };
}
