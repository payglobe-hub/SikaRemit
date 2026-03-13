"""
Order Tracking Models

Comprehensive order tracking and delivery management system
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from .models import Order
from django.db.models import Q, Count, Avg
import uuid

User = get_user_model()


class OrderTracking(models.Model):
    """Order tracking information"""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='tracking')
    tracking_number = models.CharField(max_length=50, unique=True)
    carrier = models.CharField(
        max_length=50,
        choices=[
            ('dhl', 'DHL'),
            ('fedex', 'FedEx'),
            ('ups', 'UPS'),
            ('gh_post', 'Ghana Post'),
            ('dhl_ghana', 'DHL Ghana'),
            ('fedex_ghana', 'FedEx Ghana'),
            ('ups_ghana', 'UPS Ghana'),
            ('local_courier', 'Local Courier'),
            ('self_pickup', 'Self Pickup'),
        ]
    )
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    actual_delivery = models.DateTimeField(null=True, blank=True)
    current_status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('shipped', 'Shipped'),
            ('in_transit', 'In Transit'),
            ('out_for_delivery', 'Out for Delivery'),
            ('delivered', 'Delivered'),
            ('delayed', 'Delayed'),
            ('lost', 'Lost'),
            ('returned', 'Returned'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    current_location = models.CharField(max_length=200, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['tracking_number']),
            models.Index(fields=['order']),
            models.Index(fields=['carrier']),
            models.Index(fields=['current_status']),
            models.Index(fields=['estimated_delivery']),
        ]
    
    def __str__(self):
        return f"Tracking {self.tracking_number} for {self.order.order_number}"
    
    @property
    def is_delivered(self):
        return self.current_status == 'delivered'
    
    @property
    def is_delayed(self):
        return (
            self.current_status in ['delayed', 'lost'] or
            (self.estimated_delivery and timezone.now() > self.estimated_delivery and not self.is_delivered)
        )
    
    @property
    def days_in_transit(self):
        if self.current_status == 'delivered' and self.actual_delivery:
            return (self.actual_delivery - self.created_at).days
        return (timezone.now() - self.created_at).days


class TrackingEvent(models.Model):
    """Individual tracking events"""
    tracking = models.ForeignKey(OrderTracking, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(
        max_length=50,
        choices=[
            ('order_placed', 'Order Placed'),
            ('order_confirmed', 'Order Confirmed'),
            ('payment_received', 'Payment Received'),
            ('order_processed', 'Order Processed'),
            ('package_prepared', 'Package Prepared'),
            ('picked_up', 'Picked Up'),
            ('in_transit', 'In Transit'),
            ('out_for_delivery', 'Out for Delivery'),
            ('delivered', 'Delivered'),
            ('delayed', 'Delayed'),
            ('lost', 'Lost'),
            ('returned', 'Returned'),
            ('cancelled', 'Cancelled'),
        ]
    )
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField()
    is_estimated = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            models.Index(fields=['tracking', 'timestamp']),
            models.Index(fields=['event_type']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.tracking.tracking_number}"


class DeliveryAddress(models.Model):
    """Delivery address for orders"""
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery_address')
    recipient_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    delivery_instructions = models.TextField(blank=True)
    is_business_address = models.BooleanField(default=False)
    landmark = models.CharField(max_length=200, blank=True)
    coordinates_lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    coordinates_lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['city', 'state']),
            models.Index(fields=['postal_code']),
        ]
    
    def __str__(self):
        return f"Delivery address for {self.order.order_number}"
    
    @property
    def full_address(self):
        parts = [self.address_line_1]
        if self.address_line_2:
            parts.append(self.address_line_2)
        parts.append(f"{self.city}, {self.state}")
        parts.append(self.postal_code)
        parts.append(self.country)
        return ", ".join(parts)


class DeliveryAttempt(models.Model):
    """Record of delivery attempts"""
    tracking = models.ForeignKey(OrderTracking, on_delete=models.CASCADE, related_name='delivery_attempts')
    attempt_number = models.PositiveIntegerField()
    attempted_at = models.DateTimeField()
    status = models.CharField(
        max_length=50,
        choices=[
            ('successful', 'Successful'),
            ('failed', 'Failed'),
            ('recipient_not_available', 'Recipient Not Available'),
            ('address_incorrect', 'Address Incorrect'),
            ('package_damaged', 'Package Damaged'),
            ('refused', 'Refused'),
            ('rescheduled', 'Rescheduled'),
        ]
    )
    notes = models.TextField(blank=True)
    attempted_by = models.CharField(max_length=200)
    recipient_signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    photo_evidence = models.ImageField(upload_to='delivery_photos/', null=True, blank=True)
    next_attempt_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['tracking', 'attempt_number']),
            models.Index(fields=['attempted_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Attempt {self.attempt_number} for {self.tracking.tracking_number}"


class ShippingLabel(models.Model):
    """Shipping label information"""
    tracking = models.OneToOneField(OrderTracking, on_delete=models.CASCADE, related_name='shipping_label')
    label_url = models.URLField(max_length=500, blank=True)
    label_file = models.FileField(upload_to='shipping_labels/', null=True, blank=True)
    qr_code = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=3, help_text="Weight in kg")
    dimensions_length = models.DecimalField(max_digits=8, decimal_places=2, help_text="Length in cm")
    dimensions_width = models.DecimalField(max_digits=8, decimal_places=2, help_text="Width in cm")
    dimensions_height = models.DecimalField(max_digits=8, decimal_places=2, help_text="Height in cm")
    package_type = models.CharField(
        max_length=50,
        choices=[
            ('envelope', 'Envelope'),
            ('box', 'Box'),
            ('tube', 'Tube'),
            ('pallet', 'Pallet'),
            ('custom', 'Custom'),
        ],
        default='box'
    )
    special_instructions = models.TextField(blank=True)
    insurance_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    requires_signature = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['tracking']),
            models.Index(fields=['package_type']),
        ]
    
    def __str__(self):
        return f"Shipping label for {self.tracking.tracking_number}"
    
    @property
    def volumetric_weight(self):
        """Calculate volumetric weight"""
        if self.dimensions_length and self.dimensions_width and self.dimensions_height:
            return (self.dimensions_length * self.dimensions_width * self.dimensions_height) / 5000
        return 0
    
    @property
    def chargeable_weight(self):
        """Get the higher of actual weight or volumetric weight"""
        volumetric = self.volumetric_weight
        return max(float(self.weight), volumetric)


class NotificationPreference(models.Model):
    """User notification preferences for order updates"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    order_placed = models.BooleanField(default=True)
    order_confirmed = models.BooleanField(default=True)
    order_shipped = models.BooleanField(default=True)
    out_for_delivery = models.BooleanField(default=True)
    order_delivered = models.BooleanField(default=True)
    order_delayed = models.BooleanField(default=True)
    order_cancelled = models.BooleanField(default=True)
    delivery_updates = models.BooleanField(default=True)
    marketing_updates = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class TrackingNotification(models.Model):
    """Tracking notification records"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tracking_notifications')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='notifications')
    event_type = models.CharField(max_length=50)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=[
            ('email', 'Email'),
            ('sms', 'SMS'),
            ('push', 'Push'),
        ]
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'sent_at']),
            models.Index(fields=['order']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['is_read']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} notification for {self.order.order_number}"


class OrderTrackingService:
    """Service for managing order tracking"""
    
    @staticmethod
    def create_tracking(order, carrier='local_courier'):
        """Create tracking for an order"""
        tracking_number = OrderTrackingService._generate_tracking_number()
        
        tracking = OrderTracking.objects.create(
            order=order,
            tracking_number=tracking_number,
            carrier=carrier,
            estimated_delivery=timezone.now() + timezone.timedelta(days=3)  # Default 3 days
        )
        
        # Create initial event
        TrackingEvent.objects.create(
            tracking=tracking,
            event_type='order_placed',
            timestamp=timezone.now(),
            description='Order placed successfully'
        )
        
        return tracking
    
    @staticmethod
    def update_tracking_status(tracking_id, status, location=None, description=None):
        """Update tracking status"""
        with transaction.atomic():
            tracking = OrderTracking.objects.get(id=tracking_id)
            tracking.current_status = status
            if location:
                tracking.current_location = location
            tracking.save()
            
            # Create tracking event
            TrackingEvent.objects.create(
                tracking=tracking,
                event_type=status,
                location=location or '',
                description=description or f'Status updated to {status}',
                timestamp=timezone.now()
            )
            
            # Send notification if delivered
            if status == 'delivered':
                tracking.actual_delivery = timezone.now()
                tracking.save()
                OrderTrackingService._send_notification(
                    tracking.order.user,
                    tracking.order,
                    'order_delivered',
                    f'Your order {tracking.order.order_number} has been delivered!'
                )
            
            return tracking
    
    @staticmethod
    def add_tracking_event(tracking_id, event_type, location=None, description=None, is_estimated=False):
        """Add a tracking event"""
        tracking = OrderTracking.objects.get(id=tracking_id)
        
        event = TrackingEvent.objects.create(
            tracking=tracking,
            event_type=event_type,
            location=location or '',
            description=description or '',
            timestamp=timezone.now(),
            is_estimated=is_estimated
        )
        
        # Update current status if not estimated
        if not is_estimated:
            tracking.current_status = event_type
            if location:
                tracking.current_location = location
            tracking.save()
        
        return event
    
    @staticmethod
    def track_package(tracking_number):
        """Track package by tracking number"""
        try:
            tracking = OrderTracking.objects.get(tracking_number=tracking_number)
            return {
                'found': True,
                'tracking': tracking,
                'events': tracking.events.order_by('-timestamp'),
                'current_status': tracking.current_status,
                'current_location': tracking.current_location,
                'estimated_delivery': tracking.estimated_delivery,
                'is_delivered': tracking.is_delivered,
                'is_delayed': tracking.is_delayed
            }
        except OrderTracking.DoesNotExist:
            return {'found': False}
    
    @staticmethod
    def get_user_tracking(user):
        """Get all tracking for a user"""
        return OrderTracking.objects.filter(order__user=user).select_related('order').prefetch_related('events')
    
    @staticmethod
    def get_tracking_summary(tracking_id):
        """Get tracking summary"""
        tracking = OrderTracking.objects.get(id=tracking_id)
        events = tracking.events.order_by('-timestamp')
        
        return {
            'tracking_number': tracking.tracking_number,
            'carrier': tracking.carrier,
            'current_status': tracking.current_status,
            'current_location': tracking.current_location,
            'estimated_delivery': tracking.estimated_delivery,
            'actual_delivery': tracking.actual_delivery,
            'is_delivered': tracking.is_delivered,
            'is_delayed': tracking.is_delayed,
            'days_in_transit': tracking.days_in_transit,
            'events': [
                {
                    'event_type': event.event_type,
                    'location': event.location,
                    'description': event.description,
                    'timestamp': event.timestamp,
                    'is_estimated': event.is_estimated
                }
                for event in events
            ]
        }
    
    @staticmethod
    def create_delivery_attempt(tracking_id, status, notes='', attempted_by='', signature=None, photo=None):
        """Create delivery attempt record"""
        tracking = OrderTracking.objects.get(id=tracking_id)
        
        # Get next attempt number
        last_attempt = tracking.delivery_attempts.order_by('-attempt_number').first()
        attempt_number = (last_attempt.attempt_number + 1) if last_attempt else 1
        
        attempt = DeliveryAttempt.objects.create(
            tracking=tracking,
            attempt_number=attempt_number,
            status=status,
            notes=notes,
            attempted_by=attempted_by,
            recipient_signature=signature,
            photo_evidence=photo,
            attempted_at=timezone.now()
        )
        
        # Update tracking status based on attempt
        if status == 'successful':
            OrderTrackingService.update_tracking_status(
                tracking_id, 'delivered',
                description=f'Delivered on attempt {attempt_number}'
            )
        elif status == 'rescheduled':
            attempt.next_attempt_date = timezone.now() + timezone.timedelta(days=1)
            attempt.save()
        
        return attempt
    
    @staticmethod
    def _generate_tracking_number():
        """Generate unique tracking number"""
        while True:
            tracking_number = f"SKT{timezone.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
            if not OrderTracking.objects.filter(tracking_number=tracking_number).exists():
                return tracking_number
    
    @staticmethod
    def _send_notification(user, order, event_type, message):
        """Send tracking notification"""
        try:
            preferences = NotificationPreference.objects.get(user=user)
            
            # Check if user wants this type of notification
            if not getattr(preferences, event_type, False):
                return
            
            # Create notification record
            TrackingNotification.objects.create(
                user=user,
                order=order,
                event_type=event_type,
                message=message,
                notification_type='push'
            )
            
            # Here you would integrate with actual notification services
            # email_service.send_notification(user.email, message)
            # sms_service.send_notification(user.phone, message)
            # push_service.send_notification(user, message)
            
        except NotificationPreference.DoesNotExist:
            # Create default preferences and retry
            NotificationPreference.objects.create(user=user)
            OrderTrackingService._send_notification(user, order, event_type, message)
    
    @staticmethod
    def get_tracking_analytics(days=30):
        """Get tracking analytics"""
        start_date = timezone.now() - timezone.timedelta(days=days)
        
        return {
            'total_tracking': OrderTracking.objects.filter(created_at__gte=start_date).count(),
            'delivered': OrderTracking.objects.filter(
                current_status='delivered',
                created_at__gte=start_date
            ).count(),
            'in_transit': OrderTracking.objects.filter(
                current_status__in=['shipped', 'in_transit', 'out_for_delivery'],
                created_at__gte=start_date
            ).count(),
            'delayed': OrderTracking.objects.filter(
                current_status='delayed',
                created_at__gte=start_date
            ).count(),
            'average_delivery_time': OrderTracking.objects.filter(
                current_status='delivered',
                actual_delivery__isnull=False
            ).aggregate(
                avg_days=Avg('days_in_transit')
            )['avg_days'] or 0,
            'carrier_performance': OrderTracking.objects.filter(
                created_at__gte=start_date
            ).values('carrier').annotate(
                total=Count('id'),
                delivered=Count('id', filter=Q(current_status='delivered'))
            )
        }
    
    @staticmethod
    def get_user_notification_preferences(user):
        """Get or create user notification preferences"""
        preferences, created = NotificationPreference.objects.get_or_create(user=user)
        return preferences
    
    @staticmethod
    def update_notification_preferences(user, **kwargs):
        """Update user notification preferences"""
        preferences = OrderTrackingService.get_user_notification_preferences(user)
        
        for key, value in kwargs.items():
            if hasattr(preferences, key):
                setattr(preferences, key, value)
        
        preferences.save()
        return preferences
