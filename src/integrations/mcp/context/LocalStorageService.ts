
import { MCPContext } from '../types';
import { ContextStorageService, StorageOptions } from './types';

/**
 * Service for storing MCP context in browser's localStorage
 */
export class LocalStorageService implements ContextStorageService {
  private storage: Storage;
  private keyPrefix: string;
  private maxDocumentSize: number;
  
  constructor(options: StorageOptions = {}) {
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.keyPrefix = options.keyPrefix || 'mcp-context-';
    // Set maximum document size to 1MB by default (localStorage has ~5MB total limit)
    this.maxDocumentSize = options.maxDocumentSize || 1024 * 1024;
    
    if (!this.storage) {
      console.warn('LocalStorage not available. Context persistence will not work.');
    }
  }
  
  /**
   * Save context to storage
   */
  saveContext(conversationId: string, context: MCPContext): void {
    if (!this.storage) {
      console.error('Cannot save context: Storage not available');
      return;
    }
    
    try {
      const key = `${this.keyPrefix}${conversationId}`;
      
      // First, verify document content integrity before saving
      if (context.documentContext && context.documentContext.length > 0) {
        // Safe copy of the context to avoid modifying the original
        const contextForStorage = this.prepareContextForStorage(context);
        
        // Log document sizes for debugging
        const docSizes = contextForStorage.documentContext.map(doc => ({
          name: doc.documentName,
          size: doc.content ? doc.content.length : 0
        }));
        console.log('Document sizes before storage:', docSizes);
        
        // Serialize and save to storage
        const serialized = JSON.stringify(contextForStorage);
        this.storage.setItem(key, serialized);
        
        // Verify that the context was saved correctly by reading it back
        this.verifyStoredContext(key, contextForStorage);
      } else {
        // No documents, just save the context normally
        const serialized = JSON.stringify(context);
        this.storage.setItem(key, serialized);
        console.log(`Saved context without documents for conversation ${conversationId}`);
      }
    } catch (error) {
      console.error('Error saving context to storage:', error);
      this.handleStorageError(conversationId, context, error);
    }
  }
  
  /**
   * Prepare context for storage by handling large documents
   */
  private prepareContextForStorage(context: MCPContext): MCPContext {
    const contextCopy = JSON.parse(JSON.stringify(context)) as MCPContext;
    
    if (contextCopy.documentContext) {
      // Check each document for size issues and handle them
      contextCopy.documentContext = contextCopy.documentContext.map(doc => {
        if (!doc.content) {
          console.warn(`Document ${doc.documentName} has no content, adding placeholder`);
          return { ...doc, content: '[No content available]' };
        }
        
        // Check if document is too large
        if (doc.content.length > this.maxDocumentSize) {
          console.warn(`Document ${doc.documentName} exceeds max size (${doc.content.length} > ${this.maxDocumentSize}), truncating`);
          // Truncate and add warning
          return { 
            ...doc, 
            content: doc.content.substring(0, this.maxDocumentSize) + 
                    '\n[CONTENT TRUNCATED DUE TO SIZE LIMITATIONS]'
          };
        }
        
        return doc;
      });
    }
    
    return contextCopy;
  }
  
  /**
   * Verify that the context was saved correctly
   */
  private verifyStoredContext(key: string, originalContext: MCPContext): void {
    const savedItem = this.storage?.getItem(key);
    if (!savedItem) {
      throw new Error(`Context was not saved properly: storage key ${key} not found`);
    }
    
    // Verify that document content survived serialization
    const savedContext = JSON.parse(savedItem) as MCPContext;
    
    if (savedContext.documentContext && originalContext.documentContext) {
      const originalDocCount = originalContext.documentContext.length;
      const savedDocCount = savedContext.documentContext.length;
      
      if (originalDocCount !== savedDocCount) {
        console.error(`Document count mismatch after saving. Original: ${originalDocCount}, Saved: ${savedDocCount}`);
      } else {
        console.log(`Successfully saved context with ${savedDocCount} documents`);
        
        // Check content integrity
        let hasContentLoss = false;
        savedContext.documentContext.forEach((doc, i) => {
          const originalDoc = originalContext.documentContext!.find(d => d.documentId === doc.documentId);
          if (originalDoc && originalDoc.content.length !== doc.content.length) {
            console.error(`Content length mismatch for document ${doc.documentName}. Original: ${originalDoc.content.length}, Saved: ${doc.content.length}`);
            hasContentLoss = true;
          }
        });
        
        if (hasContentLoss) {
          console.error('⚠️ Document content loss detected during save operation');
        }
      }
    }
  }
  
