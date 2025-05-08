
import { MCPClientOptions, MCPContext, DocumentMetadata } from './types';
import { GoogleDriveService } from './GoogleDriveService';
import { ContextService } from './context';
import { toast } from 'sonner';
import { FileWatcher } from '@/utils/fileWatcher';

export { type MCPContext, type MCPClientOptions } from './types';

/**
 * Main MCP Client that coordinates Google Drive and Context services
 */
export class MCPClient {
  public serverUrl: string;
  private authToken: string | null;
  private contextService: ContextService;
  private driveService: GoogleDriveService;
  private initialized: boolean = false;
  
  constructor(options: MCPClientOptions = {}) {
    this.serverUrl = options.serverUrl || 'https://mcp-gdrive-server.example.com';
    this.authToken = options.authToken || null;
    this.contextService = new ContextService(options.metisActive || false);
    this.driveService = new GoogleDriveService();
    
    console.log('MCP Client initialized with options:', {
      serverUrl: this.serverUrl,
      hasAuthToken: !!this.authToken,
      metisActive: options.metisActive
    });
  }
  
  /**
   * Connect to Google Drive
   */
  async connectToDrive(clientId: string, apiKey: string): Promise<boolean> {
    try {
      console.log('Connecting to Google Drive with client ID and API key');
      const success = await this.driveService.connectToDrive(clientId, apiKey);
      if (success) {
        console.log('Successfully connected to Google Drive');
        return true;
      } else {
        console.error('Failed to connect to Google Drive');
        return false;
      }
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      return false;
    }
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
   * Get drive connection status
   */
  isDriveConnected(): boolean {
    return this.driveService.isConnected();
  }
  
  /**
   * List available documents
   */
  async listDocuments(folderId?: string): Promise<any[]> {
    console.log(`Listing documents${folderId ? ' in folder ' + folderId : ''}`);
    return await this.driveService.listDocuments(folderId);
  }
  
  /**
   * Reset drive connection
   */
  resetDriveConnection(): void {
    this.driveService.resetDriveConnection();
    console.log('Drive connection reset');
  }
  
  /**
   * Fetch document content
   */
  async fetchDocumentContent(documentId: string): Promise<string> {
    try {
      console.log(`Fetching content for document ${documentId}`);
      // Create a document metadata object with the required id field
      const documentMetadata: DocumentMetadata = { 
        id: documentId, 
        name: documentId, 
        mimeType: '' 
      };
      const content = await this.driveService.fetchDocumentContent(documentMetadata);
      
      if (!content || content.length === 0) {
        console.error(`Failed to fetch content for document ${documentId}: Content is empty`);
        throw new Error('Document content is empty');
      }
      
      console.log(`Successfully fetched content for document ${documentId}, length: ${content.length}`);
      return content;
    } catch (error) {
      console.error(`Error fetching document content for ${documentId}:`, error);
      throw error;
    }
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
      
      // Notify that document context was updated - use the correct event name
      FileWatcher.notifyDocumentContextChange();
    } catch (error) {
      console.error(`Failed to add document ${documentName} to context:`, error);
      toast.error(`Failed to add document ${documentName}`, {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
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
      await this.ensureContextInitialized();
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
      await this.ensureContextInitialized();
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

/**
 * Singleton instance of the MCP client
 */
let mcpClientInstance: MCPClient | null = null;

/**
 * Get the MCP client instance
 */
export function getMCPClient(options: MCPClientOptions = {}): MCPClient {
  if (!mcpClientInstance) {
    console.log('Creating new MCP client instance');
    mcpClientInstance = new MCPClient(options);
  } else {
    // Update options if needed
    if (options.metisActive !== undefined) {
      mcpClientInstance.setMetisActive(options.metisActive);
    }
  }
  
  return mcpClientInstance;
}
