from flask import Flask, Response, request
import requests
import json

app = Flask(__name__)

@app.route('/api/v1/query')
def query():
    """Proxy Prometheus API queries"""
    query = request.args.get('query', 'up')
    time_param = request.args.get('time', '')
    
    # Forward to your actual metrics
    try:
        # Get metrics from your app
        metrics_url = "https://sikaremit.onrender.com/metrics"
        response = requests.get(metrics_url, timeout=5)
        
        if response.status_code == 200:
            # Parse metrics and find matching ones
            metrics_text = response.text
            result = {"status": "success", "data": {"resultType": "vector", "result": []}}
            
            # Simple metric parsing
            lines = metrics_text.split('\n')
            for line in lines:
                if line and not line.startswith('#'):
                    if 'total' in line:  # Simple match
                        parts = line.split()
                        if len(parts) >= 2:
                            result["data"]["result"].append({
                                "metric": {"__name__": parts[0]},
                                "value": [int(time_param) if time_param else 0, float(parts[1])]
                            })
            
            return Response(json.dumps(result), content_type='application/json')
        else:
            return {"error": "Metrics not available"}, 502
            
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/api/v1/query_range')
def query_range():
    """Proxy range queries"""
    return query()  # Simple implementation

@app.route('/api/v1/label/__name__/values')
def label_values():
    """Return available metric names"""
    return {
        "status": "success",
        "data": [
            "process_cpu_seconds_total",
            "process_resident_memory_bytes",
            "django_http_requests_total",
            "sikaremit_active_users_total",
            "sikaremit_transactions_total"
        ]
    }

@app.route('/health')
def health():
    return {"status": "ok"}, 200

# Vercel serverless function handler
def handler(request):
    return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
