const { createServer } = require('http');
const { Server } = require('socket.io');
const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');
const si = require('systeminformation');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});

const STATS_FILE = path.join(__dirname, 'stats.json');

let stats = {
    currentRequests: 0,
    totalRequests: 0,
    dailyRequests: 0,
    dailyStats: [],
    dailyRxTotal: 0,
    lastSavedDate: new Date().toISOString().split('T')[0]
};

let lastNetworkStats = 'ens3';

async function getNetworkThroughput() {
    try {
        const networkStats = await si.networkStats();
        const currentStats = networkStats[0];

        if (lastNetworkStats === null) {
            lastNetworkStats = currentStats;
            return { rx: '0.00', tx: '0.00' };
        }
        //const duration = Math.max(0, Date.now() - startTime);
        const duration = (currentStats.ms - lastNetworkStats.ms) / 1000;
        console.log(duration);
        if (duration <= 0) return { rx: '0.00', tx: '0.00' };
        
        const rxBytes = currentStats.rx_bytes - lastNetworkStats.rx_bytes;
        const rxMbps = ((rxBytes * 8) / (1024 * 1024) / duration).toFixed(2);

        const txBytes = currentStats.tx_bytes - lastNetworkStats.tx_bytes;
        const txMbps = ((txBytes * 8) / (1024 * 1024) / duration).toFixed(2);

        lastNetworkStats = currentStats;
        return {
            rx: 0,
            tx: 0
        };
    } catch (error) {
        console.error('Error calculating network throughput:', error);
        return { rx: '0.00', tx: '0.00' };
    }
}
function addRxTotal(rxValue) {
    stats.dailyRxTotal += parseFloat(rxValue) || 0;
}

function loadStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            const loadedStats = JSON.parse(data);
            stats = {
                ...stats,
                ...loadedStats
            };
            console.log('Statistics loaded from file');
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function saveRxStats(rxValue) {
    const now = new Date();
    stats.rxStats.push({
        timestamp: now.toISOString(),
        value: rxValue
    });

    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    stats.rxStats = stats.rxStats.filter(stat => 
        new Date(stat.timestamp) > oneDayAgo
    );
}

function saveStats() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        if (today !== stats.lastSavedDate) {
            stats.dailyStats.push({
                date: stats.lastSavedDate,
                requests: stats.dailyRequests,
                totalRequests: stats.totalRequests,
                rxTotal: stats.dailyRxTotal
            });

            if (stats.dailyStats.length > 30) {
                stats.dailyStats = stats.dailyStats.slice(-30);
            }

            stats.lastSavedDate = today;
            stats.dailyRequests = 0;
            stats.dailyRxTotal = 0;

            fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
            console.log('Statistics saved for date:', stats.lastSavedDate);
        }
    } catch (error) {
        console.error('Error saving statistics:', error);
    }
}
loadStats();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendStatus(404);
});

app.get('/api', (req, res) => {
    stats.currentRequests++;
    stats.totalRequests++;
    stats.dailyRequests++;
    saveStats();
    res.sendStatus(200);
});

let prevCpuInfo = os.cpus();
function getCpuUsage() {
    const currentCpuInfo = os.cpus();
    let totalUsage = 0;

    for (let i = 0; i < currentCpuInfo.length; i++) {
        const prev = prevCpuInfo[i];
        const curr = currentCpuInfo[i];

        const prevTotal = Object.values(prev.times).reduce((a, b) => a + b);
        const currTotal = Object.values(curr.times).reduce((a, b) => a + b);

        const prevIdle = prev.times.idle;
        const currIdle = curr.times.idle;

        const totalDiff = currTotal - prevTotal;
        const idleDiff = currIdle - prevIdle;

        totalUsage += ((totalDiff - idleDiff) / totalDiff) * 100;
    }

    prevCpuInfo = currentCpuInfo;
    return (totalUsage / currentCpuInfo.length).toFixed(2);
}

io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

setInterval(async () => {
    const networkStats = await getNetworkThroughput();
    
    // RX 합계 추가
    addRxTotal(networkStats.rx);
    io.emit('stats', {
        currentRequests: stats.currentRequests,
        totalRequests: stats.totalRequests,
        dailyRequests: stats.dailyRequests,
        cpuUsage: getCpuUsage(),
        rxMbps: networkStats.rx,
        txMbps: networkStats.tx,
        dailyRxTotal: stats.dailyRxTotal
    });
    stats.currentRequests = 0;
}, 2000);

app.get('/rx', (req, res) => {
    res.json({
        currentDayRxTotal: stats.dailyRxTotal,
        dailyStats: stats.dailyStats.map(day => ({
            date: day.date,
            rxTotal: day.rxTotal
        }))
    });
});

const PORT = process.env.PORT || 80;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
