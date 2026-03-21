# Merchants Module

## Features

### Merchant Onboarding
- 4-step onboarding workflow:
  1. Business information
  2. Bank details
  3. Document verification
  4. Completion
- Document upload support (ID, business license)
- Status tracking

### Store & Product Management
- CRUD operations for stores
- Product inventory with:
  - Stock tracking
  - Low stock alerts
  - SKU/barcode support
- Ownership validation

### Business Analytics
- Sales dashboard
- 30-day trends
- Store/product metrics

#### Response Formats

**Business Summary** (`GET /business-summary/`):
```json
{
  "total_sales": 42,
  "total_volume": 1250.50,
  "top_products": [
    {"id": 1, "name": "Product A", "sales_count": 15},
    {"id": 2, "name": "Product B", "sales_count": 10}
  ],
  "payment_methods": [
    {"payment_method": "card", "count": 30, "total": 900.00},
    {"payment_method": "mobile_money", "count": 12, "total": 350.50}
  ]
}
```

**Sales Trends** (`GET /sales-trends/?days=14`):
```json
{
  "daily_sales": [
    {"date": "2025-10-12", "total": 150.00},
    {"date": "2025-10-13", "total": 200.50}
  ],
  "period": "Last 14 days"
}
```

### Subscription System
- Tiered plans:
  - **Basic**: 1 store, 50 products
  - **Standard**: 3 stores, 200 products, analytics
  - **Premium**: 10 stores, 1000 products, priority support
- Automated permission checks

### Payment Integration
- QR code payments
- Mobile money support
- Card processing

## API Endpoints

| Endpoint | Method | Description | Requirements |
|----------|--------|-------------|--------------|
| `/onboarding/` | GET/POST | Onboarding status | - |
| `/onboarding/verify/` | POST | Upload verification docs | - |
| `/stores/` | CRUD | Store management | - |
| `/products/` | CRUD | Product management | - |
| `/dashboard/stats/` | GET | Basic metrics | All tiers |
| `/dashboard/business-summary/` | GET | 30-day analytics | Standard+ |
| `/dashboard/sales-trends/` | GET | Daily sales trends | Standard+ |

**Cache Control**:
- Add `?refresh=true` to bypass cache
- Data cached for 1 hour
- Auto-invalidated when relevant data changes

**Error Responses**:
- `403 Forbidden`: Tier restrictions
- `500 Server Error`: Analytics generation failed
- `400 Bad Request`: Invalid parameters

## Models

### MerchantOnboarding
- Tracks verification progress
- Stores temporary data

### Store
- Merchant association
- Active/inactive status

### Product
- Inventory tracking
- Pricing/SKU management

## Permissions
- `IsMerchantUser`: Merchant-only access
- `HasActiveSubscription`: Tier-based checks
