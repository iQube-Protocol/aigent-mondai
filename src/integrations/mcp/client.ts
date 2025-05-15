import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MCPContext {
  conversationId: string;
  documentContext?: {
    documentId: string;
    documentName: string;
    documentType: string;
    content: string;
    summary?: string;
    lastModified?: string;
  }[];
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  metadata: {
    userProfile?: Record<string, any>;
    environment?: string;
    modelPreference?: string;
    source?: 'google-drive' | 'local' | 'other';
    metisActive?: boolean;
  };
}

export interface MCPClientOptions {
  serverUrl?: string;
  authToken?: string;
  metisActive?: boolean;
}

export class MCPClient {
  private conversationId: string | null = null;
  public serverUrl: string;
  private authToken: string | null;
  private metisActive: boolean;
  private context: MCPContext | null = null;
  private gapi: any = null;
  private tokenClient: any = null;
  private isApiLoaded: boolean = false;
  private isAuthenticated: boolean = false;
  
  constructor(options: MCPClientOptions = {}) {
    this.serverUrl = options.serverUrl || 'https://mcp-gdrive-server.example.com';
    this.authToken = options.authToken || null;
    this.metisActive = options.metisActive || false;
    
    console.log('MCP Client initialized with options:', {
      serverUrl: this.serverUrl,
      hasAuthToken: !!this.authToken,
      metisActive: this.metisActive
    });
    
    // Load Google API script if it's not already loaded
    this.loadGoogleApi();
  }
  
  /**
   * Load Google API script dynamically
   */
  private loadGoogleApi(): void {
    if (typeof window !== 'undefined' && !this.isApiLoaded) {
      console.log('MCP: Loading Google API scripts...');
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => this.onGapiLoaded();
      script.onerror = (e) => {
        console.error('Failed to load Google API script:', e);
        toast.error('Failed to load Google API script', {
          description: 'Please check your internet connection and try again.'
        });
      };
      document.body.appendChild(script);
      
      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.onerror = (e) => {
        console.error('Failed to load Google Sign-In script:', e);
        toast.error('Failed to load Google Sign-In script', {
          description: 'Please check your internet connection and try again.'
        });
      };
      document.body.appendChild(gsiScript);
    }
  }
  
  /**
   * Callback when Google API script is loaded
   */
  private onGapiLoaded(): void {
    this.gapi = (window as any).gapi;
    if (!this.gapi) {
      console.error('MCP: Google API client failed to load');
      toast.error('Google API failed to load');
      return;
    }
    
    this.gapi.load('client', {
      callback: () => {
        this.isApiLoaded = true;
        console.log('MCP: Google API client loaded successfully');
      },
      onerror: (e: any) => {
        console.error('MCP: Failed to load Google API client:', e);
        toast.error('Failed to load Google API client', {
          description: 'Please try again or check your internet connection.'
        });
      }
    });
  }
  
  /**
   * Initializes or retrieves the conversation context
   */
  async initializeContext(existingConversationId?: string): Promise<string> {
    try {
      if (existingConversationId && this.conversationId !== existingConversationId) {
        console.log(`MCP: Loading existing conversation context: ${existingConversationId}`);
        // Try to fetch existing context from server or local storage
        const storedContext = localStorage.getItem(`mcp-context-${existingConversationId}`);
        if (storedContext) {
          this.context = JSON.parse(storedContext);
          this.conversationId = existingConversationId;
          console.log(`MCP: Loaded local context for conversation ${existingConversationId}`);
          return existingConversationId;
        }
        
        // If not found locally, create a new one
        console.log(`MCP: Context not found for ${existingConversationId}, creating new`);
      }

      // Create new conversation context
      const newConversationId = existingConversationId || crypto.randomUUID();
      this.conversationId = newConversationId;
      
      this.context = {
        conversationId: newConversationId,
        messages: [],
        metadata: {
          environment: "web3_education",
          modelPreference: "gpt-4o-mini",
          metisActive: this.metisActive,
          source: 'google-drive'
        }
      };
      
      console.log(`MCP: Created new conversation context with ID: ${newConversationId}`);
      
      // Save the context
      this.persistContext();
      
      return newConversationId;
    } catch (error) {
      console.error('MCP: Error initializing context:', error);
      throw new Error(`MCP initialization error: ${error.message}`);
    }
  }
  
  /**
   * Add a user message to the context
   */
  async addUserMessage(message: string): Promise<void> {
    if (!this.context || !this.conversationId) {
      await this.initializeContext();
    }
    
    if (this.context) {
      this.context.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      
      this.persistContext();
      console.log(`MCP: Added user message to context ${this.conversationId}`);
    }
  }
  
