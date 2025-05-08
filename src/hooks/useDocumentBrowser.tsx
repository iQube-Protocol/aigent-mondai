
import { useState, useEffect, useCallback } from 'react';
import { useMCP } from './use-mcp';

export function useDocumentBrowser() {
  const { client, isLoading: clientLoading } = useMCP();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [folderHistory, setFolderHistory] = useState<{ id: string, name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // List documents when the dialog is opened or folder changes
  useEffect(() => {
    if (isOpen && client?.isDriveConnected()) {
      refreshCurrentFolder();
    }
  }, [isOpen, currentFolder, client]);

  // Handle initial list documents on dialog open
  const refreshCurrentFolder = useCallback(async () => {
    if (!client) return;
    
    setIsLoading(true);
    try {
      console.log('Listing documents with folder ID:', currentFolder || 'root');
      const docs = await client.listDocuments(currentFolder || undefined);
      console.log('Documents received:', docs);
      setDocuments(docs);
    } catch (error) {
      console.error('Error listing documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, currentFolder]);

  // Handle document click
  const handleDocumentClick = useCallback((doc: any) => {
    if (doc.mimeType.includes('folder')) {
      // Navigate into the folder
      setFolderHistory(prev => [...prev, { id: currentFolder, name: doc.name }]);
      setCurrentFolder(doc.id);
      return null;
    } else {
      // Return the document for selection
      console.log('Document selected:', doc);
      return doc;
    }
  }, [currentFolder]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      const lastFolder = newHistory.pop();
      setFolderHistory(newHistory);
      setCurrentFolder(lastFolder?.id || '');
    }
  }, [folderHistory]);

  // Navigate to a specific folder in the breadcrumb
  const navigateToFolder = useCallback((index: number) => {
    if (index < 0) {
      setCurrentFolder('');
      setFolderHistory([]);
    } else if (index < folderHistory.length) {
      const newHistory = folderHistory.slice(0, index + 1);
      setFolderHistory(newHistory);
      setCurrentFolder(newHistory[index].id);
    }
  }, [folderHistory]);

  // Navigate to root
  const navigateToRoot = useCallback(() => {
    setCurrentFolder('');
    setFolderHistory([]);
  }, []);

  return {
    documents,
    isLoading: isLoading || clientLoading,
    currentFolder,
    folderHistory,
    isOpen,
    setIsOpen,
    handleDocumentClick,
    handleBack,
    navigateToFolder,
    navigateToRoot,
    refreshCurrentFolder
  };
}

