import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define interfaces for our MCP client
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
  onApiLoadStart?: () => void;
  onApiLoadComplete?: () => void;
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
  private apiLoadPromise: Promise<boolean> | null = null;
  private onApiLoadStart: (() => void) | null = null;
  private onApiLoadComplete: (() => void) | null = null;
  private apiLoadTimeout: number = 30000; // Increased from 20s to 30s for API loading
  
  constructor(options: MCPClientOptions = {}) {
    this.serverUrl = options.serverUrl || 'https://mcp-gdrive-server.example.com';
    this.authToken = options.authToken || null;
    this.metisActive = options.metisActive || false;
    this.onApiLoadStart = options.onApiLoadStart || null;
    this.onApiLoadComplete = options.onApiLoadComplete || null;
    
    console.log('MCP Client initialized with options:', {
      serverUrl: this.serverUrl,
      hasAuthToken: !!this.authToken,
      metisActive: this.metisActive
    });
    
    // Load Google API script if it's not already loaded
    this.loadGoogleApi();
  }
  
  /**
   * Load Google API script dynamically with improved error handling
   */
  private loadGoogleApi(): void {
    if (typeof window !== 'undefined' && !this.isApiLoaded && !this.apiLoadPromise) {
      console.log('MCP: Loading Google API scripts...');
      
      if (this.onApiLoadStart) {
        this.onApiLoadStart();
      }
      
      // First check if APIs are already loaded
      if ((window as any).gapi && (window as any).google?.accounts) {
        console.log('MCP: Google APIs already loaded');
        this.isApiLoaded = true;
        if (this.onApiLoadComplete) {
          this.onApiLoadComplete();
        }
        this.apiLoadPromise = Promise.resolve(true);
        return;
      }
      
      // Create a promise that resolves when both scripts are loaded or rejects on timeout
      this.apiLoadPromise = new Promise((resolve, reject) => {
        let gapiLoaded = false;
        let gsiLoaded = false;
        let timeoutTriggered = false;
        
        // Set a timeout to prevent hanging if scripts fail to load
        const timeoutId = setTimeout(() => {
          if (!gapiLoaded || !gsiLoaded) {
            console.error('MCP: Google API loading timed out after', this.apiLoadTimeout / 1000, 'seconds');
            timeoutTriggered = true;
            if (this.onApiLoadComplete) {
              this.onApiLoadComplete();
            }
            reject(new Error('Google API loading timed out'));
          }
        }, this.apiLoadTimeout);
        
        const checkAllLoaded = () => {
          if (gapiLoaded && gsiLoaded && !timeoutTriggered) {
            clearTimeout(timeoutId);
            console.log('MCP: Both Google APIs loaded successfully');
            if (this.onApiLoadComplete) {
              this.onApiLoadComplete();
            }
            this.isApiLoaded = true;
            resolve(true);
          }
        };
        
        // Add gapi script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true; // Add defer attribute to ensure proper loading
        script.onload = () => {
          console.log('MCP: Google API script loaded');
          this.gapi = (window as any).gapi;
          if (this.gapi) {
            this.gapi.load('client', {
              callback: () => {
                console.log('MCP: Google API client loaded successfully');
                gapiLoaded = true;
                checkAllLoaded();
              },
              onerror: (e: any) => {
                console.error('MCP: Failed to load Google API client:', e);
                if (!timeoutTriggered) {
                  clearTimeout(timeoutId);
                  if (this.onApiLoadComplete) {
                    this.onApiLoadComplete();
                  }
                  reject(e);
                }
              },
              timeout: 20000, // 20 seconds
              ontimeout: () => {
                console.error('MCP: Google API client load timed out');
                if (!timeoutTriggered) {
                  clearTimeout(timeoutId);
                  if (this.onApiLoadComplete) {
                    this.onApiLoadComplete();
                  }
                  reject(new Error('Google API client load timed out'));
                }
              }
            });
          } else {
            console.error('MCP: Google API failed to load');
            if (!timeoutTriggered) {
              clearTimeout(timeoutId);
              if (this.onApiLoadComplete) {
                this.onApiLoadComplete();
              }
              reject(new Error('Google API failed to load'));
            }
          }
        };
        script.onerror = (e) => {
          console.error('Failed to load Google API script:', e);
          if (!timeoutTriggered) {
            clearTimeout(timeoutId);
            toast.error('Failed to load Google API script', {
              description: 'Please check your internet connection and try again.'
            });
            if (this.onApiLoadComplete) {
              this.onApiLoadComplete();
            }
            reject(e);
          }
        };
        
        // Add GSI script in parallel 
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true; // Add defer attribute to ensure proper loading
        gsiScript.onload = () => {
          console.log('MCP: Google Sign-In script loaded');
          gsiLoaded = true;
          checkAllLoaded();
        };
        gsiScript.onerror = (e) => {
          console.error('Failed to load Google Sign-In script:', e);
          if (!timeoutTriggered) {
            clearTimeout(timeoutId);
            toast.error('Failed to load Google Sign-In script', {
              description: 'Please check your internet connection and try again.'
            });
            if (this.onApiLoadComplete) {
              this.onApiLoadComplete();
            }
            reject(e);
          }
        };
        
        // Add both scripts to document
        document.body.appendChild(script);
        document.body.appendChild(gsiScript);
      });
    }
  }
  
  /**
   * Ensures Google API is loaded before proceeding with proper timeout
   */
  private async ensureGoogleApiLoaded(): Promise<boolean> {
    // Quick check if API is already loaded
    if (this.isApiLoaded || (
      window && (window as any).gapi && 
      (window as any).gapi.client && 
      (window as any).google?.accounts
    )) {
      this.isApiLoaded = true;
      return true;
    }
    
    if (this.apiLoadPromise) {
      try {
        const loadTimeout = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Google API loading timed out')), this.apiLoadTimeout);
        });
        
        // Race between the loading promise and timeout
        const result = await Promise.race([this.apiLoadPromise, loadTimeout]);
        this.isApiLoaded = result;
        return result;
      } catch (e) {
        console.error('Error waiting for Google API to load:', e);
        toast.error('Failed to load Google API', {
          description: 'Please refresh the page and try again'
        });
        return false;
      }
    } else {
      // If apiLoadPromise doesn't exist yet, start loading process
      this.loadGoogleApi();
      
      if (!this.apiLoadPromise) {
        console.error('Failed to initialize API loading process');
        return false;
      }
      
      try {
        const result = await this.apiLoadPromise;
        return result;
      } catch (e) {
        console.error('Error starting Google API load:', e);
        return false;
      }
    }
  }
  
  /**
   * Initialize or retrieve the conversation context
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
   * Connect to Google Drive and authorize access with optimizations and better error handling
   */
  async connectToDrive(clientId: string, apiKey: string, cachedToken?: string | null): Promise<boolean> {
    console.log('MCP: Connecting to Google Drive with credentials:', { clientId, apiKeyLength: apiKey?.length });
    
    if (!clientId || !apiKey) {
      toast.error('Missing Google API credentials', {
        description: 'Both Client ID and API Key are required'
      });
      return false;
    }
    
    try {
      // Wait for API to be loaded with a proper timeout
      const apiLoaded = await this.ensureGoogleApiLoaded();
      if (!apiLoaded) {
        console.error('Google API failed to load after waiting');
        toast.error('Google API failed to load', {
          description: 'Please refresh the page and try again.'
        });
        return false;
      }
      
      // Check if gapi is available
      if (!this.gapi || !this.gapi.client) {
        console.error('Google API client not available');
        toast.error('Google API client not available', {
          description: 'Please refresh the page and try again.'
        });
        return false;
      }
      
      // Initialize the Google API client with provided credentials
      try {
        await this.gapi.client.init({
          apiKey: apiKey,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        console.log('MCP: Google API client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Google API client:', error);
        toast.error('Failed to initialize Google API client', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;
      }
      
      // If we have a cached token, try to use it directly
      if (cachedToken) {
        try {
          console.log('MCP: Trying cached token');
          this.gapi.client.setToken(JSON.parse(cachedToken));
          
          // Test if the token is still valid with a simple API call
          try {
            await this.gapi.client.drive.files.list({
              pageSize: 1,
              fields: 'files(id)'
            });
            
            // If we got here, the token is valid
            this.isAuthenticated = true;
            localStorage.setItem('gdrive-connected', 'true');
            console.log('Successfully authenticated with Google Drive using cached token');
            return true;
          } catch (e) {
            // Token is invalid, proceed with normal flow
            console.log('Cached token is invalid, proceeding with regular auth flow');
          }
        } catch (e) {
          console.error('Error parsing cached token:', e);
        }
      }
      
      // Create token client for OAuth 2.0 flow (only if cached token didn't work)
      const googleAccounts = (window as any).google?.accounts;
      if (!googleAccounts) {
        toast.error('Google Sign-In API not available', {
          description: 'Please check your internet connection and try again'
        });
        return false;
      }
      
      // Use a promise to track the OAuth flow with a timeout
      return new Promise((resolve) => {
        // Add a timeout to avoid hanging UI if auth callback doesn't fire
        const authTimeout = setTimeout(() => {
          console.error('OAuth flow timed out');
          toast.error('Authentication timed out', {
            description: 'Please try again or refresh the page'
          });
          resolve(false);
        }, 30000); // 30 second timeout
        
        try {
          this.tokenClient = googleAccounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (tokenResponse: any) => {
              clearTimeout(authTimeout);
              if (tokenResponse && tokenResponse.access_token) {
                this.isAuthenticated = true;
                localStorage.setItem('gdrive-connected', 'true');
                
                // Cache the token
                try {
                  localStorage.setItem('gdrive-auth-token', JSON.stringify(this.gapi.client.getToken()));
                } catch (e) {
                  console.error('Failed to cache token:', e);
                }
                
                toast.success('Connected to Google Drive', {
                  description: 'Your Google Drive documents are now available to the AI agents'
                });
                console.log('Successfully authenticated with Google Drive');
                resolve(true);
              } else {
                resolve(false);
              }
            },
            error_callback: (error: any) => {
              clearTimeout(authTimeout);
              console.error('OAuth error:', error);
              toast.error('Google authentication failed', {
                description: error.message || 'Failed to authenticate with Google'
              });
              resolve(false);
            }
          });
          
          // Request access token
          console.log('MCP: Requesting OAuth token');
          this.tokenClient.requestAccessToken({ prompt: 'consent' }); // Changed from '' to 'consent' to ensure proper auth flow
        } catch (e) {
          clearTimeout(authTimeout);
          console.error('Error requesting access token:', e);
          toast.error('Google authentication failed', {
            description: e instanceof Error ? e.message : 'Failed to authenticate with Google'
          });
          resolve(false);
        }
      });
    } catch (error) {
      console.error('MCP: Error connecting to Google Drive:', error);
      toast.error('Google Drive connection failed', { 
        description: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }
  
  /**
   * Load document metadata from Google Drive with optimizations
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
      
      // Use batching for faster response
      const response = await this.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 50,
        // Enable HTTP request batching
        supportsAllDrives: false
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
    
    // Handle API loading callbacks
    if (options.onApiLoadStart) {
      mcpClientInstance.onApiLoadStart = options.onApiLoadStart;
    }
    if (options.onApiLoadComplete) {
      mcpClientInstance.onApiLoadComplete = options.onApiLoadComplete;
    }
  }
  
  return mcpClientInstance;
};
