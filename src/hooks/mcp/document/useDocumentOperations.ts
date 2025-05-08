
import { useDocumentFetching } from './useDocumentFetching';
import { useDocumentListing } from './useDocumentListing';

/**
 * Combined hook for document operations
 */
export function useDocumentOperations(client: any, driveConnected: boolean) {
  const { documents, listDocuments, isLoading: listLoading } = useDocumentListing(client, driveConnected);
  const { fetchDocument, isLoading: fetchLoading } = useDocumentFetching(client, driveConnected);
  
  const isLoading = listLoading || fetchLoading;
  
  return {
    documents,
    isLoading,
    listDocuments,
    fetchDocument
  };
}
