from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.response import Response
from ..models import Payout
from ..serializers import PayoutSerializer
from django.utils import timezone
from accounts.permissions import IsAdminUser

class MerchantPayoutsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # Allow authenticated merchants
    
    def get(self, request):
        payouts = Payout.objects.filter(status='pending').select_related('merchant')
        serializer = PayoutSerializer(payouts, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = PayoutSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProcessPayoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request, payout_id):
        try:
            payout = Payout.objects.get(pk=payout_id, status='pending')
            payout.status = 'processing'
            payout.save()

            # Route through real payment gateway
            try:
                from django.db import transaction as db_transaction
                from payments.services.payment_processing_service import PaymentProcessingService
                import logging
                logger = logging.getLogger(__name__)

                result = PaymentProcessingService.process_payout(payout)

                if not result.get('success'):
                    payout.status = 'failed'
                    payout.save()
                    return Response(
                        {'status': 'failed', 'error': result.get('error', 'Payout processing failed')},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # DB update inside atomic block — refund if save fails
                try:
                    with db_transaction.atomic():
                        payout.status = 'completed'
                        payout.processed_at = timezone.now()
                        payout.save()
                except Exception as db_err:
                    logger.error(f"DB save failed after payout charge, issuing refund: {db_err}")
                    try:
                        PaymentProcessingService.refund_payout(
                            payout, transaction_id=result.get('transaction_id')
                        )
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for payout {payout.id}, "
                            f"gateway_tx={result.get('transaction_id')}, "
                            f"amount={payout.total_amount}: {refund_err}"
                        )
                    return Response(
                        {'status': 'failed', 'error': 'Payout sent but recording failed. Refund initiated.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                return Response({'status': 'completed', 'reference': result.get('transaction_id', '')})

            except Exception as e:
                payout.status = 'failed'
                payout.save()
                return Response(
                    {'status': 'failed', 'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Payout.DoesNotExist:
            return Response({'error': 'Payout not found'}, status=404)
