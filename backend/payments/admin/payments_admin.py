from django.contrib import admin
from django.contrib.admin.sites import AdminSite

# Create a separate admin site for payments
payments_admin = AdminSite(name='payments_admin')

# Register all payment-related models here
# Import and register telecom admin classes
from .telecom_admin import TelecomProviderAdmin, TelecomPackageAdmin, BusinessRuleAdmin
from payments.models import TelecomProvider, TelecomPackage, BusinessRule

# Register telecom models with the payments admin site
payments_admin.register(TelecomProvider, TelecomProviderAdmin)
payments_admin.register(TelecomPackage, TelecomPackageAdmin)
payments_admin.register(BusinessRule, BusinessRuleAdmin)
