
import React from 'react';
import { Loader2 } from 'lucide-react';
import DocumentCard from './DocumentCard';

interface DocumentListProps {
  documents: any[];
  isLoading: boolean;
  onViewDocument: (document: any) => void;
  onRemoveDocument: (documentId: string) => void;
}

/**
 * Component for displaying the list of documents in context
 */
const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  onViewDocument,
  onRemoveDocument
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No documents in context. Add documents to enhance your agent's responses.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {documents.map(doc => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onView={onViewDocument}
          onRemove={onRemoveDocument}
        />
      ))}
    </div>
  );
};

export default DocumentList;
