"""
USSD Interface Tests.

Tests USSD session management, menu navigation,
session expiry, failure tracking, and menu definitions.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from payments.models.ussd import USSDSession, USSDMenu
from shared.constants import USER_TYPE_CUSTOMER

User = get_user_model()


class USSDSessionTests(TestCase):
    """Test USSD session lifecycle."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='ussduser', email='ussd@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_session(self):
        session = USSDSession.objects.create(
            session_id='SESS-001',
            msisdn='+233241234567',
            user=self.user,
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        self.assertEqual(session.state, 'active')
        self.assertEqual(session.current_menu, 'main')
        self.assertEqual(session.failed_attempts, 0)

    def test_session_not_expired(self):
        session = USSDSession.objects.create(
            session_id='SESS-002',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        self.assertFalse(session.is_expired())

    def test_session_expired(self):
        session = USSDSession.objects.create(
            session_id='SESS-003',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        self.assertTrue(session.is_expired())

    def test_increment_failures(self):
        session = USSDSession.objects.create(
            session_id='SESS-004',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        session.increment_failures()
        self.assertEqual(session.failed_attempts, 1)
        self.assertEqual(session.state, 'active')

    def test_three_failures_sets_error_state(self):
        session = USSDSession.objects.create(
            session_id='SESS-005',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        session.increment_failures()
        session.increment_failures()
        session.increment_failures()
        self.assertEqual(session.failed_attempts, 3)
        self.assertEqual(session.state, 'error')

    def test_reset_failures(self):
        session = USSDSession.objects.create(
            session_id='SESS-006',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5),
            failed_attempts=2
        )
        session.reset_failures()
        self.assertEqual(session.failed_attempts, 0)

    def test_session_menu_data(self):
        session = USSDSession.objects.create(
            session_id='SESS-007',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5),
            menu_data={'amount': '100', 'recipient': '0241234567'}
        )
        self.assertEqual(session.menu_data['amount'], '100')

    def test_unique_session_id(self):
        USSDSession.objects.create(
            session_id='SESS-UNIQUE',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        with self.assertRaises(Exception):
            USSDSession.objects.create(
                session_id='SESS-UNIQUE',
                msisdn='+233241234568',
                network='Telecel',
                expires_at=timezone.now() + timedelta(minutes=5)
            )

    def test_session_str(self):
        session = USSDSession.objects.create(
            session_id='SESS-STR',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        self.assertIn('SESS-STR', str(session))
        self.assertIn('+233241234567', str(session))

    def test_session_language_default(self):
        session = USSDSession.objects.create(
            session_id='SESS-LANG',
            msisdn='+233241234567',
            network='MTN',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        self.assertEqual(session.language, 'en')


class USSDMenuTests(TestCase):
    """Test USSD menu definitions."""

    def test_create_main_menu(self):
        menu = USSDMenu.objects.create(
            menu_id='main_en',
            menu_type='main',
            title='Welcome to SikaRemit',
            content='Choose an option:',
            options=[
                {'key': '1', 'label': 'Send Money'},
                {'key': '2', 'label': 'Check Balance'},
                {'key': '3', 'label': 'Buy Airtime'},
            ],
            is_default=True
        )
        self.assertEqual(menu.menu_type, 'main')
        self.assertEqual(len(menu.options), 3)

    def test_all_menu_types(self):
        for menu_type, _ in USSDMenu.MENU_TYPES:
            menu = USSDMenu.objects.create(
                menu_id=f'{menu_type}_en',
                menu_type=menu_type,
                title=f'{menu_type} menu',
                content='Options:'
            )
            self.assertEqual(menu.menu_type, menu_type)

    def test_unique_menu_id(self):
        USSDMenu.objects.create(
            menu_id='unique_menu',
            menu_type='main',
            title='Main', content='Test'
        )
        with self.assertRaises(Exception):
            USSDMenu.objects.create(
                menu_id='unique_menu',
                menu_type='payment',
                title='Payment', content='Test'
            )

    def test_menu_parent_navigation(self):
        parent = USSDMenu.objects.create(
            menu_id='parent_menu',
            menu_type='main',
            title='Main', content='Options'
        )
        child = USSDMenu.objects.create(
            menu_id='child_menu',
            menu_type='payment',
            title='Payment', content='Options',
            parent_menu=parent
        )
        self.assertEqual(child.parent_menu, parent)

    def test_menu_language_support(self):
        menu_en = USSDMenu.objects.create(
            menu_id='main_en_v2',
            menu_type='main',
            title='Welcome', content='Options',
            language='en'
        )
        menu_tw = USSDMenu.objects.create(
            menu_id='main_tw',
            menu_type='main',
            title='Akwaaba', content='Options',
            language='tw'
        )
        self.assertEqual(menu_en.language, 'en')
        self.assertEqual(menu_tw.language, 'tw')
