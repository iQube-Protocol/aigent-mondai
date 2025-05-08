
import { MCPClientOptions, MCPContext, DocumentMetadata } from '../types';
import { GoogleDriveService } from '../GoogleDriveService';
import { ContextService } from '../context';
import { toast } from 'sonner';
import { FileWatcher } from '@/utils/fileWatcher';

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
}
