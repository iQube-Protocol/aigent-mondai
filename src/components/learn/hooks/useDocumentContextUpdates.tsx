
import { useState, useEffect } from 'react';

export function useDocumentContextUpdates() {
  const [documentContextUpdated, setDocumentContextUpdated] = useState<number>(0);

  // Listen for document context updates
  useEffect(() => {
    const handleDocumentContextUpdated = () => {
      setDocumentContextUpdated(prev => prev + 1);
      console.log('Document context updated, triggering refresh');
    };
    
    // Use the correct event name
    window.addEventListener('documentContextUpdated', handleDocumentContextUpdated);
    
    return () => {
      window.removeEventListener('documentContextUpdated', handleDocumentContextUpdated);
    };
  }, []);

  const handleDocumentContextUpdated = () => {
    setDocumentContextUpdated(prev => prev + 1);
    console.log('Document context updated, triggering refresh');
  };

  return {
    documentContextUpdated,
    handleDocumentContextUpdated
  };
}
