from flask import Flask, Response, request
import requests
import json

app = Flask(__name__)

@app.route('/api/v1/query')
def query():
    """Prometheus-compatible query endpoint"""
    query_param = request.args.get('query', 'up')
    time_param = request.args.get('time', '')
    
    try:
        # Get metrics from your Django backend
        metrics_url = "https://sikaremit.onrender.com/metrics"
        response = requests.get(metrics_url, timeout=5)
        
        if response.status_code == 200:
            metrics_text = response.text
            
            # Parse metrics and create Prometheus-compatible response
            result = {"status": "success", "data": {"resultType": "vector", "result": []}}
            
            lines = metrics_text.split('\n')
            for line in lines:
                if line and not line.startswith('#'):
                    parts = line.split()
                    if len(parts) >= 2 and query_param in parts[0]:
                        try:
                            value = float(parts[1])
                            result["data"]["result"].append({
                                "metric": {"__name__": parts[0]},
                                "value": [int(time_param) if time_param else 0, value]
                            })
                        except ValueError:
                            continue
            
            return Response(json.dumps(result), content_type='application/json')
        else:
            return {"status": "error", "error": "Metrics not available"}, 502
            
    except Exception as e:
        return {"status": "error", "error": str(e)}, 500

@app.route('/api/v1/query_range')
def query_range():
    """Prometheus-compatible range query"""
    return query()

@app.route('/api/v1/label/__name__/values')
def label_values():
    """Return available metric names"""
    return {
        "status": "success",
        "data": [
            "process_cpu_seconds_total",
            "process_resident_memory_bytes", 
            "django_http_requests_total",
            "process_start_time_seconds",
            "python_gc_objects_collected_total"
        ]
    }

@app.route('/health')
def health():
    return {"status": "ok"}, 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
