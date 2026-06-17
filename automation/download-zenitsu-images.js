const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const envPath = 'd:\\pink\\project 1\\automation\\.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const SHOPIFY_STORE = env.SHOPIFY_STORE || 'grit-real.myshopify.com';
const SHOPIFY_TOKEN = env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2024-04';

function shopifyRequest(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SHOPIFY_STORE,
            path: `/admin/api/${API_VERSION}${endpoint}`,
            method: method,
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_TOKEN,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadImage(res.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            const fileStream = fs.createWriteStream(dest);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
        }).on('error', reject);
    });
}

async function main() {
    const outDir = path.join(__dirname, 'zenitsu_raw_images');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    console.log('Fetching products...');
    const result = await shopifyRequest('GET', '/products.json?limit=50');
    if (result.status !== 200) {
        console.error('Error fetching products:', result.data);
        return;
    }
    const zenitsu = result.data.products.find(p => p.title.toLowerCase().includes('zenitsu'));
    if (!zenitsu) {
        console.error('Zenitsu product not found');
        return;
    }

    console.log(`Downloading ${zenitsu.images.length} images...`);
    for (const img of zenitsu.images) {
        // Skip size charts if they are there
        if (img.alt && img.alt.includes('SizeChart')) {
            console.log(`Skipping size chart: ${img.alt}`);
            continue;
        }
        const filename = img.alt || path.basename(new URL(img.src).pathname);
        const dest = path.join(outDir, filename);
        console.log(`Downloading ${img.src} to ${dest}...`);
        await downloadImage(img.src, dest);
    }
    console.log('All downloads completed!');
}

main().catch(err => console.error(err));
