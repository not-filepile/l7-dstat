const socket = io("");
socket.on('connect', () => {
    console.log('Connected to server');
});
socket.on('stats', (data) => {
    console.log('Stats received:', data);
});

const chartOptions = {
    chart: {
        type: 'area',
        animation: {
            duration: 900,
            easing: 'easeOutBounce'
        },
        backgroundColor: 'transparent',
        height: 300
    },
    title: { text: null },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
        type: 'datetime',
        labels: {
            format: '{value:%H:%M:%S}',
            style: {
                color: '#666'
            }
        },
        lineColor: '#e5e7eb',
        tickColor: '#e5e7eb'
    },
    yAxis: {
        title: { text: null },
        gridLineColor: '#e5e7eb',
        labels: {
            style: {
                color: '#666'
            }
        }
    },
    tooltip: {
        headerFormat: '<b>{series.name}</b><br/>',
        pointFormat: '{point.x:%H:%M:%S}<br/>{point.y}'
    },
    plotOptions: {
        area: {
            fillOpacity: 0.3,
            marker: {
                radius: 2,
                fillColor: '#FFFFFF',
                lineWidth: 2,
                lineColor: null
            },
            lineWidth: 2,
            states: {
                hover: {
                    lineWidth: 2
                }
            },
            threshold: null,
            lineColor: '#666',
            lineWidth: 2,
            marker: {
                enabled: true
            },
            shadow: false,
            states: {
                hover: {
                    lineWidth: 2
                }
            },
            threshold: null
        },
        series: {
            marker: {
                enabled: false
            }
        }
    }
};

const requestsChart = Highcharts.chart('requests-chart', {
    ...chartOptions,
    series: [{
        name: '요청량',
        color: '#4F46E5',
        fillColor: {
            linearGradient: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1
            },
            stops: [
                [0, Highcharts.color('#4F46E5').setOpacity(0.3).get('rgba')],
                [1, Highcharts.color('#4F46E5').setOpacity(0).get('rgba')]
            ]
        },
        data: []
    }],
    yAxis: {
        min: 0    }
});

const cpuChart = Highcharts.chart('cpu-chart', {
    ...chartOptions,
    series: [{
        name: 'CPU 사용량',
        color: '#EF4444',
        fillColor: {
            linearGradient: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1
            },
            stops: [
                [0, Highcharts.color('#EF4444').setOpacity(0.3).get('rgba')],
                [1, Highcharts.color('#EF4444').setOpacity(0).get('rgba')]
            ]
        },
        data: []
    }],
    yAxis: {
        min: 0,
        max: 100        
    }
});

const rxChart = Highcharts.chart('rx-chart', {
    ...chartOptions,
    series: [{
        name: 'RX',
        color: '#10B981',
        fillColor: {
            linearGradient: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1
            },
            stops: [
                [0, Highcharts.color('#10B981').setOpacity(0.3).get('rgba')],
                [1, Highcharts.color('#10B981').setOpacity(0).get('rgba')]
            ]
        },
        data: []
    }],
    yAxis: {
        min: 0
    }
});

const txChart = Highcharts.chart('tx-chart', {
    ...chartOptions,
    series: [{
        name: 'TX',
        color: '#F59E0B',
        fillColor: {
            linearGradient: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1
            },
            stops: [
                [0, Highcharts.color('#F59E0B').setOpacity(0.3).get('rgba')],
                [1, Highcharts.color('#F59E0B').setOpacity(0).get('rgba')]
            ]
        },
        data: []
    }],
    yAxis: {
        min: 0
    }
});

function formatNumber(num) {
    return new Intl.NumberFormat('ko-KR').format(num);
}

const MAX_POINTS = 15;

socket.on('stats', (data) => {
    const time = new Date().getTime();

    document.getElementById('current-requests').textContent = formatNumber(data.currentRequests);
    document.getElementById('total-requests').textContent = formatNumber(data.totalRequests);
    document.getElementById('daily-requests').textContent = formatNumber(data.dailyRequests);

    document.getElementById('current-rx').textContent = formatNumber(data.rxMbps);
    document.getElementById('current-tx').textContent = formatNumber(data.txMbps);
    document.getElementById('rx-total').textContent = formatNumber(data.dailyRxTotal);

    requestsChart.series[0].addPoint([time, data.currentRequests], true, 
        requestsChart.series[0].data.length >= MAX_POINTS);
    
    cpuChart.series[0].addPoint([time, parseFloat(data.cpuUsage)], true,
        cpuChart.series[0].data.length >= MAX_POINTS);

    rxChart.series[0].addPoint([time, parseFloat(data.rxMbps)], true,
        rxChart.series[0].data.length >= MAX_POINTS);

    txChart.series[0].addPoint([time, parseFloat(data.txMbps)], true,
        txChart.series[0].data.length >= MAX_POINTS);
});

window.addEventListener('resize', () => {
    requestsChart.reflow();
    cpuChart.reflow();
    rxChart.reflow();
    txChart.reflow();
});
