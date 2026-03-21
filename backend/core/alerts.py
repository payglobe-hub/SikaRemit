from prometheus_client import Gauge
from django.core.mail import send_mail
from datetime import datetime, timedelta
import os
import requests

ALERT_THRESHOLDS = {
    'db_connection_errors': {
        'value': 3,
        'severity': 'CRITICAL'
    },
    'statement_timeouts': {
        'value': 5, 
        'severity': 'WARNING'
    },
    'idle_transactions': {
        'value': 1,
        'severity': 'CRITICAL'
    },
    'lock_wait_time': {
        'value': 2000,
        'severity': 'WARNING'
    }
}

# Notification channels from environment variables
NOTIFICATION_CHANNELS = [
    email.strip() for email in os.getenv('NOTIFICATION_EMAILS', '').split(',') 
    if email.strip()
] if os.getenv('NOTIFICATION_EMAILS') else []

ALERT_COOLDOWN = 300  # 5 minutes between repeat alerts

SLACK_WEBHOOK = os.getenv('SLACK_WEBHOOK_URL')
GRAFANA_WEBHOOK = os.getenv('GRAFANA_WEBHOOK_URL')

last_alert_sent = None

def check_alerts():
    global last_alert_sent
    
    if last_alert_sent and datetime.now() - last_alert_sent < timedelta(seconds=ALERT_COOLDOWN):
        return
        
    alerts = []
    
    if DB_CONNECTION_ERRORS > ALERT_THRESHOLDS['db_connection_errors']['value']:
        alerts.append((ALERT_THRESHOLDS['db_connection_errors']['severity'], f'Database connection errors: {DB_CONNECTION_ERRORS}'))
        
    if STATEMENT_TIMEOUTS > ALERT_THRESHOLDS['statement_timeouts']['value']:
        alerts.append((ALERT_THRESHOLDS['statement_timeouts']['severity'], f'Statement timeouts: {STATEMENT_TIMEOUTS}'))
    
    if alerts:
        send_alerts(alerts)
        last_alert_sent = datetime.now()

def send_to_slack(message):
    if SLACK_WEBHOOK:
        requests.post(
            SLACK_WEBHOOK,
            json={'text': f"[SikaRemit Alert] {message}"}
        )

def send_to_grafana(alert):
    if GRAFANA_WEBHOOK:
        requests.post(
            GRAFANA_WEBHOOK,
            json={
                'title': alert[0],
                'message': alert[1],
                'tags': ['database']
            }
        )

def send_alerts(alerts):
    # Email
    send_mail(
        f"SikaRemit Alert: {', '.join([a[0] for a in alerts])}",
        '\n\n'.join([f"{a[0]}: {a[1]}" for a in alerts]),
        'alerts@SikaRemit.com',
        NOTIFICATION_CHANNELS
    )
    
    # Slack/Webhooks
    for alert in alerts:
        send_to_slack(f"{alert[0]}: {alert[1]}")
        send_to_grafana(alert)
