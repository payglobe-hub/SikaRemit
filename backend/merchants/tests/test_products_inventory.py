"""
Product & Inventory Management Tests.

Tests store creation, product CRUD, stock management,
low stock detection, discount calculation, SKU generation,
and product variants.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from merchants.models import Store, Product, ProductImage, ProductVariant
from users.models import Merchant
from shared.constants import USER_TYPE_MERCHANT

User = get_user_model()


class StoreTests(TestCase):
    """Test merchant store creation and properties."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='storemerch', email='store@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.merchant = Merchant.objects.get(user=self.merchant_user)
        self.merchant.business_name = 'Store Corp'
        self.merchant.tax_id = 'TAX-STORE'
        self.merchant.save()

    def test_create_store(self):
        store = Store.objects.create(
            merchant=self.merchant,
            name='My Store',
            description='A test store',
            store_type='retail'
        )
        self.assertEqual(store.name, 'My Store')
        self.assertTrue(store.is_active)
        self.assertTrue(store.accepts_online_orders)

    def test_all_store_types(self):
        for i, (stype, _) in enumerate(Store.STORE_TYPES):
            # Need separate merchants since store is OneToOne
            user = User.objects.create_user(
                username=f'smerch{i}', email=f's{i}@test.com',
                password='testpass123', user_type=USER_TYPE_MERCHANT
            )
            merchant = Merchant.objects.get(user=user)
            merchant.business_name = f'{stype} Corp'
            merchant.tax_id = f'TX-{i}'
            merchant.save()
            store = Store.objects.create(
                merchant=merchant, name=f'{stype} Store',
                store_type=stype
            )
            self.assertEqual(store.store_type, stype)

    def test_store_full_address(self):
        store = Store.objects.create(
            merchant=self.merchant, name='Address Store',
            address_line_1='123 Market St', city='Accra',
            state='Greater Accra', country='Ghana'
        )
        addr = store.full_address
        self.assertIn('123 Market St', addr)
        self.assertIn('Ghana', addr)

    def test_store_str(self):
        store = Store.objects.create(
            merchant=self.merchant, name='Str Store'
        )
        self.assertIn('Str Store', str(store))
        self.assertIn('Store Corp', str(store))

    def test_one_store_per_merchant(self):
        Store.objects.create(merchant=self.merchant, name='Store 1')
        with self.assertRaises(Exception):
            Store.objects.create(merchant=self.merchant, name='Store 2')

    def test_store_defaults(self):
        store = Store.objects.create(
            merchant=self.merchant, name='Defaults'
        )
        self.assertTrue(store.is_active)
        self.assertTrue(store.accepts_online_orders)
        self.assertFalse(store.delivery_available)
        self.assertTrue(store.pickup_available)
        self.assertEqual(store.total_products, 0)
        self.assertEqual(store.total_orders, 0)


