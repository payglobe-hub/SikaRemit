"""
Django management command to fix database integrity issues
"""
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Fix database integrity issues'

    def handle(self, *args, **options):
        self.stdout.write('Starting database integrity fixes...')
        
        with connection.cursor() as cursor:
            # Fix merchant table foreign key issues
            self.stdout.write('Fixing merchant table foreign key issues...')
            cursor.execute("""
                DELETE FROM users_merchant 
                WHERE user_id NOT IN (SELECT id FROM users_user)
            """)
            
            # Fix customer table foreign key issues  
            self.stdout.write('Fixing customer table foreign key issues...')
            cursor.execute("""
                DELETE FROM users_customer 
                WHERE user_id NOT IN (SELECT id FROM users_user)
            """)
            
            # Fix admin profile foreign key issues
            self.stdout.write('Fixing admin profile foreign key issues...')
            cursor.execute("""
                DELETE FROM users_adminprofile 
                WHERE user_id NOT IN (SELECT id FROM users_user)
            """)
            
            # Fix KYC document foreign key issues
            self.stdout.write('Fixing KYC document foreign key issues...')
            cursor.execute("""
                DELETE FROM users_kycdocument 
                WHERE user_id NOT IN (SELECT id FROM users_user)
            """)
            
            # Fix payment method foreign key issues
            self.stdout.write('Fixing payment method foreign key issues...')
            cursor.execute("""
                DELETE FROM payments_paymentmethod 
                WHERE user_id NOT IN (SELECT id FROM users_user)
            """)
            
            # Fix transaction foreign key issues
            self.stdout.write('Fixing transaction foreign key issues...')
            cursor.execute("""
                DELETE FROM payments_transaction 
                WHERE customer_id NOT IN (SELECT id FROM users_customer)
            """)
            
            cursor.execute("""
                DELETE FROM payments_transaction 
                WHERE merchant_id NOT IN (SELECT id FROM users_merchant)
            """)
            
            # Fix wallet balance foreign key issues
            self.stdout.write('Fixing wallet balance foreign key issues...')
            cursor.execute("""
                DELETE FROM payments_walletbalance 
                WHERE user_id NOT IN (SELECT id FROM users_user)
            """)
            
            # Fix POS device foreign key issues
            self.stdout.write('Fixing POS device foreign key issues...')
            cursor.execute("""
                DELETE FROM payments_posdevice 
                WHERE merchant_id NOT IN (SELECT id FROM users_merchant)
            """)
            
            # Fix POS transaction foreign key issues
            self.stdout.write('Fixing POS transaction foreign key issues...')
            cursor.execute("""
                DELETE FROM payments_postransaction 
                WHERE merchant_id NOT IN (SELECT id FROM users_merchant)
            """)
            
            cursor.execute("""
                DELETE FROM payments_postransaction 
                WHERE device_id NOT IN (SELECT id FROM payments_posdevice)
            """)
            
        self.stdout.write(self.style.SUCCESS('Database integrity issues fixed successfully!'))
