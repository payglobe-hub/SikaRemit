// Utility functions for formatting data
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GH');
};

export const formatPhoneNumber = (phone: string): string => {
  // Ghana phone number formatting
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('233')) {
    return `+233 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
};

export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};
