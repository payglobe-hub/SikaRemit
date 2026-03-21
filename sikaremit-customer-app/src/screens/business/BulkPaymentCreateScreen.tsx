import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { b2bService } from '@sikaremit/mobile-shared/services/b2bService';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../constants/theme';

const BulkPaymentCreateScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    payment_items: [] as Array<{
      recipient_name: string;
      recipient_phone: string;
      recipient_email: string;
      amount: string;
      description: string;
    }>,
  });

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const addPaymentItem = () => {
    setFormData(prev => ({
      ...prev,
      payment_items: [...prev.payment_items, {
        recipient_name: '',
        recipient_phone: '',
        recipient_email: '',
        amount: '',
        description: '',
      }]
    }));
  };

  const updatePaymentItem = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      payment_items: prev.payment_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removePaymentItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      payment_items: prev.payment_items.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Payment name is required';
    }

    if (formData.payment_items.length === 0) {
      errors.items = 'At least one payment item is required';
    }

    formData.payment_items.forEach((item, index) => {
      if (!item.recipient_name.trim()) {
        errors[`item_${index}_name`] = 'Recipient name is required';
      }
      if (!item.amount || parseFloat(item.amount) <= 0) {
        errors[`item_${index}_amount`] = 'Valid amount is required';
      }
      if (!item.recipient_phone && !item.recipient_email) {
        errors[`item_${index}_contact`] = 'Phone or email is required';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePayment = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    try {
      setLoading(true);

      const paymentData = {
        name: formData.name,
        description: formData.description,
        currency: 'GHS',
        payment_items: formData.payment_items.map(item => ({
          recipient_name: item.recipient_name,
          recipient_phone: item.recipient_phone,
          recipient_email: item.recipient_email,
          amount: parseFloat(item.amount),
          description: item.description,
          payment_method: 'bank_transfer',
        })),
      };

      // Validate bulk payment
      const validation = await b2bService.validateBulkPayment(paymentData.payment_items);
      if (!validation.is_valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Create bulk payment
      const bulkPayment = await b2bService.createBulkPayment(paymentData);

      Alert.alert(
        'Success',
        'Bulk payment created successfully. Would you like to submit it for approval?',
        [
          { text: 'Edit Later', style: 'cancel' },
          {
            text: 'Submit for Approval',
            onPress: async () => {
              await b2bService.submitBulkPaymentForApproval(bulkPayment.id);
              navigation.navigate('BulkPaymentDetail', { paymentId: bulkPayment.id });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Failed to create bulk payment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create bulk payment');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return formData.payment_items.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + amount;
    }, 0);
  };

  const renderPaymentItem = (item: any, index: number) => (
    <Card key={index} variant="default" padding="md" style={styles.paymentItemCard}>
      <View style={styles.paymentItemHeader}>
        <Text style={[styles.paymentItemTitle, { color: colors.text }]}>
          Payment {index + 1}
        </Text>
        <TouchableOpacity onPress={() => removePaymentItem(index)}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Recipient Name *</Text>
        <TextInput
          style={[styles.textInput, { borderColor: validationErrors[`item_${index}_name`] ? colors.error : colors.border }]}
          value={item.recipient_name}
          onChangeText={(value) => updatePaymentItem(index, 'recipient_name', value)}
          placeholder="Enter recipient name"
        />
        {validationErrors[`item_${index}_name`] && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {validationErrors[`item_${index}_name`]}
          </Text>
        )}
      </View>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone</Text>
          <TextInput
            style={[styles.textInput, { borderColor: colors.border }]}
            value={item.recipient_phone}
            onChangeText={(value) => updatePaymentItem(index, 'recipient_phone', value)}
            placeholder="+233XXXXXXXXX"
            keyboardType="phone-pad"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.textInput, { borderColor: colors.border }]}
            value={item.recipient_email}
            onChangeText={(value) => updatePaymentItem(index, 'recipient_email', value)}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      {validationErrors[`item_${index}_contact`] && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {validationErrors[`item_${index}_contact`]}
        </Text>
      )}

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount (GHS) *</Text>
        <TextInput
          style={[styles.textInput, { borderColor: validationErrors[`item_${index}_amount`] ? colors.error : colors.border }]}
          value={item.amount}
          onChangeText={(value) => updatePaymentItem(index, 'amount', value)}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        {validationErrors[`item_${index}_amount`] && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {validationErrors[`item_${index}_amount`]}
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.textInput, { borderColor: colors.border }]}
          value={item.description}
          onChangeText={(value) => updatePaymentItem(index, 'description', value)}
          placeholder="Payment description (optional)"
          multiline
          numberOfLines={2}
        />
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Create Bulk Payment</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Info */}
        <Card variant="default" padding="lg" style={styles.basicInfoCard}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Payment Name *</Text>
            <TextInput
              style={[styles.textInput, { borderColor: validationErrors.name ? colors.error : colors.border }]}
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder="e.g., Monthly Payroll, Vendor Payments"
            />
            {validationErrors.name && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {validationErrors.name}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.textInput, { borderColor: colors.border }]}
              value={formData.description}
              onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
              placeholder="Optional description"
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>

        {/* Payment Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Payment Recipients ({formData.payment_items.length})
            </Text>
            <TouchableOpacity onPress={addPaymentItem} style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Recipient</Text>
            </TouchableOpacity>
          </View>

          {formData.payment_items.length === 0 ? (
            <Card variant="default" padding="xl" style={styles.emptyStateCard}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Recipients Added</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Click "Add Recipient" to start adding payment recipients
              </Text>
              <TouchableOpacity onPress={addPaymentItem} style={styles.emptyStateButton}>
                <Text style={[styles.emptyStateButtonText, { color: colors.primary }]}>
                  Add First Recipient
                </Text>
              </TouchableOpacity>
            </Card>
          ) : (
            formData.payment_items.map((item, index) => renderPaymentItem(item, index))
          )}

          {validationErrors.items && (
            <Text style={[styles.errorText, { color: colors.error, textAlign: 'center' }]}>
              {validationErrors.items}
            </Text>
          )}
        </View>

        {/* Summary */}
        {formData.payment_items.length > 0 && (
          <Card variant="default" padding="lg" style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Recipients:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formData.payment_items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Amount:</Text>
              <Text style={[styles.summaryValue, styles.summaryValueBold, { color: colors.primary }]}>
                ₵{getTotalAmount().toLocaleString()}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={handleCreatePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  basicInfoCard: {
    margin: Spacing.lg,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  addButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.xs,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  paymentItemCard: {
    marginBottom: Spacing.md,
  },
  paymentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  paymentItemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  emptyStateCard: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  emptyStateButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: BorderRadius.md,
  },
  emptyStateButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.md,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  summaryValueBold: {
    fontWeight: FontWeight.bold,
  },
  bottomActions: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  createButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
});

export default BulkPaymentCreateScreen;
