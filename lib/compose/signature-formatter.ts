export interface Signature {
  text: string;
  url?: string;
}

export function formatSignature(
  signature: Signature,
  platform: string
): string {
  switch (platform) {
    case 'linkedin':
    case 'facebook':
      return `\n\n---\n${signature.text}${signature.url ? `\n${signature.url}` : ''}`;
    case 'x':
    case 'threads':
    case 'bluesky':
      return signature.url ? `\n\n${signature.url}` : `\n\n${signature.text}`;
    case 'instagram':
      return `\n\n.\n.\n.\n${signature.text}`;
    default:
      return `\n\n${signature.text}`;
  }
}

export function getSignatureLength(signature: Signature, platform: string): number {
  return formatSignature(signature, platform).length;
}
