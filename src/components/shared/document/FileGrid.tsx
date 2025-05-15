
import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, FolderOpen } from 'lucide-react';
import FileIcon from '@/components/shared/agent/document/FileIcon';

interface FileGridProps {
  documents: any[];
  isLoading: boolean;
  currentFolder: string;
  handleDocumentClick: (doc: any) => void;
  handleBack: () => void;
}

const FileGrid: React.FC<FileGridProps> = ({
  documents,
  isLoading,
  currentFolder,
  handleDocumentClick,
  handleBack
}) => {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {currentFolder && (
        <Card 
          className="p-4 cursor-pointer hover:bg-accent"
          onClick={handleBack}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-500" />
            <span>Back</span>
          </div>
        </Card>
      )}
      
      {documents.length === 0 && (
        <div className="col-span-2 text-center py-8 text-muted-foreground">
          {currentFolder ? 'This folder is empty' : 'No documents found in root folder'}
        </div>
      )}
      
      {documents.map((doc) => (
        <Card 
          key={doc.id} 
          className="p-4 cursor-pointer hover:bg-accent"
          onClick={() => handleDocumentClick(doc)}
        >
          <div className="flex items-center gap-2">
            <FileIcon mimeType={doc.mimeType} />
            <span className="truncate text-sm">{doc.name}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default FileGrid;
