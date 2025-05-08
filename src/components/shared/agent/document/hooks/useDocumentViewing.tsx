
import { useState } from 'react';

/**
 * Hook for document viewing functionality
 */
export function useDocumentViewing() {
  const [viewingDocument, setViewingDocument] = useState<{id: string, content: string, name: string, mimeType: string} | null>(null);
  
  const handleViewDocument = (document: any) => {
    setViewingDocument({
      id: document.id,
      name: document.name,
      content: document.content || "Content not available",
      mimeType: document.mimeType
    });
  };

  return {
    viewingDocument,
    setViewingDocument,
    handleViewDocument
  };
}
