// Node.js script to test the game by simulating browser interactions
const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 Testing CS2 Game Spin Functionality...');

// First, verify server is responding
function testServerResponse() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (data.includes('CS2 Grid Battle')) {
                    console.log('✅ Server is responding correctly');
                    resolve(true);
                } else {
                    console.error('❌ Server response invalid');
                    reject(false);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Server connection failed:', err.message);
            reject(err);
        });
        
        req.setTimeout(5000, () => {
            console.error('❌ Server response timeout');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function runTest() {
    try {
        await testServerResponse();
        console.log('🎯 Server test passed, opening browser for manual testing...');
        
        // Open browser for manual testing
        const platform = process.platform;
        let cmd;
        
        if (platform === 'darwin') {
            cmd = 'open';
        } else if (platform === 'win32') {
            cmd = 'start';
        } else {
            cmd = 'xdg-open';
        }
        
        spawn(cmd, ['http://localhost:3000'], { detached: true, stdio: 'ignore' });
        console.log('🌐 Browser opened - please test spin functionality manually');
        console.log('👀 Watch for error indicators in the bottom-right corner');
        console.log('🔍 Check browser console for detailed error logs');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

runTest();