  /**
   * Add an agent response to the context
   */
  async addAgentResponse(response: string): Promise<void> {
    if (!this.context || !this.conversationId) {
      throw new Error('Cannot add agent response: Context not initialized');
    }
    
    this.context.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    
    this.persistContext();
    console.log(`MCP: Added agent response to context ${this.conversationId}`);
  }
  
  /**
   * Save context to persistence store
   */
  private persistContext(): void {
    if (this.context && this.conversationId) {
      try {
        // Save to local storage for now (in production, would likely use Supabase or other DB)
        localStorage.setItem(`mcp-context-${this.conversationId}`, JSON.stringify(this.context));
      } catch (error) {
        console.error('MCP: Error persisting context:', error);
      }
    }
  }
  
  /**
   * Connect to Google Drive and authorize access
   */
  async connectToDrive(clientId: string, apiKey: string): Promise<boolean> {
    console.log('MCP: Connecting to Google Drive with credentials:', { clientId, apiKeyLength: apiKey?.length });
    
    if (!clientId || !apiKey) {
      toast.error('Missing Google API credentials', {
        description: 'Both Client ID and API Key are required'
      });
      return false;
    }
    
    if (!this.isApiLoaded) {
      console.log('Google API not loaded yet, waiting...');
      toast.loading('Loading Google API...');
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject('Timed out waiting for Google API to load');
          }, 10000); // 10-second timeout
          
