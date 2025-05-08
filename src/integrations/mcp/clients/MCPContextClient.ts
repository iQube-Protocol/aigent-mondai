
import { MCPContext } from '../types';
import { ContextService } from '../context';
import { FileWatcher } from '@/utils/fileWatcher';
import { MCPClient } from './MCPClient';

export class MCPContextClient {
  private contextService: ContextService;
  private initialized: boolean = false;
  
  constructor(contextService: ContextService) {
    this.contextService = contextService;
  }
  
  /**
   * Initialize context for a conversation
   */
  async initializeContext(conversationId?: string): Promise<string> {
    try {
      console.log(`Initializing MCP context for conversation ${conversationId || 'new'}`);
      const newConversationId = await this.contextService.initializeContext(conversationId);
      this.initialized = true;
      return newConversationId;
    } catch (error) {
      console.error('Error initializing MCP context:', error);
      throw error;
    }
  }
  
  /**
   * Ensure context is initialized
   */
  async ensureContextInitialized(conversationId?: string): Promise<string> {
    if (!this.initialized) {
      console.log('MCP context not initialized, initializing now');
      return await this.initializeContext(conversationId);
    }
    
    // Check if we need to switch conversation context
    const currentConversationId = this.contextService.getConversationId();
    if (conversationId && currentConversationId !== conversationId) {
      console.log(`Switching context from ${currentConversationId} to ${conversationId}`);
      return await this.initializeContext(conversationId);
    }
    
    return currentConversationId || await this.initializeContext();
  }
  
  /**
   * Add document to context
   */
  addDocumentToContext(
    documentId: string,
    documentName: string,
    documentType: string,
    content: string
  ): void {
    try {
      console.log(`Adding document to context: ${documentName} (${documentId})`);
      
      // Validate content
      if (!content || content.length === 0) {
        throw new Error(`Cannot add document ${documentName}: Content is empty`);
      }
      
      // Add to context
      this.contextService.addDocumentToContext(documentId, documentName, documentType, content);
      
      console.log(`Document ${documentName} successfully added to context`);
      
      // Notify that document context was updated
      FileWatcher.notifyDocumentContextChange();
    } catch (error) {
      console.error(`Failed to add document ${documentName} to context:`, error);
      throw error;
    }
  }
  
  /**
   * Remove document from context
   */
  removeDocumentFromContext(documentId: string): boolean {
    try {
      console.log(`Removing document ${documentId} from context`);
      const removed = this.contextService.removeDocumentFromContext(documentId);
      
      if (removed) {
        console.log(`Document ${documentId} successfully removed from context`);
        
        // Notify that document context was updated
        FileWatcher.notifyDocumentContextChange();
      } else {
        console.log(`Document ${documentId} was not found in context`);
      }
      
      return removed;
    } catch (error) {
      console.error(`Error removing document ${documentId} from context:`, error);
      return false;
    }
  }
  
  /**
   * Add user message to context
   */
  async addUserMessage(message: string): Promise<void> {
    try {
      console.log('Adding user message to context');
      await this.contextService.addUserMessage(message);
    } catch (error) {
      console.error('Error adding user message to context:', error);
      throw error;
    }
  }
  
  /**
   * Add agent response to context
   */
  async addAgentResponse(response: string): Promise<void> {
    try {
      console.log('Adding agent response to context');
      await this.contextService.addAgentResponse(response);
    } catch (error) {
      console.error('Error adding agent response to context:', error);
      throw error;
    }
  }
  
  /**
   * Get current model context
   */
  getModelContext(): MCPContext | null {
    try {
      // Refresh context from storage first to ensure we have latest changes
      this.contextService.refreshContextFromStorage();
      
      const context = this.contextService.getModelContext();
      
      // Verify document content integrity
      if (context?.documentContext && context.documentContext.length > 0) {
        console.log(`Retrieved model context with ${context.documentContext.length} documents`);
        
        // Check for documents with missing content
        const invalidDocs = context.documentContext.filter(doc => !doc.content || doc.content.length === 0);
        if (invalidDocs.length > 0) {
          console.warn(`⚠️ Found ${invalidDocs.length} documents with invalid content`, 
            invalidDocs.map(d => d.documentName));
        }
      } else {
        console.log('Retrieved model context without any documents');
      }
      
      return context;
    } catch (error) {
      console.error('Error getting model context:', error);
      return null;
    }
  }
  
  /**
   * Update model preference
   */
  setModelPreference(model: string): void {
    this.contextService.setModelPreference(model);
  }
  
  /**
   * Toggle Metis capabilities
   */
  setMetisActive(active: boolean): void {
    this.contextService.setMetisActive(active);
  }
  
  /**
   * Get conversation ID
   */
  getConversationId(): string | null {
    return this.contextService.getConversationId();
  }
  
  /**
   * Force refresh context from storage (for multi-tab synchronization)
   */
  refreshContext(): boolean {
    const result = this.contextService.refreshContextFromStorage();
    // Notify that document context might have changed
    if (result) {
      FileWatcher.notifyDocumentContextChange();
    }
    return result;
  }
}
