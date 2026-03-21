# Dispute Management API Documentation

## Overview
The SikaRemit Dispute Management API provides endpoints for customers and merchants to create, manage, and resolve disputes in a multi-tier system.

## Base URL
```
/api/v1/payments/
```

## Authentication
All endpoints require authentication with a valid JWT token.

---

## Customer Dispute Endpoints

### Create Dispute
**POST** `/customer/disputes/`

Creates a new dispute for a transaction.

**Request Body:**
```json
{
    "transaction": "transaction_id",
    "reason": "Detailed reason for the dispute",
    "dispute_type": "customer_merchant"  // Optional, defaults to customer_merchant
}
```

**Response:**
```json
{
    "id": 1,
    "transaction_id": "tx_123456",
    "transaction_amount": "100.00",
    "transaction_currency": "USD",
    "merchant_name": "Example Store",
    "dispute_type": "customer_merchant",
    "reason": "Product not as described",
    "status": "merchant_response",
    "created_at": "2025-01-15T10:30:00Z",
    "days_open": 0,
    "is_escalated": false
}
```

### List Customer Disputes
**GET** `/customer/disputes/`

Retrieves all disputes for the authenticated customer.

**Query Parameters:**
- `status`: Filter by dispute status
- `escalated`: Filter by escalation status (`true`/`false`)

**Response:**
```json
{
    "count": 5,
    "results": [
        {
            "id": 1,
            "transaction_id": "tx_123456",
            "transaction_amount": "100.00",
            "transaction_currency": "USD",
            "merchant_name": "Example Store",
            "dispute_type": "customer_merchant",
            "reason": "Product not as described",
            "status": "resolved",
            "resolution": "Full refund processed",
            "created_at": "2025-01-15T10:30:00Z",
            "resolved_at": "2025-01-16T14:20:00Z",
            "days_open": 1,
            "is_escalated": false
        }
    ]
}
```

### Get Dispute Details
**GET** `/customer/disputes/{id}/`

Retrieves detailed information about a specific dispute.

### Provide Feedback
**POST** `/customer/disputes/{id}/feedback/`

Provides feedback on a resolved dispute.

**Request Body:**
```json
{
    "satisfied": true,
    "feedback_text": "Great resolution, thank you!"
}
```

**Response:**
```json
{
    "message": "Feedback submitted successfully",
    "dispute": {
        "id": 1,
        "status": "closed",
        "customer_satisfied": true,
        "customer_feedback": "Great resolution, thank you!"
    }
}
```

### Get Customer Dispute Statistics
**GET** `/customer/disputes/stats/`

Retrieves dispute statistics for the customer.

**Response:**
```json
{
    "total_disputes": 5,
    "open_disputes": 1,
    "resolved_disputes": 4,
    "escalated_disputes": 0,
    "satisfaction_rate": 85.5
}
```

---

## Merchant Dispute Endpoints

### List Merchant Disputes
**GET** `/merchant/disputes/`

Retrieves all disputes for the merchant's transactions.

**Query Parameters:**
- `status`: Filter by dispute status
- `escalated`: Filter by escalation status (`true`/`false`)
- `search`: Search by customer name or reason
- `start_date`: Filter disputes from this date
- `end_date`: Filter disputes until this date

**Response:**
```json
{
    "count": 10,
    "results": [
        {
            "id": 1,
            "transaction_id": "tx_123456",
            "transaction_amount": "100.00",
            "transaction_currency": "USD",
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "dispute_type": "customer_merchant",
            "reason": "Product not as described",
            "status": "merchant_response",
            "created_at": "2025-01-15T10:30:00Z",
            "days_open": 2,
            "response_deadline": "2025-01-17T10:30:00Z"
        }
    ]
}
```

### Respond to Dispute
**POST** `/merchant/disputes/{id}/respond/`

Merchant responds to a customer dispute.

**Request Body:**
```json
{
    "response_text": "We apologize for the issue. We can offer a full refund or replacement."
}
```

**Response:**
```json
{
    "message": "Response submitted successfully",
    "dispute": {
        "id": 1,
        "status": "under_review",
        "merchant_response": "We apologize for the issue. We can offer a full refund or replacement.",
        "merchant_response_time": "2025-01-16T09:15:00Z"
    }
}
```

