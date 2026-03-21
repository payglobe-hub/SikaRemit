// QR code helper functions
export const generateQRData = (data: {
  type: string;
  merchantId: string;
  amount?: number;
  currency?: string;
  reference?: string;
  description?: string;
}): string => {
  const qrData = {
    version: '2.0',
    type: data.type,
    merchantId: data.merchantId,
    timestamp: new Date().toISOString(),
    ...(data.amount && { amount: data.amount }),
    ...(data.currency && { currency: data.currency }),
    ...(data.reference && { reference: data.reference }),
    ...(data.description && { description: data.description }),
  };

  return JSON.stringify(qrData);
};

export const parseQRData = (qrString: string): any => {
  try {
    const data = JSON.parse(qrString);

    // Validate required fields
    if (!data.type || !data.merchantId || !data.timestamp) {
      throw new Error('Invalid QR code data');
    }

    // Check if QR code is expired (15 minutes)
    const qrTime = new Date(data.timestamp);
    const now = new Date();
    const fifteenMinutes = 15 * 60 * 1000;

    if (now.getTime() - qrTime.getTime() > fifteenMinutes) {
      throw new Error('QR code has expired');
    }

    return data;
  } catch (error) {
    throw new Error('Invalid QR code format');
  }
};

export const validateQRPayment = (qrData: any, amount?: number): { isValid: boolean; error?: string } => {
  try {
    if (qrData.type !== 'payment') {
      return { isValid: false, error: 'Invalid QR code type' };
    }

    if (!qrData.merchantId) {
      return { isValid: false, error: 'Missing merchant ID' };
    }

    if (amount && qrData.amount && amount !== qrData.amount) {
      return { isValid: false, error: 'Payment amount does not match QR code' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'QR validation failed' };
  }
};

export const generateQRReference = (): string => {
  return `QR${Date.now()}${Math.floor(Math.random() * 1000)}`;
};
