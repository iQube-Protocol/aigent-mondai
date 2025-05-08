
import { ContextStorageService, StorageOptions } from './types';
import { MCPContext } from '../types';

/**
 * Implementation of ContextStorageService using localStorage
 */
export class LocalStorageService implements ContextStorageService {
  private storage: Storage;
  private keyPrefix: string;
  private maxDocumentSize: number; // Maximum size in bytes for a single document
  
  constructor(options: StorageOptions = {}) {
    this.storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);
    this.keyPrefix = options.keyPrefix || 'mcp_context_';
    this.maxDocumentSize = options.maxDocumentSize || 1024 * 1024; // Default 1MB
    
    if (!this.storage) {
      console.warn('LocalStorageService: Storage not available');
    } else {
      console.log('LocalStorageService initialized with prefix:', this.keyPrefix);
    }
  }
  
  /**
   * Save context to localStorage
   */
  saveContext(conversationId: string, context: MCPContext): void {
    if (!this.storage) {
      console.error('LocalStorageService: Storage not available, cannot save context');
      return;
    }
    
    try {
      // Handle document content chunking if needed
      if (context.documentContext && context.documentContext.length > 0) {
        // Make a copy of the context to avoid modifying the original
        const contextCopy: MCPContext = JSON.parse(JSON.stringify(context));
        
        // Store each document content separately if it's large
        for (let i = 0; i < contextCopy.documentContext.length; i++) {
          const doc = contextCopy.documentContext[i];
          if (doc.content && doc.content.length > this.maxDocumentSize / 2) {
            const docKey = `${this.keyPrefix}${conversationId}_doc_${doc.documentId}`;
            this.storage.setItem(docKey, doc.content);
            console.log(`Document ${doc.documentName} stored separately with key ${docKey}`);
            
            // Replace content with reference
            doc.content = `__DOC_REF__${docKey}`;
          }
        }
        
        // Store main context
        const key = `${this.keyPrefix}${conversationId}`;
        this.storage.setItem(key, JSON.stringify(contextCopy));
        console.log(`Context saved for conversation ${conversationId} with key ${key}`);
      } else {
        // Store main context without document handling
        const key = `${this.keyPrefix}${conversationId}`;
        this.storage.setItem(key, JSON.stringify(context));
        console.log(`Context saved for conversation ${conversationId} with key ${key}`);
      }
    } catch (error) {
      console.error('LocalStorageService: Error saving context:', error);
      // If error is quota exceeded, try to save without documents
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          const minimalContext = {...context};
          if (minimalContext.documentContext) {
            // Keep document metadata but not content
            minimalContext.documentContext = minimalContext.documentContext.map(doc => ({
              ...doc,
              content: `Content too large for storage (${doc.content?.length || 0} bytes)`
            }));
          }
          const key = `${this.keyPrefix}${conversationId}_minimal`;
          this.storage.setItem(key, JSON.stringify(minimalContext));
          console.warn(`Saved minimal context without document content for ${conversationId}`);
        } catch (e) {
          console.error('LocalStorageService: Failed to save even minimal context:', e);
        }
      }
    }
  }
  
  /**
   * Load context from localStorage
   */
  loadContext(conversationId: string): MCPContext | null {
    if (!this.storage) {
      console.error('LocalStorageService: Storage not available, cannot load context');
      return null;
    }
    
    try {
      const key = `${this.keyPrefix}${conversationId}`;
      const contextJson = this.storage.getItem(key);
      
      if (!contextJson) {
        console.log(`No context found for conversation ${conversationId}`);
        return null;
      }
      
      const context: MCPContext = JSON.parse(contextJson);
      console.log(`Loaded context for conversation ${conversationId}, parsing documents...`);
      
      // Handle document content references
      if (context.documentContext) {
        for (let i = 0; i < context.documentContext.length; i++) {
          const doc = context.documentContext[i];
          if (doc.content && typeof doc.content === 'string' && doc.content.startsWith('__DOC_REF__')) {
            const docKey = doc.content.replace('__DOC_REF__', '');
            const docContent = this.storage.getItem(docKey);
            
            if (docContent) {
              doc.content = docContent;
              console.log(`Loaded external document content for ${doc.documentName}`);
            } else {
              console.warn(`Document content not found for ${doc.documentName} with key ${docKey}`);
              doc.content = `Content reference lost: ${docKey}`;
            }
          }
        }
      }
      
      console.log(`Successfully loaded context for ${conversationId} with ${context.documentContext?.length || 0} documents`);
      return context;
    } catch (error) {
      console.error('LocalStorageService: Error loading context:', error);
      return null;
    }
  }
  
  /**
   * Remove context from localStorage
   */
  removeContext(conversationId: string): boolean {
    if (!this.storage) {
      console.error('LocalStorageService: Storage not available, cannot remove context');
      return false;
    }
    
    try {
      const key = `${this.keyPrefix}${conversationId}`;
      const contextJson = this.storage.getItem(key);
      
      if (contextJson) {
        // Parse context to find document references
        const context = JSON.parse(contextJson);
        
        // Remove document content entries if they exist
        if (context.documentContext) {
          for (const doc of context.documentContext) {
            if (doc.content && typeof doc.content === 'string' && doc.content.startsWith('__DOC_REF__')) {
              const docKey = doc.content.replace('__DOC_REF__', '');
              this.storage.removeItem(docKey);
              console.log(`Removed document storage for ${doc.documentName} with key ${docKey}`);
            }
          }
        }
      }
      
      // Remove main context
      this.storage.removeItem(key);
      console.log(`Removed context for conversation ${conversationId}`);
      
      // Also try to remove minimal context if it exists
      this.storage.removeItem(`${this.keyPrefix}${conversationId}_minimal`);
      
      return true;
    } catch (error) {
      console.error('LocalStorageService: Error removing context:', error);
      return false;
    }
  }
}
