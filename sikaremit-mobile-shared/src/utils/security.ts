// Security utility functions
export const hashString = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateSecureToken = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return token;
};

export const validateSecureToken = (token: string): boolean => {
  // Basic token validation - would need more sophisticated validation
  return token.length >= 32 && /^[A-Za-z0-9]+$/.test(token);
};

export const sanitizeInput = (input: string): string => {
  // Basic input sanitization
  return input.replace(/[<>]/g, '');
};

export const encryptData = (data: string, key: string): string => {
  // Placeholder for data encryption - would need proper crypto implementation
  return btoa(data + key);
};

export const decryptData = (encryptedData: string, key: string): string => {
  // Placeholder for data decryption - would need proper crypto implementation
  return atob(encryptedData).replace(key, '');
};
