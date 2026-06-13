/**
 * upload-local-mockups.js
 * 
 * Scans the generated_mockups folder and uploads the images to Shopify
 * for "The Luxury of Disconnect" product.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Load .env ────────────────────────────────────────────
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

const SHOPIFY_STORE = env.SHOPIFY_STORE || 'grit-real.myshopify.com';
const SHOPIFY_TOKEN = env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2024-04';

if (!SHOPIFY_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not found in .env.');
    process.exit(1);
}

// ── Shopify Admin API helpers ────────────────────────────
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

async function getProductByTitle(title) {
    console.log(`📦 Fetching product with title "${title}" from Shopify...`);
    const result = await shopifyRequest('GET', `/products.json?limit=50`);
    if (result.status !== 200) {
        throw new Error(`Failed to fetch products: ${JSON.stringify(result.data)}`);
    }
    const product = result.data.products.find(p => p.title.toLowerCase() === title.toLowerCase());
    if (!product) {
        throw new Error(`Product "${title}" not found on Shopify store.`);
    }
    return product;
}

async function uploadImageToShopify(productId, base64Image, altText, filename) {
    console.log(`   📤 Uploading: ${altText} (${filename})`);
    const result = await shopifyRequest('POST', `/products/${productId}/images.json`, {
        image: {
            attachment: base64Image,
            alt: altText,
            filename: filename
        }
    });

    if (result.status !== 200 && result.status !== 201) {
        throw new Error(`Failed to upload image "${altText}": ${JSON.stringify(result.data)}`);
    }
    return result.data.image;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main pipeline ────────────────────────────────────────
async function main() {
    console.log('🚀 GRIT Local Mockups Upload');
    console.log('===========================\n');

    const productTitle = 'The Luxury of Disconnect';
    const product = await getProductByTitle(productTitle);
    console.log(`   Found product: ${product.title} (ID: ${product.id})\n`);

    const mockupsDir = path.join(__dirname, 'generated_mockups');
    if (!fs.existsSync(mockupsDir)) {
        console.error(`❌ mockups directory not found at ${mockupsDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(mockupsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    console.log(`🎯 Found ${files.length} mockup image(s) to upload:\n`);

    for (const file of files) {
        const filePath = path.join(mockupsDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        const base64Image = fileBuffer.toString('base64');
        
        // Map filename e.g. "light_baby_pink_2.png" to alt text "light baby pink 2"
        const ext = path.extname(file);
        const baseName = path.basename(file, ext);
        const altText = baseName.replace(/_/g, ' ');

        try {
            await uploadImageToShopify(product.id, base64Image, altText, file);
            console.log(`   ✅ Successfully uploaded ${file}`);
            await sleep(2000); // 2 seconds delay to avoid Shopify rate limits
        } catch (err) {
            console.error(`   ❌ Failed for ${file}:`, err.message);
            await sleep(3000);
        }
    }

    console.log('\n🎉 All local mockups uploaded successfully!');
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
