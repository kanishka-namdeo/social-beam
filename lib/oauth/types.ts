export interface PlatformConfig {
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  apiBaseUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
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