          const checkApiLoaded = setInterval(() => {
            if (this.isApiLoaded) {
              clearInterval(checkApiLoaded);
              clearTimeout(timeout);
              resolve(true);
            }
          }, 300);
        });
      } catch (error) {
        console.error('MCP: Timed out waiting for Google API to load:', error);
        toast.error('Google API failed to load in time', {
          description: 'Please refresh the page and try again.'
        });
        return false;
      }
    }
    
    try {
      // Initialize the Google API client with provided credentials
      await this.gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      
      // Create token client for OAuth 2.0 flow
      this.tokenClient = (window as any).google?.accounts?.oauth2?.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            this.isAuthenticated = true;
            localStorage.setItem('gdrive-connected', 'true');
            toast.success('Connected to Google Drive', {
              description: 'Your Google Drive documents are now available to the AI agents'
            });
            console.log('Successfully authenticated with Google Drive');
          }
        },
        error_callback: (error: any) => {
          console.error('OAuth error:', error);
          toast.error('Google authentication failed', {
            description: error.message || 'Failed to authenticate with Google'
          });
        }
      });
      
      if (!this.tokenClient) {
        console.error('Failed to initialize Google token client');
        toast.error('Failed to initialize Google authentication', {
          description: 'Google OAuth client initialization failed'
        });
        return false;
      }
      
      // Request access token
      toast.loading('Authenticating with Google...');
      this.tokenClient.requestAccessToken();
      
      return true;
    } catch (error) {
      console.error('MCP: Error connecting to Google Drive:', error);
      toast.error('Google Drive connection failed', { 
        description: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }
  
  /**
   * Load document metadata from Google Drive
   */
  async listDocuments(folderId?: string): Promise<any[]> {
    console.log(`MCP: Listing documents${folderId ? ' in folder ' + folderId : ''}`);
    
    if (!this.isAuthenticated) {
      console.error('MCP: Not authenticated with Google Drive');
      toast.error('Not connected to Google Drive', { 
        description: 'Please connect to Google Drive first' 
      });
      return [];
    }
    
    try {
      const query = folderId ? 
        `'${folderId}' in parents and trashed = false` : 
        `'root' in parents and trashed = false`;
      
      const response = await this.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 50
      });
      
      const files = response.result.files;
      console.log(`MCP: Found ${files.length} files in Google Drive`, files);
      return files;
    } catch (error) {
      console.error('MCP: Error listing documents from Google Drive:', error);
      toast.error('Failed to list documents', { 
        description: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }
  
  /**
   * Fetch a specific document and add its content to the context
   */
  async fetchDocumentContent(documentId: string): Promise<string | null> {
    console.log(`MCP: Fetching document content for ${documentId}`);
    
    if (!this.isAuthenticated) {
      console.error('MCP: Not authenticated with Google Drive');
      toast.error('Not connected to Google Drive', { 
        description: 'Please connect to Google Drive first' 
      });
      return null;
    }
    
    try {
      // First get the file metadata
      const fileMetadata = await this.gapi.client.drive.files.get({
        fileId: documentId,
        fields: 'name,mimeType'
      });
      
      const fileName = fileMetadata.result.name;
      const mimeType = fileMetadata.result.mimeType;
      
      // Handle different file types
      let documentContent = '';
      
      // For Google Docs, Sheets, and Slides, we need to export them in a readable format
      if (mimeType.includes('google-apps')) {
        const exportMimeType = this.getExportMimeType(mimeType);
        const exportResponse = await this.gapi.client.drive.files.export({
          fileId: documentId,
          mimeType: exportMimeType
        });
        
        documentContent = exportResponse.body;
      } else {
        // For other file types, use the files.get method with alt=media
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${documentId}?alt=media`,
          {
            headers: {
              'Authorization': `Bearer ${this.gapi.auth.getToken().access_token}`
            }
          }
        );
        
        // Check if response is ok and get content
        if (response.ok) {
          // For text-based files
          if (mimeType.includes('text') || mimeType.includes('json') || 
              mimeType.includes('javascript') || mimeType.includes('xml') ||
              mimeType.includes('html') || mimeType.includes('css')) {
            documentContent = await response.text();
          } else {
            // For binary files, we can only provide basic info
            documentContent = `This file (${fileName}) is a binary file of type ${mimeType} and cannot be displayed as text.`;
          }
        } else {
          throw new Error(`Failed to fetch file content: ${response.statusText}`);
        }
      }
      
      // Extract document type from mimeType
      const documentType = this.getDocumentType(mimeType);
      
      // Add to context
      if (this.context) {
        if (!this.context.documentContext) {
          this.context.documentContext = [];
        }
        
        // Check if document already exists in context
        const existingDocIndex = this.context.documentContext.findIndex(doc => doc.documentId === documentId);
        
        if (existingDocIndex >= 0) {
          // Update existing document
          this.context.documentContext[existingDocIndex] = {
            documentId,
            documentName: fileName,
            documentType,
            content: documentContent,
            lastModified: new Date().toISOString()
          };
        } else {
          // Add new document
          this.context.documentContext.push({
            documentId,
            documentName: fileName,
            documentType,
            content: documentContent,
            lastModified: new Date().toISOString()
          });
        }
        
        this.persistContext();
        console.log(`MCP: Added/updated document ${fileName} to context`);
      }
      
      return documentContent;
    } catch (error) {
      console.error(`MCP: Error fetching document ${documentId}:`, error);
      toast.error('Failed to fetch document', { 
        description: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }
  
  /**
   * Get the appropriate export MIME type for Google Workspace files
   */
  private getExportMimeType(originalMimeType: string): string {
    switch (originalMimeType) {
      case 'application/vnd.google-apps.document':
        return 'text/plain';
      case 'application/vnd.google-apps.spreadsheet':
        return 'text/csv';
      case 'application/vnd.google-apps.presentation':
        return 'text/plain';
      default:
        return 'text/plain';
    }
  }
  
  /**
   * Get simplified document type from MIME type
   */
  private getDocumentType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'sheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slide';
    if (mimeType.includes('text') || mimeType.includes('txt')) return 'txt';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('video')) return 'video';
    return 'file';
  }
  
  /**
   * Get the current context for use in AI models
   */
  getModelContext(): MCPContext | null {
    return this.context;
  }
  
  /**
   * Update model preferences in the context
   */
  setModelPreference(model: string): void {
    if (this.context) {
      this.context.metadata.modelPreference = model;
      this.persistContext();
    }
  }
  
  /**
   * Enable or disable Metis capabilities
   */
  setMetisActive(active: boolean): void {
    this.metisActive = active;
    if (this.context) {
      this.context.metadata.metisActive = active;
      this.persistContext();
    }
  }
  
  /**
   * Get the conversation ID
   */
  getConversationId(): string | null {
    return this.conversationId;
  }
  
  /**
   * Set the authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }
  
  /**
   * Set the server URL
   */
  setServerUrl(url: string): void {
    this.serverUrl = url;
  }
  
  /**
   * Check if connected to Google Drive
   */
  isConnectedToDrive(): boolean {
    return this.isAuthenticated || localStorage.getItem('gdrive-connected') === 'true';
  }
}

// Singleton instance for global use
let mcpClientInstance: MCPClient | null = null;

/**
 * Get the global MCP client instance
 */
export const getMCPClient = (options?: MCPClientOptions): MCPClient => {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient(options);
  } else if (options) {
    // Update existing instance with new options if provided
    if (options.serverUrl) mcpClientInstance.setServerUrl(options.serverUrl);
    if (options.authToken) mcpClientInstance.setAuthToken(options.authToken);
    if (options.metisActive !== undefined) mcpClientInstance.setMetisActive(options.metisActive);
  }
  
  return mcpClientInstance;
};
