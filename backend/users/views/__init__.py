# Users views package

import importlib.util
import os

# Dynamically import from views.py in the parent directory
_views_spec = importlib.util.spec_from_file_location(
    "views_module",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "views.py")
)
views_module = importlib.util.module_from_spec(_views_spec)
_views_spec.loader.exec_module(views_module)

# Import ViewSets and functions
UserViewSet = views_module.UserViewSet
MerchantViewSet = views_module.MerchantViewSet
CustomerViewSet = views_module.CustomerViewSet
KYCDocumentViewSet = views_module.KYCDocumentViewSet
KYCViewSet = views_module.KYCViewSet
MerchantCustomerViewSet = views_module.MerchantCustomerViewSet
MerchantKYCSubmissionViewSet = views_module.MerchantKYCSubmissionViewSet
verify_email = views_module.verify_email

__all__ = [
    'UserViewSet',
    'MerchantViewSet',
    'CustomerViewSet',
    'KYCDocumentViewSet',
    'KYCViewSet',
    'MerchantCustomerViewSet',
    'MerchantKYCSubmissionViewSet',
    'verify_email',
]
