// iQube types

export interface MetaQube {
  "iQube-Identifier": string;
  "iQube-Type": string;
  "iQube-Designer": string;
  "iQube-Use": string;
  "Owner-Type": string;
  "Owner-Identifiability": string;
  "Date-Minted": string;
  "Related-iQubes": string[];
  "X-of-Y": string;
  "Sensitivity-Score": number;
  "Verifiability-Score": number;
  "Accuracy-Score": number;
  "Risk-Score": number;
}

export interface BlakQube {
  "Profession": string;
  "Web3-Interests": string[];
  "Local-City": string;
  "Email": string;
  "EVM-Public-Key": string;
  "BTC-Public-Key": string;
  "Tokens-of-Interest": string[];
  "Chain-IDs": string[];
  "Wallets-of-Interest": string[];
  "Encryption-Key"?: string;
}

export interface TokenQube {
  tokenId: string;
  owner: string;
  accessGrants: string[];
  contractAddress: string;
  network: string;
}

export interface DataQube {
  metaQube: MetaQube;
  blakQube?: BlakQube;
  tokenQube: TokenQube;
}

// Agent types
export interface AgentMessage {
  id: string;
  sender: 'user' | 'agent';
  message: string;
  timestamp: string;
  attachments?: string[];
  metadata?: {
    version?: string;
    modelUsed?: string;
    contextRetained?: boolean;
    [key: string]: any;
  } | null;
}

export interface AgentConversation {
  messages: AgentMessage[];
  agentType: 'learn' | 'earn' | 'connect';
}

// Dashboard metrics
export interface DashboardMetrics {
  learnProgress: number;
  earnedTokens: number;
  connections: number;
  qubeHealth: number;
  recentActivity: string[];
}

// Token metrics
export interface TokenMetrics {
  price: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  allTimeHigh: number;
  holders: number;
  priceChange24h: number;
}

// Community metrics
export interface CommunityMetrics {
  totalMembers: number;
  activeMembers: number;
  upcomingEvents: number;
  totalConnections: number;
  groupsJoined: number;
  unreadMessages: number;
}

// User settings
export interface UserSettings {
  connected: {
    linkedin: boolean;
    luma: boolean;
    telegram: boolean;
    twitter: boolean;
    discord: boolean;
    wallet: boolean;
  };
  dataSync: boolean;
  notifications: boolean;
  theme: 'dark' | 'light';
  language: string;
}
