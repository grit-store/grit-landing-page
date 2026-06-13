/**
 * get-shopify-token.js
 * Gets a Shopify Admin API access token.
 * The app must already be installed (via managed install).
 * This script does the OAuth code exchange to get the permanent token.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const CLIENT_ID = env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = env.SHOPIFY_CLIENT_SECRET;
const STORE = env.SHOPIFY_STORE || 'grit-real.myshopify.com';
const SCOPES = 'read_products,write_products';
const REDIRECT_URI = 'http://localhost:3000/callback';

console.log('🔑 Shopify Token Generator');
console.log('==========================\n');
console.log('Using Client ID:', CLIENT_ID);
console.log('Store:', STORE, '\n');

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost:3000');
    
    // Log all requests for debugging
    console.log(`📥 Request: ${url.pathname}${url.search}`);
    
    if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        
        if (code) {
            console.log('✅ Authorization code received! Exchanging for access token...\n');
            
            try {
                const accessToken = await exchangeCodeForToken(code);
                saveToken(accessToken);
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<html><body style="background:#0A0A0A;color:#FAFAF9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h1 style="color:#34C759;">✅ Success!</h1>
                        <p>Your Shopify Admin API access token has been saved to .env</p>
                        <p>You can close this tab.</p>
                    </div>
                </body></html>`);
                
                setTimeout(() => { server.close(); process.exit(0); }, 2000);
            } catch (err) {
                console.error('❌ Token exchange failed:', err.message);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<html><body style="background:#0A0A0A;color:#fff;font-family:sans-serif;padding:40px;"><h1>Error</h1><p>${err.message}</p></body></html>`);
            }
            return;
        }
    }
    
    // For any other request (including the managed install redirect), 
    // redirect to OAuth authorize to get a code
    const authUrl = `https://${STORE}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    console.log('🔄 Redirecting to OAuth authorize...\n');
    res.writeHead(302, { 'Location': authUrl });
    res.end();
});

server.listen(3000, () => {
    // Since the app is already installed, go directly to OAuth authorize
    const authUrl = `https://${STORE}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    
    console.log('🌐 Opening browser for authorization...');
    console.log(`   URL: ${authUrl}\n`);
    
    try {
        execSync(`start "" "${authUrl}"`, { stdio: 'ignore' });
    } catch {
        console.log('⚠️  Open the URL above manually.');
    }
    
    console.log('⏳ Waiting for authorization...\n');
});

function exchangeCodeForToken(code) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code
        });

        const req = https.request({
            hostname: STORE,
            path: '/admin/oauth/access_token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.access_token) {
                        resolve(parsed.access_token);
                    } else {
                        reject(new Error(`Shopify response: ${data}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function saveToken(token) {
    let updated = fs.readFileSync(envPath, 'utf-8');
    if (updated.includes('SHOPIFY_ACCESS_TOKEN=')) {
        updated = updated.replace(/SHOPIFY_ACCESS_TOKEN=.*/, `SHOPIFY_ACCESS_TOKEN=${token}`);
    } else {
        updated += `\n# Shopify Admin API access token (auto-generated)\nSHOPIFY_ACCESS_TOKEN=${token}\n`;
    }
    fs.writeFileSync(envPath, updated);
    console.log('✅ Access token saved to .env!');
    console.log('🎉 Setup complete! You can now run the automation script.\n');
}
