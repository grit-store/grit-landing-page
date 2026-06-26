/**
 * automate-mockups.js
 * 
 * Local Mockup Uploader Pipeline:
 * 1. Fetches products from Shopify Admin API.
 * 2. Scans the local "local_mockups" directory for subfolders matching product titles.
 * 3. Validates mockup images (checks file sizes, completeness).
 * 4. Reads generated mockup images (e.g. "black-1.png" -> Alt: "Black 1").
 * 5. Uploads them to the corresponding Shopify product(s).
 * 
 * Usage:
 *   node automate-mockups.js              # Upload all pending mockups
 *   node automate-mockups.js --dry-run    # Preview what would be uploaded (no actual uploads)
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

// ── Pre-upload validation ────────────────────────────────
const MIN_VALID_SIZE = 50 * 1024; // 50KB — files smaller than this are likely raw copies, not generated mockups

function validateMockups(folderPath, folder) {
    const imageFiles = fs.readdirSync(folderPath).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
    });

    if (imageFiles.length === 0) {
        return { valid: false, files: [], warnings: [`No images found in "${folder}"`], errors: [] };
    }

    const warnings = [];
    const errors = [];
    const validFiles = [];
    const tinyFiles = [];

    for (const file of imageFiles) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        if (stats.size < MIN_VALID_SIZE) {
            tinyFiles.push({ file, size: stats.size, sizeKB });
            warnings.push(`"${file}" is only ${sizeKB}KB — likely a raw Shopify image copy, NOT a generated mockup`);
        } else {
            validFiles.push({ file, size: stats.size, sizeKB });
        }
    }

    // Check completeness: expect files named like color-1.png through color-5.png
    const colorGroups = {};
    for (const file of imageFiles) {
        const ext = path.extname(file);
        const baseName = path.basename(file, ext);
        const parts = baseName.split('-');
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
            const colorKey = parts.slice(0, -1).join('-');
            if (!colorGroups[colorKey]) colorGroups[colorKey] = [];
            colorGroups[colorKey].push(parseInt(lastPart));
        }
    }

    for (const [color, ids] of Object.entries(colorGroups)) {
        const expected = [1, 2, 3, 4, 5];
        const missing = expected.filter(id => !ids.includes(id));
        if (missing.length > 0) {
            warnings.push(`Color "${color}" is missing mockup IDs: ${missing.join(', ')} (expected 1-5)`);
        }
    }

    return {
        valid: errors.length === 0,
        files: imageFiles,
        validFiles,
        tinyFiles,
        colorGroups,
        warnings,
        errors
    };
}

// ── Main pipeline ────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    console.log('🚀 GRIT Local Mockups Upload Pipeline');
    if (isDryRun) {
        console.log('   🔍 DRY RUN MODE — no uploads will be performed');
    }
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

    let totalUploaded = 0;
    let totalSkipped = 0;
    let totalWarnings = 0;

    // 3. Process each subfolder
    for (const folder of subfolders) {
        const folderPath = path.join(mockupsParentDir, folder);
        console.log(`\n━━━ Scanning Folder: "${folder}" ━━━`);

        // Find matching products on Shopify
        const matchedProducts = products.filter(p => {
            const sanitizedTitle = sanitizeFolderName(p.title);
            // Also match by product handle directly
            return sanitizedTitle.includes(folder) || folder.includes(sanitizedTitle) || p.handle === folder;
        });

        if (matchedProducts.length === 0) {
            console.log(`   ⚠️  No matching Shopify product found for folder name "${folder}". Skipping.`);
            continue;
        }

        console.log(`   Matches ${matchedProducts.length} product(s) on Shopify: ${matchedProducts.map(p => p.title).join(', ')}`);

        // ── VALIDATION STEP ──────────────────────────────
        const validation = validateMockups(folderPath, folder);
        
        if (validation.warnings.length > 0) {
            console.log('\n   ⚠️  Validation Warnings:');
            validation.warnings.forEach(w => console.log(`      - ${w}`));
            totalWarnings += validation.warnings.length;
        }

        if (validation.tinyFiles.length > 0) {
            console.log(`\n   🚫 ${validation.tinyFiles.length} file(s) are too small (<50KB) and will be SKIPPED:`);
            validation.tinyFiles.forEach(f => console.log(`      - ${f.file} (${f.sizeKB}KB)`));
        }

        if (validation.files.length === 0) {
            console.log(`   ⚠️  No images (.png, .jpg) found in "${folder}".`);
            continue;
        }

        // Show summary
        console.log(`\n   📊 Summary: ${validation.validFiles.length} valid + ${validation.tinyFiles.length} skipped = ${validation.files.length} total`);
        for (const [color, ids] of Object.entries(validation.colorGroups)) {
            console.log(`      ${color}: mockups ${ids.sort().join(', ')}`);
        }

        if (isDryRun) {
            console.log('\n   🔍 [DRY RUN] Would upload the following:');
            for (const fileInfo of validation.validFiles) {
                const altText = parseFilenameToAlt(fileInfo.file);
                for (const product of matchedProducts) {
                    const alreadyExists = (product.images || []).some(img => img.alt && img.alt.trim().toLowerCase() === altText.toLowerCase());
                    if (alreadyExists) {
                        console.log(`      ⏩ "${altText}" → already on "${product.title}"`);
                        totalSkipped++;
                    } else {
                        console.log(`      📤 "${altText}" (${fileInfo.sizeKB}KB) → "${product.title}"`);
                    }
                }
            }
            continue;
        }

        // ── UPLOAD (only valid files) ────────────────────
        for (const fileInfo of validation.validFiles) {
            const filePath = path.join(folderPath, fileInfo.file);
            const fileBuffer = fs.readFileSync(filePath);
            const base64Image = fileBuffer.toString('base64');
            const altText = parseFilenameToAlt(fileInfo.file);

            for (const product of matchedProducts) {
                // Check if this product already has this alt text to avoid duplicates
                const alreadyExists = (product.images || []).some(img => img.alt && img.alt.trim().toLowerCase() === altText.toLowerCase());
                if (alreadyExists) {
                    console.log(`   ⏩ Image "${altText}" already exists on "${product.title}". Skipping.`);
                    totalSkipped++;
                    continue;
                }

                try {
                    await uploadImageToShopify(product.id, base64Image, altText, fileInfo.file);
                    totalUploaded++;
                    await sleep(2000); // 2 seconds delay for Shopify rate limits
                } catch (err) {
                    console.error(`   ❌ Failed to upload ${fileInfo.file} to "${product.title}": ${err.message}`);
                    await sleep(3000);
                }
            }
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (isDryRun) {
        console.log('🔍 DRY RUN COMPLETE — no uploads were performed');
    } else {
        console.log('🎉 Local mockups upload pipeline complete!');
    }
    console.log(`   Uploaded: ${totalUploaded} | Skipped: ${totalSkipped} | Warnings: ${totalWarnings}`);
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
