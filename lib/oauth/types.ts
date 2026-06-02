export type AuthType = 'oauth' | 'meta' | 'google' | 'direct';
export type RefreshType = 'standard' | 'meta' | 'google' | 'bluesky';
export type CredentialSource = 'own' | 'meta' | 'google';

export interface PlatformConfig {
  name: string;
  displayName: string;
  authType: AuthType;
  refreshType: RefreshType;
  credentialSource: CredentialSource;
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  apiBaseUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  requiresPkce: boolean;
  iconComponent: string;
}

export interface PlatformEnvVars {
  clientId: string;
  clientSecret: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface ConnectedAccountInfo {
  platform: string;
  platformUserId: string;
  platformUsername?: string;
}
