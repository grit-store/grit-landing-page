const https = require('https');
const fs = require('fs');
const path = require('path');

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

async function getProductByTitle(title) {
    console.log(`📦 Fetching product with title "${title}" from Shopify...`);
    const result = await shopifyRequest('GET', `/products.json?limit=50`);
    if (result.status !== 200) {
        throw new Error(`Failed to fetch products: ${JSON.stringify(result.data)}`);
    }
    const product = result.data.products.find(p => p.title.toLowerCase().includes(title.toLowerCase()));
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

async function main() {
    const artifactDir = 'C:\\Users\\divya\\.gemini\\antigravity-ide\\brain\\54579e53-2862-45b9-92bb-51f7764eb9de';
    const destDir = path.join(__dirname, 'zenitsu_generated_mockups');
    
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    console.log('📂 Finding generated images in artifacts...');
    const files = fs.readdirSync(artifactDir);
    
    // Map our generated image patterns to their target standard filenames and colors
    // Artifact files are named like: black_1_1781723336583.png
    const colorMapping = {
        'black': 'Black',
        'red': 'Red',
        'off_white': 'Off White'
    };

    const fileListToCopy = [];
    
    for (const file of files) {
        // Match: black_1_timestamp.png, off_white_2_timestamp.png, etc.
        const match = file.match(/^(black|red|off_white)_(\d+)_\d+\.png$/i);
        if (match) {
            const key = match[1].toLowerCase();
            const id = match[2];
            const colorName = colorMapping[key];
            const standardFilename = `${colorName.toLowerCase().replace(/\s+/g, '-')}-${id}.png`;
            const altText = `${colorName} ${id}`;
            
            fileListToCopy.push({
                sourcePath: path.join(artifactDir, file),
                destPath: path.join(destDir, standardFilename),
                filename: standardFilename,
                altText: altText
            });
        }
    }

    console.log(`   Found ${fileListToCopy.length} mockup files. Copying to local workspace...`);
    for (const item of fileListToCopy) {
        fs.copyFileSync(item.sourcePath, item.destPath);
        console.log(`   Copied to: ${item.destPath}`);
    }

    // 2. Fetch Zenitsu Product
    const product = await getProductByTitle('ZENITSU Oversized Tee');
    console.log(`\n🎯 Target Product: ${product.title} (ID: ${product.id})\n`);

    // 3. Upload each file to Shopify
    for (const item of fileListToCopy) {
        const fileBuffer = fs.readFileSync(item.destPath);
        const base64Image = fileBuffer.toString('base64');
        
        try {
            await uploadImageToShopify(product.id, base64Image, item.altText, item.filename);
            console.log(`   ✅ Successfully uploaded ${item.filename}`);
            await sleep(2000); // rate limiting
        } catch (err) {
            console.error(`   ❌ Failed for ${item.filename}:`, err.message);
            await sleep(3000);
        }
    }

    console.log('\n🎉 All mockups uploaded and linked successfully to ZENITSU Oversized Tee!');
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
