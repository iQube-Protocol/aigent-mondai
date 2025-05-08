
/**
 * Utility to help track document changes and ensure UI updates
 */
export class FileWatcher {
  private static listeners: Map<string, Set<() => void>> = new Map();

  /**
   * Register a listener for file changes
   */
  static addListener(fileId: string, listener: () => void): void {
    if (!this.listeners.has(fileId)) {
      this.listeners.set(fileId, new Set());
    }
    this.listeners.get(fileId)?.add(listener);
  }

  /**
   * Remove a listener
   */
  static removeListener(fileId: string, listener: () => void): void {
    this.listeners.get(fileId)?.delete(listener);
  }

  /**
   * Notify all listeners that a file has changed
   */
  static notifyChange(fileId: string): void {
    console.log(`FileWatcher: notifying change for ${fileId}`);
    this.listeners.get(fileId)?.forEach(listener => listener());
  }
  
  /**
   * Notify all listeners about document context changes
   * This dispatches a consistent 'documentContextUpdated' event
   */
  static notifyDocumentContextChange(): void {
    console.log('FileWatcher: notifying document context change');
    // Dispatch a custom event that can be caught by document context components
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('documentContextUpdated', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    }
  }
}
