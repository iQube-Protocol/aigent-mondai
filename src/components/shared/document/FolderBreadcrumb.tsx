
import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

interface FolderHistory {
  id: string;
  name: string;
}

interface FolderBreadcrumbProps {
  currentFolder: string;
  folderHistory: FolderHistory[];
  navigateToFolder: (folderId: string, historyIndex?: number) => void;
  navigateToRoot: () => void;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  currentFolder,
  folderHistory,
  navigateToFolder,
  navigateToRoot
}) => {
  return (
    <div className="mb-4 flex items-center text-sm">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={navigateToRoot}
        disabled={!currentFolder}
        className="flex gap-1 items-center"
      >
        <FolderOpen className="h-4 w-4" />
        Root
      </Button>
      
      {folderHistory.map((folder, index) => (
        <React.Fragment key={folder.id}>
          <span className="mx-1">/</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigateToFolder(folder.id, index)}
          >
            {folder.name}
          </Button>
        </React.Fragment>
      ))}
      
      {currentFolder && !folderHistory.length && (
        <>
          <span className="mx-1">/</span>
          <span className="text-muted-foreground">Current Folder</span>
        </>
      )}
    </div>
  );
};

export default FolderBreadcrumb;
