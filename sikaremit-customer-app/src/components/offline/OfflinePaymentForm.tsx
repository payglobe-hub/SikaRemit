import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useOffline } from '../../contexts/OfflineContext';
import { useConnectivity } from '../../services/connectivity/ConnectivityContext';

interface OfflinePaymentFormProps {
  onSuccess?: (actionId: string) => void;
  onError?: (errors: string[]) => void;
  onCancel?: () => void;
  defaultRecipient?: string;
  defaultAmount?: number;
}

export const OfflinePaymentForm: React.FC<OfflinePaymentFormProps> = ({
  onSuccess,
  onError,
  onCancel,
  defaultRecipient = '',
  defaultAmount = 0,
}) => {
  const { queuePayment } = useOffline();
  const { isConnected, isGoodConnection } = useConnectivity();

  const [recipient, setRecipient] = useState(defaultRecipient);
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState('mtn_ghana');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('general');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const paymentMethods = [
    { id: 'mtn_ghana', name: 'MTN Mobile Money', icon: '📱' },
    { id: 'telecel_ghana', name: 'Telecel Cash', icon: '📱' },
    { id: 'airteltigo_ghana', name: 'AirtelTigo Money', icon: '📱' },
    { id: 'g_money', name: 'G-Money', icon: '💰' },
  ];

  const categories = [
    { id: 'general', name: 'General' },
    { id: 'food', name: 'Food & Dining' },
    { id: 'transport', name: 'Transportation' },
    { id: 'shopping', name: 'Shopping' },
    { id: 'bills', name: 'Bills & Utilities' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'education', name: 'Education' },
  ];

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!recipient.trim()) {
      newErrors.push('Recipient name is required');
    }

    if (!recipientAccount.trim()) {
      newErrors.push('Recipient account number is required');
    } else if (recipientAccount.replace(/\s/g, '').length < 8) {
      newErrors.push('Account number must be at least 8 digits');
    }

    if (!amount.trim()) {
      newErrors.push('Amount is required');
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.push('Amount must be greater than 0');
      } else if (amountNum > 10000) {
        newErrors.push('Maximum amount is GHS 10,000');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const paymentData = {
        amount: parseFloat(amount),
        currency: 'GHS',
        recipient: recipient.trim(),
        recipient_account: recipientAccount.replace(/\s/g, ''),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        category: category,
      };

      const result = await queuePayment(paymentData);

      if (result.success) {
        Alert.alert(
          'Payment Queued',
          isConnected 
            ? 'Your payment will be processed shortly.'
            : 'Your payment has been queued and will be processed when you\'re back online.',
          [
            { text: 'OK', onPress: () => onSuccess?.(result.actionId!) }
          ]
        );

        // Reset form
        setRecipient('');
        setRecipientAccount('');
        setAmount('');
        setNotes('');
        setCategory('general');
      } else {
        setErrors(result.errors || ['Failed to queue payment']);
        onError?.(result.errors || ['Failed to queue payment']);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      setErrors([errorMessage]);
      onError?.([errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isConnected ? 'Send Money' : 'Send Money (Offline Mode)'}
        </Text>
        {!isConnected && (
          <Text style={styles.offlineNotice}>
            📴 You're offline. Payment will be queued and sent when connection is restored.
          </Text>
        )}
        {isConnected && !isGoodConnection && (
          <Text style={styles.poorConnectionNotice}>
            📶 Poor connection. Payment may take longer to process.
          </Text>
        )}
      </View>

      {errors.length > 0 && (
        <View style={styles.errorContainer}>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Name</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Enter recipient name"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={recipientAccount}
            onChangeText={setRecipientAccount}
            placeholder="Enter account number"
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount (GHS)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.paymentMethodGrid}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodOption,
                  paymentMethod === method.id && styles.selectedPaymentMethod,
                ]}
                onPress={() => setPaymentMethod(method.id)}
                disabled={isSubmitting}
              >
                <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                <Text style={[
                  styles.paymentMethodName,
                  paymentMethod === method.id && styles.selectedPaymentMethodText,
                ]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryOption,
                  category === cat.id && styles.selectedCategory,
                ]}
                onPress={() => setCategory(cat.id)}
                disabled={isSubmitting}
              >
                <Text style={[
                  styles.categoryText,
                  category === cat.id && styles.selectedCategoryText,
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note..."
            multiline
            numberOfLines={3}
            editable={!isSubmitting}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isConnected ? 'Send Now' : 'Queue Payment'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  offlineNotice: {
    fontSize: 14,
    color: '#FF3B30',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  poorConnectionNotice: {
    fontSize: 14,
    color: '#FF9500',
    backgroundColor: '#FFF4E5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorContainer: {
    margin: 20,
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 4,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethodOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  selectedPaymentMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  paymentMethodName: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  selectedPaymentMethodText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedCategory: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  categoryText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  selectedCategoryText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OfflinePaymentForm;
