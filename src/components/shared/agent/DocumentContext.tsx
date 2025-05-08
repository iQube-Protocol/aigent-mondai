
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import DocumentSelector from '../DocumentSelector';
import DocumentList from './document/DocumentList';
import DocumentViewer from './document/DocumentViewer';
import useDocumentContext from './document/useDocumentContext';

interface DocumentContextProps {
  conversationId: string | null;
  onDocumentAdded?: () => void;
}

const DocumentContext: React.FC<DocumentContextProps> = ({ 
  conversationId,
  onDocumentAdded
}) => {
  const {
    selectedDocuments,
    viewingDocument,
    setViewingDocument,
    isLoading,
    handleDocumentSelect,
    handleRemoveDocument,
    handleViewDocument
  } = useDocumentContext({ conversationId, onDocumentAdded });
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Documents in Context</h3>
        <DocumentSelector 
          onDocumentSelect={handleDocumentSelect}
          triggerButton={
            <Button variant="outline" size="sm" className="gap-1 mt-2">
              <FileText className="h-3.5 w-3.5" />
              Add Document
            </Button>
          }
        />
      </div>
      
      <Separator className="mb-4" />
      
      <div className="flex-1 overflow-hidden">
        <DocumentList
          documents={selectedDocuments}
          isLoading={isLoading}
          onViewDocument={handleViewDocument}
          onRemoveDocument={handleRemoveDocument}
        />
      </div>
      
      {/* Document content viewer dialog */}
      <DocumentViewer 
        document={viewingDocument}
        isOpen={!!viewingDocument}
        onOpenChange={(open) => !open && setViewingDocument(null)}
      />
    </div>
  );
};

export default DocumentContext;
