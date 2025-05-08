
import { MCPClient } from './clients/MCPClient';
import { MCPContextClient } from './clients/MCPContextClient';
import { MCPClientOptions } from './types';
import { ContextService } from './context';

/**
 * Enhanced MCP client that combines base client and context functionality
 */
export class EnhancedMCPClient extends MCPClient {
  private contextClient: MCPContextClient;
  
  constructor(options: MCPClientOptions = {}) {
    super(options);
    const contextService = new ContextService(options.metisActive || false);
    this.contextClient = new MCPContextClient(contextService);
  }
  
  // Context methods (delegating to context client)
  async initializeContext(conversationId?: string): Promise<string> {
    return this.contextClient.initializeContext(conversationId);
  }
  
  async ensureContextInitialized(conversationId?: string): Promise<string> {
    return this.contextClient.ensureContextInitialized(conversationId);
  }
  
  addDocumentToContext(
    documentId: string,
    documentName: string,
    documentType: string,
    content: string
  ): void {
    this.contextClient.addDocumentToContext(documentId, documentName, documentType, content);
  }
  
  removeDocumentFromContext(documentId: string): boolean {
    return this.contextClient.removeDocumentFromContext(documentId);
  }
  
  async addUserMessage(message: string): Promise<void> {
    await this.contextClient.ensureContextInitialized();
    await this.contextClient.addUserMessage(message);
  }
  
  async addAgentResponse(response: string): Promise<void> {
    await this.contextClient.ensureContextInitialized();
    await this.contextClient.addAgentResponse(response);
  }
  
  getModelContext() {
    return this.contextClient.getModelContext();
  }
  
  setModelPreference(model: string): void {
    this.contextClient.setModelPreference(model);
  }
  
  setMetisActive(active: boolean): void {
    this.contextClient.setMetisActive(active);
  }
  
  getConversationId(): string | null {
    return this.contextClient.getConversationId();
  }
  
  refreshContext(): boolean {
    return this.contextClient.refreshContext();
  }
}

/**
 * Singleton instance of the MCP client
 */
let mcpClientInstance: EnhancedMCPClient | null = null;

/**
 * Get the MCP client instance (factory method)
 */
export function getMCPClient(options: MCPClientOptions = {}): EnhancedMCPClient {
  if (!mcpClientInstance) {
    console.log('Creating new MCP client instance');
    mcpClientInstance = new EnhancedMCPClient(options);
  } else {
    // Update options if needed
    if (options.metisActive !== undefined) {
      mcpClientInstance.setMetisActive(options.metisActive);
    }
  }
  
  return mcpClientInstance;
}
