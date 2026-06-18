/**
 * automate-mockups.js
 * 
 * Local Mockup Uploader Pipeline (Google AI Studio Bypassed):
 * 1. Fetches products from Shopify Admin API.
 * 2. Scans the local "local_mockups" directory for subfolders matching product titles (e.g. "crop-tank", "ricks-lineup-tee").
 * 3. Reads generated mockup images (e.g. "black-1.png" -> Alt: "Black 1").
 * 4. Uploads them to the corresponding Shopify product(s).
 * 
 * Usage: node automate-mockups.js
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

async function getAllProducts() {
    console.log('📦 Fetching products from Shopify...');
    const result = await shopifyRequest('GET', '/products.json?limit=250');
    if (result.status !== 200) {
        throw new Error(`Failed to fetch products: ${JSON.stringify(result.data)}`);
    }
    return result.data.products;
}

async function uploadImageToShopify(productId, base64Image, altText, filename) {
    console.log(`   📤 Uploading image: "${altText}" (${filename}) to Product ID: ${productId}`);
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

// Helper to clean names for matching (e.g. "Rick's Lineup Tee" -> "ricks-lineup-tee")
function sanitizeFolderName(name) {
    return name.toLowerCase()
        .replace(/'/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Parse filename to alt text (e.g. "royal-blue-2.png" -> "Royal Blue 2")
function parseFilenameToAlt(filename) {
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    // Split by dash/separator
    const parts = baseName.split('-');
    const lastPart = parts[parts.length - 1];
    
    // Check if the last part is a number (id)
    if (/^\d+$/.test(lastPart)) {
        const id = lastPart;
        const colorParts = parts.slice(0, -1);
        const colorName = colorParts.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return `${colorName} ${id}`;
    }
    
    // Fallback: replace dashes with spaces and capitalize
    return baseName.replace(/[-_]+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// ── Main pipeline ────────────────────────────────────────
async function main() {
    console.log('🚀 GRIT Local Mockups Upload Pipeline');
    console.log('=====================================\n');

    // 1. Fetch all products from Shopify
    const products = await getAllProducts();
    console.log(`   Found ${products.length} products on Shopify.\n`);

    // 2. Scan the local_mockups directory
    const mockupsParentDir = path.join(__dirname, 'local_mockups');
    if (!fs.existsSync(mockupsParentDir)) {
        console.log(`📁 Creating folder: ${mockupsParentDir}`);
        fs.mkdirSync(mockupsParentDir, { recursive: true });
        console.log(`ℹ️  Please place your generated mockups in subfolders matching the product handles (e.g. "crop-tank" or "ricks-lineup-tee") and run the script again.\n`);
        return;
    }

    const subfolders = fs.readdirSync(mockupsParentDir).filter(f => {
        return fs.statSync(path.join(mockupsParentDir, f)).isDirectory();
    });

    if (subfolders.length === 0) {
        console.log('ℹ️  No subfolders found inside local_mockups/.\n');
        return;
    }

    // 3. Process each subfolder
    for (const folder of subfolders) {
        const folderPath = path.join(mockupsParentDir, folder);
        console.log(`\n━━━ Scanning Folder: "${folder}" ━━━`);

        // Find matching products on Shopify
        const matchedProducts = products.filter(p => {
            const sanitizedTitle = sanitizeFolderName(p.title);
            return sanitizedTitle.includes(folder) || folder.includes(sanitizedTitle);
        });

        if (matchedProducts.length === 0) {
            console.log(`   ⚠️  No matching Shopify product found for folder name "${folder}". Skipping.`);
            continue;
        }

        console.log(`   Matches ${matchedProducts.length} product(s) on Shopify: ${matchedProducts.map(p => p.title).join(', ')}`);

        // Scan images inside the folder
        const imageFiles = fs.readdirSync(folderPath).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
        });

        if (imageFiles.length === 0) {
            console.log(`   ⚠️  No images (.png, .jpg) found in "${folder}".`);
            continue;
        }

        console.log(`   Found ${imageFiles.length} image(s) to upload.`);

        // Upload to all matching products
        for (const file of imageFiles) {
            const filePath = path.join(folderPath, file);
            const fileBuffer = fs.readFileSync(filePath);
            const base64Image = fileBuffer.toString('base64');
            const altText = parseFilenameToAlt(file);

            for (const product of matchedProducts) {
                // Check if this product already has this alt text to avoid duplicates
                const alreadyExists = (product.images || []).some(img => img.alt && img.alt.trim().toLowerCase() === altText.toLowerCase());
                if (alreadyExists) {
                    console.log(`   ⏩ Image "${altText}" already exists on "${product.title}". Skipping.`);
                    continue;
                }

                try {
                    await uploadImageToShopify(product.id, base64Image, altText, file);
                    await sleep(2000); // 2 seconds delay for Shopify rate limits
                } catch (err) {
                    console.error(`   ❌ Failed to upload ${file} to "${product.title}": ${err.message}`);
                    await sleep(3000);
                }
            }
        }
    }

    console.log('\n🎉 Local mockups upload pipeline complete!');
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
