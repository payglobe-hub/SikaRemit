import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Button, Text } from '../ui';
import { api } from '../../services/api';
import { ENDPOINTS } from '../../constants/api';

interface StripeCardInputProps {
  onSuccess: (paymentMethodId: string) => void;
  onCancel: () => void;
}

export default function StripeCardInput({ onSuccess, onCancel }: StripeCardInputProps) {
  const { createPaymentMethod } = useStripe();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleAddCard = async () => {
    if (!cardComplete) {
      Alert.alert('Error', 'Please complete card details');
      return;
    }

    setLoading(true);

    try {
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Card Error', error.message);
        setLoading(false);
        return;
      }

      const response = await api.post(ENDPOINTS.PAYMENTS.METHODS, {
        method_type: 'card',
        details: {
          payment_method_id: paymentMethod.id,
          brand: paymentMethod.Card?.brand,
          last4: paymentMethod.Card?.last4,
          exp_month: paymentMethod.Card?.expMonth,
          exp_year: paymentMethod.Card?.expYear,
        },
        is_default: false,
      });

      Alert.alert('Success', 'Card added successfully');
      onSuccess(response.data.id);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to add card'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CardField
        postalCodeEnabled={false}
        placeholders={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={styles.card}
        style={styles.cardField}
        onCardChange={(cardDetails) => {
          setCardComplete(cardDetails.complete);
        }}
      />
      <View style={styles.buttonContainer}>
        <Button
          title={loading ? 'Adding Card...' : 'Add Card'}
          onPress={handleAddCard}
          disabled={!cardComplete || loading}
          style={styles.button}
        />
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="outline"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
});
