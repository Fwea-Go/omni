const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 2000
};

const request = http.request(options, (res) => {
    let data = '';

    res.on('data', chunk => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const health = JSON.parse(data);
                console.log(`✅ Health check passed: ${health.status}`);
                process.exit(0);
            } catch (error) {
                console.error('❌ Invalid health check response');
                process.exit(1);
            }
        } else {
            console.error(`❌ Health check failed with status: ${res.statusCode}`);
            process.exit(1);
        }
    });
});

request.on('error', (error) => {
    console.error('❌ Health check error:', error.message);
    process.exit(1);
});

request.on('timeout', () => {
    console.error('❌ Health check timeout');
    request.destroy();
    process.exit(1);
});

request.end();
