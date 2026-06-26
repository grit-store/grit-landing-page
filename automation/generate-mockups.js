/**
 * generate-mockups.js
 * 
 * Interactive Mockup Generation Planner:
 * 1. Fetches products from Shopify Admin API.
 * 2. Detects new products that don't have mockup configs yet.
 * 3. Asks 2 yes/no questions per new product (front graphic? back graphic?).
 * 4. Downloads raw reference images from Shopify.
 * 5. Generates a generation-plan.json with exact prompts ready for the AI assistant.
 * 6. Tracks generation progress and supports resuming after quota limits.
 * 
 * Usage:
 *   node generate-mockups.js              # Interactive mode — detect new products
 *   node generate-mockups.js --plan-only  # Only generate plan for uncompleted products
 *   node generate-mockups.js --status     # Show generation status for all products
 * 
 * The AI assistant reads generation-plan.json and calls generate_image with the pre-built prompts.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Load .env ────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found in the automation directory.');
    process.exit(1);
}
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

// ── Paths ────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, 'mockup-config.json');
const LOCAL_MOCKUPS_DIR = path.join(__dirname, 'local_mockups');
const RAW_IMAGES_DIR = path.join(__dirname, 'raw_images');
const PLAN_FILE = path.join(__dirname, 'generation-plan.json');

// ── CLI Question Helper ──────────────────────────────────
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer.trim().toLowerCase());
    }));
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

function getProductColors(product) {
    const colorOption = (product.options || []).find(opt =>
        opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour'
    );
    if (!colorOption) return [];
    return colorOption.values || [];
}

// ── Download Image Helper ────────────────────────────────
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

// ── Load/Save Config ─────────────────────────────────────
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
    return {
        version: '1.0',
        description: 'Product mockup generation configuration.',
        products: {}
    };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log('   💾 Config saved to mockup-config.json');
}

// ── Sanitize product title to folder handle ──────────────
function sanitizeHandle(name) {
    return name.toLowerCase()
        .replace(/"/g, '')
        .replace(/'/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ── Prompt Builder ───────────────────────────────────────
// These are the 5 base prompt templates. The function dynamically adjusts
// them based on whether the product has front/back graphics.

function buildPrompts(color, frontHasGraphic, backHasGraphic, productDescription) {
    const prompts = [];

    // ── PROMPT 1: Flat Lay (Front & Back Side-by-Side) ────
    let flatLayFrontDesc, flatLayBackDesc;
    if (frontHasGraphic) {
        flatLayFrontDesc = `left shirt showing the front graphic print`;
    } else {
        flatLayFrontDesc = `left shirt showing a completely PLAIN solid ${color} front with absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind`;
    }
    if (backHasGraphic) {
        flatLayBackDesc = `right shirt showing the back graphic print`;
    } else {
        flatLayBackDesc = `right shirt showing a completely PLAIN solid ${color} back with absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind`;
    }
    prompts.push({
        id: 1,
        name: 'Flat Lay (Front & Back Side-by-Side)',
        prompt: `Top-down flat lay of two ${color} oversized t-shirts neatly laid side by side, ${flatLayFrontDesc}, ${flatLayBackDesc}, placed on dark charcoal textured surface, dramatic soft lighting from top left, deep shadows, premium minimal aesthetic, high resolution product photography`,
        reference_side: frontHasGraphic || backHasGraphic ? (frontHasGraphic ? 'front' : 'back') : 'front',
        view: 'flat_lay'
    });

    // ── PROMPT 2: Floating Front View ────────────────────
    let floatingFrontDesc;
    if (frontHasGraphic) {
        floatingFrontDesc = `A ${color} oversized graphic t-shirt floating and suspended in mid-air, showing the front graphic print from the reference image, slightly angled for dimension`;
    } else {
        floatingFrontDesc = `A ${color} oversized t-shirt floating and suspended in mid-air, showing the front. The front of the t-shirt is COMPLETELY PLAIN — solid ${color} fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Slightly angled for dimension`;
    }
    prompts.push({
        id: 2,
        name: 'Floating Front View',
        prompt: `${floatingFrontDesc}, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography`,
        reference_side: 'front',
        view: 'floating_front'
    });

    // ── PROMPT 3: Floating Back View ─────────────────────
    let floatingBackDesc;
    if (backHasGraphic) {
        floatingBackDesc = `A ${color} oversized graphic t-shirt floating and suspended in mid-air, showing the back graphic print from the reference image, slightly angled for dimension`;
    } else {
        floatingBackDesc = `A ${color} oversized t-shirt floating and suspended in mid-air, showing the back. The back of the t-shirt is COMPLETELY PLAIN — solid ${color} fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Slightly angled for dimension`;
    }
    prompts.push({
        id: 3,
        name: 'Floating Back View',
        prompt: `${floatingBackDesc}, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography`,
        reference_side: 'back',
        view: 'floating_back'
    });

    // ── PROMPT 4: Close-up Front View (Chest Shot) ───────
    let closeupFrontDesc;
    if (frontHasGraphic) {
        closeupFrontDesc = `Close-up chest shot of a person wearing a ${color} oversized graphic t-shirt, showing the front graphic print from the reference image, focus on the front graphic detail`;
    } else {
        closeupFrontDesc = `Close-up chest shot of a person wearing a ${color} oversized t-shirt. The front of the t-shirt is COMPLETELY PLAIN — solid ${color} fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Focus on the fabric texture, crewneck collar and shoulder stitching`;
    }
    prompts.push({
        id: 4,
        name: 'Close-up Front View (Chest Shot)',
        prompt: `${closeupFrontDesc}, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution`,
        reference_side: 'front',
        view: 'closeup_front'
    });

    // ── PROMPT 5: Close-up Back View ─────────────────────
    let closeupBackDesc;
    if (backHasGraphic) {
        closeupBackDesc = `Close-up back shot of a person wearing a ${color} oversized graphic t-shirt, showing the back graphic print from the reference image, focus on the back graphic detail`;
    } else {
        closeupBackDesc = `Close-up back shot of a person wearing a ${color} oversized t-shirt. The back of the t-shirt is COMPLETELY PLAIN — solid ${color} fabric only, absolutely NO graphics, NO text, NO logos, NO prints, NO designs of any kind. Focus on the fabric texture and stitching`;
    }
    prompts.push({
        id: 5,
        name: 'Close-up Back View',
        prompt: `${closeupBackDesc}, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution`,
        reference_side: 'back',
        view: 'closeup_back'
    });

    return prompts;
}

// ── Download raw reference images from Shopify ───────────
async function downloadRawImages(product, productHandle) {
    const rawDir = path.join(RAW_IMAGES_DIR, productHandle);
    if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
    }

    console.log(`   📥 Downloading raw images for "${product.title}"...`);
    
    const downloadedImages = [];
    for (const img of (product.images || [])) {
        // Skip size charts
        if (img.alt && img.alt.toLowerCase().includes('chart')) continue;
        
        const altText = img.alt || `image_${img.id}`;
        const ext = path.extname(new URL(img.src).pathname) || '.jpg';
        const filename = altText.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_') + ext;
        const dest = path.join(rawDir, filename);
        
        if (!fs.existsSync(dest)) {
            try {
                await downloadImage(img.src, dest);
                console.log(`      ✅ Downloaded: ${filename}`);
            } catch (err) {
                console.error(`      ❌ Failed to download ${filename}: ${err.message}`);
            }
        } else {
            console.log(`      ⏩ Already exists: ${filename}`);
        }
        
        downloadedImages.push({
            alt: altText,
            filename: filename,
            path: dest,
            src: img.src
        });
    }
    
    return downloadedImages;
}

// ── Identify front/back reference images ─────────────────
function findReferenceImages(downloadedImages, colorDisplayName) {
    const colorLower = colorDisplayName.toLowerCase();
    
    // Try to find front and back images for this color
    let frontImage = null;
    let backImage = null;
    
    for (const img of downloadedImages) {
        const altLower = (img.alt || '').toLowerCase();
        
        // Match by color name in alt text
        if (altLower.includes(colorLower)) {
            // Check if it's a front or back image
            if (altLower.includes('front') || altLower.includes('1')) {
                if (!frontImage) frontImage = img;
            }
            if (altLower.includes('back') || altLower.includes('2')) {
                if (!backImage) backImage = img;
            }
        }
    }
    
    // Fallback: try matching by Shopify's standard naming (Front_1_c_X, Back_2_c_X)
    if (!frontImage) {
        frontImage = downloadedImages.find(img => {
            const altLower = (img.alt || '').toLowerCase();
            return altLower.startsWith('front') && altLower.includes(colorLower);
        });
    }
    if (!backImage) {
        backImage = downloadedImages.find(img => {
            const altLower = (img.alt || '').toLowerCase();
            return altLower.startsWith('back') && altLower.includes(colorLower);
        });
    }

    // If still no match, try finding by color code in filename
    // (e.g., Front_1_c_8 for Bottle Green)
    if (!frontImage) {
        frontImage = downloadedImages.find(img =>
            (img.alt || '').toLowerCase().includes('front')
        );
    }
    if (!backImage) {
        backImage = downloadedImages.find(img =>
            (img.alt || '').toLowerCase().includes('back')
        );
    }

    return { frontImage, backImage };
}

// ── Show generation status ───────────────────────────────
function showStatus(config) {
    console.log('\n📊 Mockup Generation Status\n');
    const products = config.products || {};
    
    if (Object.keys(products).length === 0) {
        console.log('   No products configured yet.\n');
        return;
    }
    
    for (const [handle, product] of Object.entries(products)) {
        const status = product.generation_status || 'pending';
        const statusIcon = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : '⏳';
        const colorCount = Object.keys(product.colors || {}).length;
        const frontBack = `Front: ${product.front_has_graphic ? '🎨 Graphic' : '⬜ Plain'} | Back: ${product.back_has_graphic ? '🎨 Graphic' : '⬜ Plain'}`;
        
        console.log(`   ${statusIcon} ${product.shopify_title}`);
        console.log(`      Handle: ${handle}`);
        console.log(`      ${frontBack}`);
        console.log(`      Colors: ${colorCount} (${Object.keys(product.colors || {}).join(', ')})`);
        console.log(`      Status: ${status}`);
        
        // Check local mockup files
        const mockupDir = path.join(LOCAL_MOCKUPS_DIR, handle);
        if (fs.existsSync(mockupDir)) {
            const files = fs.readdirSync(mockupDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
            const expectedCount = colorCount * 5;
            const validFiles = files.filter(f => {
                const size = fs.statSync(path.join(mockupDir, f)).size;
                return size > 50 * 1024; // > 50KB
            });
            const tinyFiles = files.filter(f => {
                const size = fs.statSync(path.join(mockupDir, f)).size;
                return size <= 50 * 1024;
            });
            
            console.log(`      Mockups: ${files.length}/${expectedCount} files`);
            if (validFiles.length !== files.length) {
                console.log(`      ⚠️  ${tinyFiles.length} file(s) are suspiciously small (<50KB) — likely raw copies, not generated mockups:`);
                tinyFiles.forEach(f => {
                    const size = fs.statSync(path.join(mockupDir, f)).size;
                    console.log(`         - ${f} (${(size / 1024).toFixed(1)}KB)`);
                });
            }
        } else {
            console.log(`      Mockups: No folder found`);
        }
        console.log('');
    }
}

// ── Main ─────────────────────────────────────────────────
async function main() {
    console.log('🎨 GRIT Mockup Generation Planner');
    console.log('==================================\n');
    
    const args = process.argv.slice(2);
    const config = loadConfig();
    
    // --status mode
    if (args.includes('--status')) {
        showStatus(config);
        return;
    }
    
    // 1. Fetch all products from Shopify
    const products = await getAllProducts();
    console.log(`   Found ${products.length} products on Shopify.\n`);
    
    // 2. Identify products that need mockup config
    const existingHandles = Object.keys(config.products || {});
    const newProducts = products.filter(p => {
        const handle = p.handle || sanitizeHandle(p.title);
        return !existingHandles.includes(handle);
    });
    
    // 3. For new products, ask about graphic placement
    if (newProducts.length > 0) {
        console.log(`🆕 Found ${newProducts.length} new product(s) not in config:\n`);
        
        for (const product of newProducts) {
            const handle = product.handle || sanitizeHandle(product.title);
            const colors = getProductColors(product);
            
            console.log(`━━━ ${product.title} ━━━`);
            console.log(`   Handle: ${handle}`);
            console.log(`   Colors: ${colors.length > 0 ? colors.join(', ') : 'None'}`);
            console.log(`   Images on Shopify: ${(product.images || []).length}`);
            console.log('');
            
            const shouldConfigure = await askQuestion(`   Configure mockups for "${product.title}"? (y/n): `);
            if (shouldConfigure !== 'y') {
                console.log('   ⏩ Skipping.\n');
                continue;
            }
            
            const frontGraphic = await askQuestion('   ❓ Does this product have a FRONT graphic/print? (y/n): ');
            const backGraphic = await askQuestion('   ❓ Does this product have a BACK graphic/print? (y/n): ');
            
            const frontHasGraphic = frontGraphic === 'y';
            const backHasGraphic = backGraphic === 'y';
            
            // Build color config
            const colorConfig = {};
            for (const color of colors) {
                const colorHandle = color.toLowerCase().replace(/\s+/g, '-');
                colorConfig[colorHandle] = {
                    display_name: color,
                    shopify_color_code: null
                };
            }
            
            // Save to config
            config.products[handle] = {
                shopify_title: product.title,
                front_has_graphic: frontHasGraphic,
                back_has_graphic: backHasGraphic,
                product_description: (product.body_html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200),
                colors: colorConfig,
                generation_status: 'pending'
            };
            
            console.log(`   ✅ Configured: Front ${frontHasGraphic ? '🎨 Graphic' : '⬜ Plain'} | Back ${backHasGraphic ? '🎨 Graphic' : '⬜ Plain'}`);
            console.log('');
        }
        
        saveConfig(config);
    } else {
        console.log('   ✅ All Shopify products are already in config.\n');
    }
    
    // 4. Identify products needing mockup generation
    const pendingProducts = Object.entries(config.products)
        .filter(([handle, productConfig]) => {
            if (args.includes('--plan-only') && productConfig.generation_status === 'completed') {
                return false;
            }
            // Check if local mockups exist and are valid
            const mockupDir = path.join(LOCAL_MOCKUPS_DIR, handle);
            if (!fs.existsSync(mockupDir)) return true;
            
            const colorCount = Object.keys(productConfig.colors || {}).length;
            const expectedCount = colorCount * 5;
            const files = fs.readdirSync(mockupDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
            
            // Check for small files (likely raw copies, not generated mockups)
            const validFiles = files.filter(f => {
                const size = fs.statSync(path.join(mockupDir, f)).size;
                return size > 50 * 1024;
            });
            
            return validFiles.length < expectedCount;
        });
    
    if (pendingProducts.length === 0) {
        console.log('   ✅ All products have complete mockup sets.\n');
        showStatus(config);
        return;
    }
    
    console.log(`\n🎯 ${pendingProducts.length} product(s) need mockup generation:\n`);
    pendingProducts.forEach(([handle, p]) => console.log(`   - ${p.shopify_title} (${handle})`));
    console.log('');
    
    // 5. Generate plan for each pending product
    const generationPlan = {
        created_at: new Date().toISOString(),
        description: 'Mockup generation plan. The AI assistant should read this file and call generate_image with the exact prompts below.',
        instructions: [
            'For each mockup entry below, call the generate_image tool with:',
            '  - Prompt: use the "prompt" field exactly as written',
            '  - ImagePaths: use the "reference_image" field (if it exists and the file is available)',
            '  - ImageName: use the "output_filename" field (without extension)',
            'After generating, copy the output to the "output_path" location.',
            'Mark mockups as done by checking file existence and size (>50KB).'
        ],
        products: {}
    };
    
    for (const [handle, productConfig] of pendingProducts) {
        console.log(`\n━━━ Generating plan for: ${productConfig.shopify_title} ━━━`);
        
        // Find the Shopify product to download raw images
        const shopifyProduct = products.find(p => {
            const pHandle = p.handle || sanitizeHandle(p.title);
            return pHandle === handle;
        });
        
        let downloadedImages = [];
        if (shopifyProduct) {
            downloadedImages = await downloadRawImages(shopifyProduct, handle);
        }
        
        // Ensure local mockups directory exists
        const mockupDir = path.join(LOCAL_MOCKUPS_DIR, handle);
        if (!fs.existsSync(mockupDir)) {
            fs.mkdirSync(mockupDir, { recursive: true });
        }
        
        const productPlan = {
            shopify_title: productConfig.shopify_title,
            front_has_graphic: productConfig.front_has_graphic,
            back_has_graphic: productConfig.back_has_graphic,
            mockups: []
        };
        
        for (const [colorHandle, colorInfo] of Object.entries(productConfig.colors)) {
            const colorName = colorInfo.display_name;
            console.log(`   🎨 Planning mockups for color: ${colorName}`);
            
            // Find reference images for this color
            const { frontImage, backImage } = findReferenceImages(downloadedImages, colorName);
            
            // Build prompts
            const promptList = buildPrompts(
                colorName,
                productConfig.front_has_graphic,
                productConfig.back_has_graphic,
                productConfig.product_description
            );
            
            for (const promptItem of promptList) {
                const outputFilename = `${colorHandle}-${promptItem.id}`;
                const outputPath = path.join(mockupDir, `${outputFilename}.png`);
                
                // Check if this mockup already exists and is valid
                if (fs.existsSync(outputPath)) {
                    const size = fs.statSync(outputPath).size;
                    if (size > 50 * 1024) {
                        console.log(`      ⏩ ${outputFilename}.png already exists (${(size / 1024).toFixed(0)}KB)`);
                        continue;
                    } else {
                        console.log(`      ⚠️  ${outputFilename}.png exists but is only ${(size / 1024).toFixed(1)}KB — needs regeneration`);
                    }
                }
                
                // Determine which reference image to use
                let referenceImage = null;
                if (promptItem.reference_side === 'front' && frontImage) {
                    referenceImage = frontImage.path;
                } else if (promptItem.reference_side === 'back' && backImage) {
                    referenceImage = backImage.path;
                } else if (frontImage) {
                    referenceImage = frontImage.path;
                } else if (backImage) {
                    referenceImage = backImage.path;
                }
                // Fallback to Shopify URL if local file doesn't exist
                if (referenceImage && !fs.existsSync(referenceImage)) {
                    const imgObj = promptItem.reference_side === 'front' ? frontImage : backImage;
                    if (imgObj) referenceImage = imgObj.src;
                }
                
                productPlan.mockups.push({
                    color: colorName,
                    color_handle: colorHandle,
                    mockup_id: promptItem.id,
                    mockup_name: promptItem.name,
                    view: promptItem.view,
                    prompt: promptItem.prompt,
                    reference_image: referenceImage,
                    reference_side: promptItem.reference_side,
                    output_filename: outputFilename,
                    output_path: outputPath,
                    status: 'pending'
                });
                
                console.log(`      📝 Planned: ${outputFilename} (${promptItem.name})`);
            }
        }
        
        generationPlan.products[handle] = productPlan;
    }
    
    // 6. Save the generation plan
    fs.writeFileSync(PLAN_FILE, JSON.stringify(generationPlan, null, 2), 'utf-8');
    console.log(`\n✅ Generation plan saved to: generation-plan.json`);
    console.log(`   Total mockups to generate: ${Object.values(generationPlan.products).reduce((sum, p) => sum + p.mockups.length, 0)}`);
    console.log('\n📋 Next step: Tell the AI assistant to "run the mockups using generation-plan.json"');
    console.log('   The assistant will read this file and call generate_image with the exact prompts.\n');
}

main().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