class ProductTests(TestCase):
    """Test product creation and properties."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='prodmerch', email='prod@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.merchant = Merchant.objects.get(user=self.merchant_user)
        self.merchant.business_name = 'Product Corp'
        self.merchant.tax_id = 'TAX-PROD'
        self.merchant.save()
        self.store = Store.objects.create(
            merchant=self.merchant,
            name='Product Store'
        )

    def test_create_product(self):
        product = Product.objects.create(
            store=self.store,
            name='Test Widget',
            description='A test product',
            price=Decimal('29.99'),
            stock_quantity=100
        )
        self.assertEqual(product.name, 'Test Widget')
        self.assertEqual(product.price, Decimal('29.99'))
        self.assertEqual(product.status, 'active')
        self.assertTrue(product.is_available)

    def test_auto_generate_sku(self):
        product = Product.objects.create(
            store=self.store,
            name='Auto SKU',
            price=Decimal('10.00')
        )
        self.assertIsNotNone(product.sku)
        self.assertTrue(len(product.sku) > 0)

    def test_custom_sku(self):
        product = Product.objects.create(
            store=self.store,
            name='Custom SKU',
            price=Decimal('10.00'),
            sku='CUSTOM-001'
        )
        self.assertEqual(product.sku, 'CUSTOM-001')

    def test_product_str(self):
        product = Product.objects.create(
            store=self.store,
            name='Str Product',
            price=Decimal('10.00')
        )
        self.assertIn('Str Product', str(product))

    def test_product_status_transitions(self):
        product = Product.objects.create(
            store=self.store, name='Status',
            price=Decimal('10.00')
        )
        for status in ['inactive', 'out_of_stock', 'discontinued', 'active']:
            product.status = status
            product.save()
            product.refresh_from_db()
            self.assertEqual(product.status, status)

    def test_update_store_product_count(self):
        Product.objects.create(
            store=self.store, name='P1', price=Decimal('10.00')
        )
        Product.objects.create(
            store=self.store, name='P2', price=Decimal('20.00')
        )
        self.store.refresh_from_db()
        self.assertEqual(self.store.total_products, 2)

    def test_product_category_and_tags(self):
        product = Product.objects.create(
            store=self.store,
            name='Tagged Product',
            price=Decimal('15.00'),
            category='Electronics',
            tags=['gadget', 'tech', 'new']
        )
        self.assertEqual(product.category, 'Electronics')
        self.assertIn('gadget', product.tags)


class ProductStockTests(TestCase):
    """Test product stock/inventory management."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='stockmerch', email='stock@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.merchant = Merchant.objects.get(user=self.merchant_user)
        self.merchant.business_name = 'Stock Corp'
        self.merchant.tax_id = 'TAX-STOCK'
        self.merchant.save()
        self.store = Store.objects.create(
            merchant=self.merchant, name='Stock Store'
        )

    def test_is_in_stock(self):
        product = Product.objects.create(
            store=self.store, name='In Stock',
            price=Decimal('10.00'), stock_quantity=50
        )
        self.assertTrue(product.is_in_stock)

    def test_is_out_of_stock(self):
        product = Product.objects.create(
            store=self.store, name='Out of Stock',
            price=Decimal('10.00'), stock_quantity=0,
            track_inventory=True
        )
        self.assertFalse(product.is_in_stock)

    def test_is_low_stock(self):
        product = Product.objects.create(
            store=self.store, name='Low Stock',
            price=Decimal('10.00'),
            stock_quantity=3, low_stock_threshold=5,
            track_inventory=True
        )
        self.assertTrue(product.is_low_stock)

    def test_not_low_stock(self):
        product = Product.objects.create(
            store=self.store, name='Plenty Stock',
            price=Decimal('10.00'),
            stock_quantity=100, low_stock_threshold=5,
            track_inventory=True
        )
        self.assertFalse(product.is_low_stock)

    def test_no_tracking_means_always_in_stock(self):
        product = Product.objects.create(
            store=self.store, name='No Track',
            price=Decimal('10.00'),
            stock_quantity=0, track_inventory=False
        )
        self.assertTrue(product.is_in_stock)
        self.assertFalse(product.is_low_stock)

    def test_update_stock_add(self):
        product = Product.objects.create(
            store=self.store, name='Add Stock',
            price=Decimal('10.00'), stock_quantity=50
        )
        product.update_stock(25)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 75)

    def test_update_stock_remove(self):
        product = Product.objects.create(
            store=self.store, name='Remove Stock',
            price=Decimal('10.00'), stock_quantity=50
        )
        product.update_stock(-20)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 30)

    def test_update_stock_cannot_go_negative(self):
        product = Product.objects.create(
            store=self.store, name='No Negative',
            price=Decimal('10.00'), stock_quantity=10
        )
        product.update_stock(-50)
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 0)


class ProductPricingTests(TestCase):
    """Test product pricing and discount calculations."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='pricemerch', email='price@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.merchant = Merchant.objects.get(user=self.merchant_user)
        self.merchant.business_name = 'Price Corp'
        self.merchant.tax_id = 'TAX-PRICE'
        self.merchant.save()
        self.store = Store.objects.create(
            merchant=self.merchant, name='Price Store'
        )

    def test_discount_percentage(self):
        product = Product.objects.create(
            store=self.store, name='Discounted',
            price=Decimal('80.00'),
            compare_at_price=Decimal('100.00')
        )
        self.assertEqual(product.discount_percentage, 20)

    def test_no_discount_without_compare_price(self):
        product = Product.objects.create(
            store=self.store, name='No Discount',
            price=Decimal('50.00')
        )
        self.assertEqual(product.discount_percentage, 0)

    def test_no_discount_when_compare_price_lower(self):
        product = Product.objects.create(
            store=self.store, name='Lower Compare',
            price=Decimal('50.00'),
            compare_at_price=Decimal('40.00')
        )
        self.assertEqual(product.discount_percentage, 0)

    def test_featured_product(self):
        product = Product.objects.create(
            store=self.store, name='Featured',
            price=Decimal('99.99'), is_featured=True
        )
        self.assertTrue(product.is_featured)

    def test_product_weight_and_dimensions(self):
        product = Product.objects.create(
            store=self.store, name='Physical',
            price=Decimal('25.00'),
            weight=Decimal('1.50'),
            dimensions={'width': 10, 'height': 20, 'depth': 5},
            requires_shipping=True
        )
        self.assertEqual(product.weight, Decimal('1.50'))
        self.assertEqual(product.dimensions['width'], 10)
        self.assertTrue(product.requires_shipping)
