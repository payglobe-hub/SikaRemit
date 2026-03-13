"""
E-commerce Orders Tests.

Tests order creation, order items, payment records, shipping addresses,
order status transitions, and order total calculations.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
import uuid

from ecommerce.models import Order, OrderItem, Payment, ShippingAddress
from shared.constants import USER_TYPE_CUSTOMER, USER_TYPE_MERCHANT

User = get_user_model()


class OrderCreationTests(TestCase):
    """Test order creation and fields."""

    def setUp(self):
        self.customer = User.objects.create_user(
            username='ordercust', email='ordercust@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_order(self):
        order = Order.objects.create(
            user=self.customer,
            order_number=f'SKR-TEST-{uuid.uuid4().hex[:8].upper()}',
            shipping_address='123 Test St',
            shipping_city='Accra',
            shipping_state='Greater Accra',
            shipping_postal_code='00233',
            shipping_country='Ghana',
            shipping_phone='+233241234567',
            subtotal=Decimal('150.00'),
            shipping_cost=Decimal('10.00'),
            tax=Decimal('5.00'),
            total=Decimal('165.00'),
            status='pending',
            payment_status='pending'
        )
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.payment_status, 'pending')
        self.assertEqual(order.total, Decimal('165.00'))
        self.assertEqual(order.user, self.customer)

    def test_order_status_transitions(self):
        order = Order.objects.create(
            user=self.customer,
            order_number=f'SKR-STAT-{uuid.uuid4().hex[:8].upper()}',
            shipping_address='Test', shipping_city='Accra',
            shipping_state='GA', shipping_postal_code='00233',
            shipping_country='Ghana', shipping_phone='0241234567',
            subtotal=Decimal('100.00'), total=Decimal('100.00')
        )
        for new_status in ['confirmed', 'processing', 'shipped', 'delivered']:
            order.status = new_status
            order.save()
            order.refresh_from_db()
            self.assertEqual(order.status, new_status)

    def test_order_cancellation(self):
        order = Order.objects.create(
            user=self.customer,
            order_number=f'SKR-CAN-{uuid.uuid4().hex[:8].upper()}',
            shipping_address='Test', shipping_city='Accra',
            shipping_state='GA', shipping_postal_code='00233',
            shipping_country='Ghana', shipping_phone='0241234567',
            subtotal=Decimal('100.00'), total=Decimal('100.00'),
            status='pending'
        )
        order.status = 'cancelled'
        order.save()
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_order_refund_status(self):
        order = Order.objects.create(
            user=self.customer,
            order_number=f'SKR-REF-{uuid.uuid4().hex[:8].upper()}',
            shipping_address='Test', shipping_city='Accra',
            shipping_state='GA', shipping_postal_code='00233',
            shipping_country='Ghana', shipping_phone='0241234567',
            subtotal=Decimal('100.00'), total=Decimal('100.00'),
            status='delivered', payment_status='paid'
        )
        order.status = 'refunded'
        order.payment_status = 'refunded'
        order.save()
        order.refresh_from_db()
        self.assertEqual(order.status, 'refunded')
        self.assertEqual(order.payment_status, 'refunded')

    def test_order_str(self):
        order = Order.objects.create(
            user=self.customer,
            order_number='SKR-STR-001',
            shipping_address='Test', shipping_city='Accra',
            shipping_state='GA', shipping_postal_code='00233',
            shipping_country='Ghana', shipping_phone='0241234567',
            subtotal=Decimal('100.00'), total=Decimal('100.00')
        )
        self.assertEqual(str(order), 'Order SKR-STR-001')


class OrderItemTests(TestCase):
    """Test order items and calculations."""

    def setUp(self):
        from merchants.models import Store, Product
        from users.models import Merchant

        self.customer = User.objects.create_user(
            username='itemcust', email='itemcust@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.merchant_user = User.objects.create_user(
            username='itemmerch', email='itemmerch@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.merchant = Merchant.objects.get(user=self.merchant_user)
        self.merchant.business_name = 'Item Store'
        self.merchant.tax_id = 'TAX-ITEM'
        self.merchant.save()
        self.store = Store.objects.create(
            merchant=self.merchant,
            name='Test Store',
            description='A test store'
        )
        self.product = Product.objects.create(
            store=self.store,
            name='Test Product',
            description='A test product',
            price=Decimal('25.00'),
            stock_quantity=100
        )
        self.order = Order.objects.create(
            user=self.customer,
            order_number=f'SKR-ITEM-{uuid.uuid4().hex[:8].upper()}',
            shipping_address='Test', shipping_city='Accra',
            shipping_state='GA', shipping_postal_code='00233',
            shipping_country='Ghana', shipping_phone='0241234567',
            subtotal=Decimal('75.00'), total=Decimal('75.00')
        )

    def test_create_order_item(self):
        item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=3,
            price=Decimal('25.00')
        )
        self.assertEqual(item.quantity, 3)
        self.assertEqual(item.price, Decimal('25.00'))

    def test_order_item_subtotal(self):
        item = OrderItem.objects.create(
            order=self.order, product=self.product,
            quantity=3, price=Decimal('25.00')
        )
        self.assertEqual(item.subtotal, Decimal('75.00'))

    def test_multiple_items_in_order(self):
        OrderItem.objects.create(
            order=self.order, product=self.product,
            quantity=2, price=Decimal('25.00')
        )
        OrderItem.objects.create(
            order=self.order, product=self.product,
            quantity=1, price=Decimal('25.00')
        )
        self.assertEqual(self.order.items.count(), 2)
        self.assertEqual(self.order.items_count, 3)


class PaymentRecordTests(TestCase):
    """Test payment records for orders."""

    def setUp(self):
        self.customer = User.objects.create_user(
            username='paycust', email='paycust@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.order = Order.objects.create(
            user=self.customer,
            order_number=f'SKR-PAY-{uuid.uuid4().hex[:8].upper()}',
            shipping_address='Test', shipping_city='Accra',
            shipping_state='GA', shipping_postal_code='00233',
            shipping_country='Ghana', shipping_phone='0241234567',
            subtotal=Decimal('100.00'), total=Decimal('100.00')
        )

    def test_create_card_payment(self):
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=Decimal('100.00'),
            currency='GHS',
            status='pending'
        )
        self.assertEqual(payment.payment_method, 'card')
        self.assertEqual(payment.status, 'pending')

    def test_payment_status_to_succeeded(self):
        payment = Payment.objects.create(
            order=self.order,
            payment_method='mobile_money',
            amount=Decimal('100.00'),
            status='pending'
        )
        payment.status = 'succeeded'
        payment.gateway_transaction_id = 'GTW-12345'
        payment.save()
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'succeeded')
        self.assertEqual(payment.gateway_transaction_id, 'GTW-12345')

    def test_payment_methods_valid(self):
        for method, _ in Payment.PAYMENT_METHODS:
            payment = Payment.objects.create(
                order=Order.objects.create(
                    user=self.customer,
                    order_number=f'SKR-{method[:4].upper()}-{uuid.uuid4().hex[:6]}',
                    shipping_address='Test', shipping_city='Accra',
                    shipping_state='GA', shipping_postal_code='00233',
                    shipping_country='Ghana', shipping_phone='0241234567',
                    subtotal=Decimal('50.00'), total=Decimal('50.00')
                ),
                payment_method=method,
                amount=Decimal('50.00'),
                status='pending'
            )
            self.assertEqual(payment.payment_method, method)


class ShippingAddressTests(TestCase):
    """Test shipping address management."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='shipcust', email='ship@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_shipping_address(self):
        addr = ShippingAddress.objects.create(
            user=self.user, name='Home',
            address_line_1='123 Main St', city='Accra',
            state='Greater Accra', postal_code='00233',
            country='Ghana', phone='0241234567'
        )
        self.assertEqual(addr.name, 'Home')
        self.assertFalse(addr.is_default)

    def test_set_default_address(self):
        addr1 = ShippingAddress.objects.create(
            user=self.user, name='Home', address_line_1='123 Main',
            city='Accra', state='GA', postal_code='00233',
            country='Ghana', phone='024', is_default=True
        )
        addr2 = ShippingAddress.objects.create(
            user=self.user, name='Office', address_line_1='456 Work',
            city='Kumasi', state='Ashanti', postal_code='00234',
            country='Ghana', phone='025', is_default=True
        )
        addr1.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)

    def test_multiple_addresses_per_user(self):
        for i in range(3):
            ShippingAddress.objects.create(
                user=self.user, name=f'Address {i}',
                address_line_1=f'{i} Street', city='Accra',
                state='GA', postal_code='00233',
                country='Ghana', phone=f'024{i}'
            )
        self.assertEqual(ShippingAddress.objects.filter(user=self.user).count(), 3)
