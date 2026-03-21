import requests
from django.conf import settings

def verify_webhooks():
    """Test all configured webhook connections."""
    results = {}
    
    # Test Slack
    if hasattr(settings, 'SLACK_WEBHOOK_URL'):
        try:
            response = requests.post(
                settings.SLACK_WEBHOOK_URL,
                json={'text': 'SikaRemit webhook test'}
            )
            results['slack'] = response.status_code == 200
        except Exception as e:
            results['slack'] = str(e)
    
    # Test Grafana
    if hasattr(settings, 'GRAFANA_WEBHOOK_URL'):
        try:
            response = requests.get(
                settings.GRAFANA_URL.replace('/d/', '/api/dashboards/uid/')
            )
            results['grafana'] = response.status_code == 200
        except Exception as e:
            results['grafana'] = str(e)
    
    return results