  /**
   * Try to save context with fallback strategies when errors occur
   */
  private handleStorageError(conversationId: string, context: MCPContext, error: any): void {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded. Attempting to save with reduced document content...');
      try {
        // Create a version with reduced document content for fallback
        const minimalContext = { ...context };
        if (minimalContext.documentContext) {
          minimalContext.documentContext = minimalContext.documentContext.map(doc => ({
            ...doc,
            content: `[Content removed due to storage limitations. Document: ${doc.documentName}]`
          }));
        }
        
        const key = `${this.keyPrefix}${conversationId}`;
        this.storage?.setItem(key, JSON.stringify(minimalContext));
        console.log('Saved context with reduced document content');
      } catch (fallbackError) {
        console.error('Failed to save even with reduced document content:', fallbackError);
        
        // Last resort: Try saving without any document content
        try {
          const bareContext = { ...context, documentContext: [] };
          const key = `${this.keyPrefix}${conversationId}`;
          this.storage?.setItem(key, JSON.stringify(bareContext));
          console.log('Saved context without any document content');
        } catch (lastError) {
          console.error('All attempts to save context failed:', lastError);
        }
      }
    }
  }
  
  /**
   * Load context from storage
   */
  loadContext(conversationId: string): MCPContext | null {
    if (!this.storage) {
      console.error('Cannot load context: Storage not available');
      return null;
    }
    
    try {
      const key = `${this.keyPrefix}${conversationId}`;
      const storedContext = this.storage.getItem(key);
      
      if (!storedContext) {
        console.log(`No stored context found for conversation ${conversationId}`);
        return null;
      }
      
      const parsedContext = JSON.parse(storedContext) as MCPContext;
      
      // Verify document content integrity after loading
      if (parsedContext.documentContext && parsedContext.documentContext.length > 0) {
        console.log(`Loaded context with ${parsedContext.documentContext.length} documents for ${conversationId}`);
        
        // Check for empty document content
        const emptyDocs = parsedContext.documentContext.filter(doc => !doc.content || doc.content.length === 0);
        if (emptyDocs.length > 0) {
          console.warn(`⚠️ ${emptyDocs.length} documents have empty content after loading:`, 
            emptyDocs.map(d => d.documentName));
        }
        
        parsedContext.documentContext.forEach((doc, i) => {
          console.log(`Document ${i+1}: ${doc.documentName}, Content length: ${doc.content?.length || 0}`);
          
          // Handle potentially truncated content
          if (doc.content && doc.content.includes('[CONTENT TRUNCATED DUE TO SIZE LIMITATIONS]')) {
            console.warn(`Document ${doc.documentName} was previously truncated due to size limitations`);
          }
        });
      } else {
        console.log(`Loaded context for ${conversationId} without document context`);
      }
      
      return parsedContext;
    } catch (error) {
      console.error('Error loading context from storage:', error);
      return null;
    }
  }
  
  /**
   * Remove context from storage
   */
  removeContext(conversationId: string): boolean {
    if (!this.storage) {
      console.error('Cannot remove context: Storage not available');
      return false;
    }
    
    try {
      const key = `${this.keyPrefix}${conversationId}`;
      this.storage.removeItem(key);
      
      // Verify deletion
      const itemExists = this.storage.getItem(key) !== null;
      if (itemExists) {
        console.warn(`Failed to remove context for ${conversationId} from storage`);
        return false;
      }
      
      console.log(`Successfully removed context for ${conversationId} from storage`);
      return true;
    } catch (error) {
      console.error('Error removing context from storage:', error);
      return false;
    }
  }
}
