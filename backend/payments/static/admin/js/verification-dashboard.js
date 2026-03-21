// Initialize dashboard charts
document.addEventListener('DOMContentLoaded', function() {
    // Fetch analytics data
    fetch('/api/verification/analytics/')
        .then(response => response.json())
        .then(data => {
            renderHealthChart(data.providers);
            renderGeoChart(data.geo);
            renderAlerts(data.alerts);
            renderTrendsChart(data.trends);
        });

    // Health Status Chart
    function renderHealthChart(providers) {
        new Chart(
            document.getElementById('health-status-chart'),
            {
                type: 'bar',
                data: {
                    labels: providers.map(p => p.name),
                    datasets: [{
                        label: 'Success Rate',
                        data: providers.map(p => p.success_rate),
                        backgroundColor: providers.map(p => 
                            p.healthy ? '#2ecc71' : '#e74c3c'
                        )
                    }]
                }
            }
        );
    }

    // Geographic Performance Chart
    function renderGeoChart(geoData) {
        new Chart(
            document.getElementById('geo-performance-chart'),
            {
                type: 'doughnut',
                data: {
                    labels: geoData.map(g => g.country_code),
                    datasets: [{
                        data: geoData.map(g => g.total),
                        backgroundColor: geoData.map((_, i) => 
                            `hsl(${i * 360 / geoData.length}, 70%, 50%)`
                        )
                    }]
                }
            }
        );
    }

    // Trends Chart
    function renderTrendsChart(trendsData) {
        new Chart(
            document.getElementById('trends-chart'),
            {
                type: 'line',
                data: {
                    labels: trendsData.map(t => t.date),
                    datasets: [
                        {
                            label: 'Success Rate',
                            data: trendsData.map(t => t.success_rate),
                            borderColor: '#2ecc71',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Response Time (ms)',
                            data: trendsData.map(t => t.avg_response_time),
                            borderColor: '#3498db',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left'
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right'
                        }
                    }
                }
            }
        );
    }
});
