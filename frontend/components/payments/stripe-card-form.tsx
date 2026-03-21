'use client';

import { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe/stripe-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api/axios';

interface StripeCardFormProps {
  onSuccess: (paymentMethodId: string) => void;
  onCancel: () => void;
}

function CardForm({ onSuccess, onCancel }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setLoading(true);

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        toast({
          title: 'Card Error',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const response = await api.post('/api/v1/payments/methods/', {
        method_type: 'card',
        details: {
          payment_method_id: paymentMethod.id,
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          exp_month: paymentMethod.card?.exp_month,
          exp_year: paymentMethod.card?.exp_year,
        },
        is_default: false,
      });

      toast({
        title: 'Success',
        description: 'Card added successfully',
      });

      onSuccess(response.data.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }}
        className="p-3 border rounded-md"
      />
      <div className="flex gap-2 mt-4">
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? 'Adding Card...' : 'Add Card'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function StripeCardForm({ onSuccess, onCancel }: StripeCardFormProps) {
  const stripePromise = getStripe();

  if (!stripePromise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Card Payments Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Stripe is not configured. Please contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
