
// This file re-exports from refactored modules for backward compatibility
import { EnhancedMCPClient, getMCPClient } from './MCPClientFactory';
import { MCPContext, MCPClientOptions } from './types';

export { type MCPContext, type MCPClientOptions } from './types';
export { EnhancedMCPClient as MCPClient, getMCPClient };