### Resolve Dispute
**POST** `/merchant/disputes/{id}/resolve/`

Merchant resolves a dispute.

**Request Body:**
```json
{
    "resolution_text": "Full refund of $100.00 has been processed. The refund should appear in your account within 3-5 business days."
}
```

**Response:**
```json
{
    "message": "Dispute resolved successfully",
    "dispute": {
        "id": 1,
        "status": "resolved",
        "merchant_resolution": "Full refund of $100.00 has been processed.",
        "merchant_resolution_time": "2025-01-16T14:20:00Z",
        "resolved_at": "2025-01-16T14:20:00Z"
    }
}
```

### Escalate to Admin
**POST** `/merchant/disputes/{id}/escalate/`

Escalates a dispute to SikaRemit admin team.

**Request Body:**
```json
{
    "escalation_reason": "Customer is requesting compensation beyond our policy limits. Requires admin review."
}
```

**Response:**
```json
{
    "message": "Dispute escalated to admin successfully",
    "dispute": {
        "id": 1,
        "status": "pending_escalation",
        "escalated_to_admin": true,
        "escalated_at": "2025-01-16T15:30:00Z",
        "escalation_reason": "Customer is requesting compensation beyond our policy limits."
    }
}
```

### Get Merchant Dispute Statistics
**GET** `/merchant/disputes/stats/`

Retrieves dispute statistics for the merchant.

**Response:**
```json
{
    "total_disputes": 25,
    "open_disputes": 3,
    "under_review_disputes": 2,
    "resolved_disputes": 20,
    "escalated_disputes": 2,
    "overdue_disputes": 1,
    "avg_response_time_hours": 12.5,
    "satisfaction_rate": 88.0
}
```

### Get Overdue Disputes
**GET** `/merchant/disputes/overdue/`

Retrieves disputes that are overdue for response (older than 48 hours).

**Response:**
```json
{
    "count": 1,
    "results": [
        {
            "id": 5,
            "transaction_id": "tx_789012",
            "customer_name": "Jane Smith",
            "reason": "Wrong item delivered",
            "status": "merchant_response",
            "created_at": "2025-01-14T08:00:00Z",
            "days_open": 3
        }
    ]
}
```

---

## Dispute Status Flow

### Customer-Merchant Dispute Flow
1. **Open** → Customer creates dispute
2. **merchant_response** → Awaiting merchant response (48-hour deadline)
3. **under_review** → Merchant has responded, customer reviewing
4. **resolved** → Merchant resolves dispute
5. **closed** → Customer provides feedback and closes dispute
6. **pending_escalation** → Escalated to admin

### Escalation Triggers
- Customer not satisfied with resolution
- Merchant doesn't respond within 48 hours
- Merchant chooses to escalate complex issues

---

## Error Responses

### Validation Errors (400)
```json
{
    "error": "You can only dispute your own transactions"
}
```

### Authorization Errors (403)
```json
{
    "error": "Merchant profile not found"
}
```

### Not Found Errors (404)
```json
{
    "error": "Dispute not found"
}
```

---

## Notification Types

The system automatically sends notifications for:

### Customer Notifications
- **dispute_confirmation**: Dispute created successfully
- **dispute_response**: Merchant responded to dispute
- **dispute_resolution**: Dispute resolved by merchant
- **dispute_escalated_to_admin**: Dispute escalated to admin

### Merchant Notifications
- **dispute_created**: New dispute filed
- **dispute_positive_feedback**: Customer provided positive feedback

### Admin Notifications
- **dispute_escalation**: Dispute escalated for review

---

## Rate Limits

- **Create Dispute**: 5 disputes per customer per hour
- **Respond/Resolve**: 50 actions per merchant per hour
- **Feedback**: 10 feedback submissions per customer per hour

---

## Webhooks

Merchants can configure webhooks to receive real-time dispute notifications:

```json
{
    "event": "dispute.created",
    "data": {
        "dispute_id": 1,
        "transaction_id": "tx_123456",
        "customer_email": "customer@example.com",
        "reason": "Product not as described"
    },
    "timestamp": "2025-01-15T10:30:00Z"
}
```
