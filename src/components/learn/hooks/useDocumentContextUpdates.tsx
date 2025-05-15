
import { useState } from 'react';

export function useDocumentContextUpdates() {
  const [documentContextUpdated, setDocumentContextUpdated] = useState<number>(0);

  const handleDocumentContextUpdated = () => {
    setDocumentContextUpdated(prev => prev + 1);
    console.log('Document context updated, triggering refresh');
  };

  return {
    documentContextUpdated,
    handleDocumentContextUpdated
  };
}
