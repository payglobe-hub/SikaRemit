"""
Telecom package configuration
This file contains configurable pricing and package details for telecom providers
"""

# Ghana Telecom Packages Configuration
GHANA_PACKAGES = {
    'mtn': {
        'provider_info': {
            'name': 'MTN Ghana',
            'code': 'MTN_GH',
            'website': 'https://www.mtn.com.gh',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'MTN_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 12.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'MTN_2GB',
                'name': '2GB Data Bundle',
                'data': '2GB',
                'price': 22.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'MTN_5GB',
                'name': '5GB Data Bundle',
                'data': '5GB',
                'price': 45.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'MTN_10GB',
                'name': '10GB Data Bundle',
                'data': '10GB',
                'price': 80.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'MTN_AIRTIME_10',
                'name': 'GHS 10 Airtime',
                'data': None,
                'price': 10.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'MTN_AIRTIME_20',
                'name': 'GHS 20 Airtime',
                'data': None,
                'price': 20.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'MTN_AIRTIME_50',
                'name': 'GHS 50 Airtime',
                'data': None,
                'price': 50.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    'telecel': {
        'provider_info': {
            'name': 'Telecel Ghana',
            'code': 'TELECEL_GH',
            'website': 'https://www.telecel.com.gh',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'TELECEL_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 10.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'TELECEL_2GB',
                'name': '2GB Data Bundle',
                'data': '2GB',
                'price': 18.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'TELECEL_5GB',
                'name': '5GB Data Bundle',
                'data': '5GB',
                'price': 40.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'TELECEL_AIRTIME_10',
                'name': 'GHS 10 Airtime',
                'data': None,
                'price': 10.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'TELECEL_AIRTIME_20',
                'name': 'GHS 20 Airtime',
                'data': None,
                'price': 20.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    'airteltigo': {
        'provider_info': {
            'name': 'AirtelTigo Ghana',
            'code': 'AIRTELTIGO_GH',
            'website': 'https://www.airteltigo.com.gh',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'AIRTELTIGO_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 11.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'AIRTELTIGO_3GB',
                'name': '3GB Data Bundle',
                'data': '3GB',
                'price': 30.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'AIRTELTIGO_AIRTIME_10',
                'name': 'GHS 10 Airtime',
                'data': None,
                'price': 10.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'AIRTELTIGO_AIRTIME_25',
                'name': 'GHS 25 Airtime',
                'data': None,
                'price': 25.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    'glo': {
        'provider_info': {
            'name': 'Glo Ghana',
            'code': 'GLO_GH',
            'website': 'https://www.glo.com',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'GLO_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 9.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'GLO_3GB',
                'name': '3GB Data Bundle',
                'data': '3GB',
                'price': 25.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'GLO_AIRTIME_10',
                'name': 'GHS 10 Airtime',
                'data': None,
                'price': 10.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'GLO_AIRTIME_20',
                'name': 'GHS 20 Airtime',
                'data': None,
                'price': 20.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    }
}

# Nigeria Telecom Packages Configuration
NIGERIA_PACKAGES = {
    'mtn': {
        'provider_info': {
            'name': 'MTN Nigeria',
            'code': 'MTN_NG',
            'website': 'https://www.mtnonline.com',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'MTN_NG_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 250.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'MTN_NG_2GB',
                'name': '2GB Data Bundle',
                'data': '2GB',
                'price': 500.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'MTN_NG_5GB',
                'name': '5GB Data Bundle',
                'data': '5GB',
                'price': 1000.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'MTN_NG_10GB',
                'name': '10GB Data Bundle',
                'data': '10GB',
                'price': 1800.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'MTN_NG_AIRTIME_100',
                'name': '₦100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'MTN_NG_AIRTIME_500',
                'name': '₦500 Airtime',
                'data': None,
                'price': 500.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    'airtel': {
        'provider_info': {
            'name': 'Airtel Nigeria',
            'code': 'AIRTEL_NG',
            'website': 'https://www.airtel.com.ng',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'AIRTEL_NG_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 200.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'AIRTEL_NG_3GB',
                'name': '3GB Data Bundle',
                'data': '3GB',
                'price': 600.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'AIRTEL_NG_AIRTIME_100',
                'name': '₦100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'AIRTEL_NG_AIRTIME_500',
                'name': '₦500 Airtime',
                'data': None,
                'price': 500.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    'glo': {
        'provider_info': {
            'name': 'Glo Nigeria',
            'code': 'GLO_NG',
            'website': 'https://www.glo.com',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'GLO_NG_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 180.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'GLO_NG_4GB',
                'name': '4GB Data Bundle',
                'data': '4GB',
                'price': 700.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'GLO_NG_AIRTIME_100',
                'name': '₦100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'GLO_NG_AIRTIME_500',
                'name': '₦500 Airtime',
                'data': None,
                'price': 500.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    '9mobile': {
        'provider_info': {
            'name': '9mobile Nigeria',
            'code': '9MOBILE_NG',
            'website': 'https://www.9mobile.com.ng',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': '9MOBILE_NG_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 220.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': '9MOBILE_NG_3GB',
                'name': '3GB Data Bundle',
                'data': '3GB',
                'price': 650.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': '9MOBILE_NG_AIRTIME_100',
                'name': '₦100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': '9MOBILE_NG_AIRTIME_500',
                'name': '₦500 Airtime',
                'data': None,
                'price': 500.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    }
}

# Kenya Telecom Packages Configuration
KENYA_PACKAGES = {
    'safaricom': {
        'provider_info': {
            'name': 'Safaricom Kenya',
            'code': 'SAFARICOM_KE',
            'website': 'https://www.safaricom.co.ke',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'SAFARICOM_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 100.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'SAFARICOM_5GB',
                'name': '5GB Data Bundle',
                'data': '5GB',
                'price': 450.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'SAFARICOM_AIRTIME_50',
                'name': 'KSh 50 Airtime',
                'data': None,
                'price': 50.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'SAFARICOM_AIRTIME_100',
                'name': 'KSh 100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    'airtel': {
        'provider_info': {
            'name': 'Airtel Kenya',
            'code': 'AIRTEL_KE',
            'website': 'https://www.airtel.co.ke',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'AIRTEL_KE_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 90.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'AIRTEL_KE_4GB',
                'name': '4GB Data Bundle',
                'data': '4GB',
                'price': 400.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'AIRTEL_KE_AIRTIME_50',
                'name': 'KSh 50 Airtime',
                'data': None,
                'price': 50.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'AIRTEL_KE_AIRTIME_100',
                'name': 'KSh 100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    }
}

# South Africa Telecom Packages Configuration
SOUTH_AFRICA_PACKAGES = {
    'vodacom': {
        'provider_info': {
            'name': 'Vodacom South Africa',
            'code': 'VODACOM_ZA',
            'website': 'https://www.vodacom.co.za',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'VODACOM_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 99.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'VODACOM_5GB',
                'name': '5GB Data Bundle',
                'data': '5GB',
                'price': 450.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'VODACOM_AIRTIME_50',
                'name': 'R50 Airtime',
                'data': None,
                'price': 50.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'VODACOM_AIRTIME_100',
                'name': 'R100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    },
    'mtn': {
        'provider_info': {
            'name': 'MTN South Africa',
            'code': 'MTN_ZA',
            'website': 'https://www.mtn.co.za',
            'supports_data': True,
            'supports_airtime': True,
            'is_active': True
        },
        'packages': [
            {
                'id': 'MTN_ZA_1GB',
                'name': '1GB Data Bundle',
                'data': '1GB',
                'price': 95.00,
                'validity': 30,
                'type': 'data',
                'featured': False
            },
            {
                'id': 'MTN_ZA_5GB',
                'name': '5GB Data Bundle',
                'data': '5GB',
                'price': 430.00,
                'validity': 30,
                'type': 'data',
                'featured': True
            },
            {
                'id': 'MTN_ZA_AIRTIME_50',
                'name': 'R50 Airtime',
                'data': None,
                'price': 50.00,
                'validity': 30,
                'type': 'airtime',
                'featured': False
            },
            {
                'id': 'MTN_ZA_AIRTIME_100',
                'name': 'R100 Airtime',
                'data': None,
                'price': 100.00,
                'validity': 30,
                'type': 'airtime',
                'featured': True
            }
        ]
    }
}

# All country configurations
COUNTRY_PACKAGES = {
    'GH': GHANA_PACKAGES,
    'NG': NIGERIA_PACKAGES,
    'KE': KENYA_PACKAGES,
    'ZA': SOUTH_AFRICA_PACKAGES
}

# Currency mapping
CURRENCY_MAPPING = {
    'GH': 'GHS',
    'NG': 'NGN',
    'KE': 'KES',
    'ZA': 'ZAR'
}

# Package validation rules
VALIDATION_RULES = {
    'min_price': 0.01,
    'max_price': 10000.00,
    'min_validity_days': 1,
    'max_validity_days': 365,
    'valid_package_types': ['data', 'airtime', 'bundle'],
    'required_fields': ['id', 'name', 'price', 'validity', 'type']
}
