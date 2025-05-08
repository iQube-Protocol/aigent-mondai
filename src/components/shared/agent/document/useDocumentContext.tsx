
import { useEffect } from 'react';
import { useDocumentLoading, useDocumentViewing, useDocumentActions } from './hooks';

interface UseDocumentContextProps {
  conversationId: string | null;
  onDocumentAdded?: () => void;
}

/**
 * Custom hook for managing document context - refactored into smaller hooks
 */
export default function useDocumentContext({ conversationId, onDocumentAdded }: UseDocumentContextProps) {
  // Use separated hooks for different functionality
  const {
    selectedDocuments,
    setSelectedDocuments,
    loadDocumentContext,
    lastRefreshTime
  } = useDocumentLoading({ conversationId, onDocumentAdded });
  
  const {
    viewingDocument,
    setViewingDocument,
    handleViewDocument
  } = useDocumentViewing();
  
  const {
    isLoading,
    handleDocumentSelect,
    handleRemoveDocument
  } = useDocumentActions({ 
    conversationId, 
    selectedDocuments, 
    setSelectedDocuments, 
    onDocumentAdded 
  });

  return {
    selectedDocuments,
    viewingDocument,
    setViewingDocument,
    isLoading,
    handleDocumentSelect,
    handleRemoveDocument,
    handleViewDocument,
    loadDocumentContext,
    lastRefreshTime
  };
}
