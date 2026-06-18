/**
 * generate-instagram-posts.js
 * 
 * Interactive script for Instagram Carousel Post generation:
 * 1. Fetches products from Shopify Admin API.
 * 2. Identifies products that do not have generated posts (no directory in automation-instagram/instagram/[product-handle]).
 * 3. Uses Gemini to analyze product details and suggest 5 themes.
 * 4. Lets the user select a theme and verify parameters.
 * 5. Generates both combined color and single color posts.
 * 6. Generates captions matching the visual theme.
 * 
 * Usage: node generate-instagram-posts.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Load .env ────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found in the script directory.');
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
const MOCKUPS_DIR = path.join(__dirname, '..', 'automation', 'generated_mockups');
const INSTAGRAM_DIR = path.join(__dirname, 'instagram');
const PROMPTS_FILE = path.join(__dirname, 'instagram-prompts.json');

// Ensure instagram output directory exists
if (!fs.existsSync(INSTAGRAM_DIR)) {
    fs.mkdirSync(INSTAGRAM_DIR, { recursive: true });
}

// Prompts DB will be loaded dynamically based on user choice in main()

// ── CLI Question Helper ──────────────────────────────────
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer.trim());
    }));
}

// ── Sleep helper (for rate limiting) ─────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// Gemini API helper functions have been removed to use local image generator.

// ── Mockup Selector Logic ────────────────────────────────
function getBestMockupIndex(slidePrompt) {
    const promptLower = slidePrompt.toLowerCase();
    if (promptLower.includes('flat lay') || promptLower.includes('folded')) {
        return 1; // Flat lay front/back
    }
    if (/\bback\b/.test(promptLower) || promptLower.includes('behind') || promptLower.includes('from behind')) {
        if (promptLower.includes('close-up') || promptLower.includes('detail')) {
            return 5; // Close-up back
        }
        return 3; // Floating back
    }
    if (promptLower.includes('close-up') || promptLower.includes('detail') || promptLower.includes('chest')) {
        return 4; // Close-up front
    }
    // Default to floating front
    return 2;
}

async function getBestMockupImagePath(color, slidePrompt, product) {
    const colorKey = color.toLowerCase().replace(/\s+/g, '_');
    const mockupIndex = getBestMockupIndex(slidePrompt);
    
    // Check if mockup file exists locally (.png or .jpg)
    const pngPath = path.join(MOCKUPS_DIR, `${colorKey}_${mockupIndex}.png`);
    if (fs.existsSync(pngPath)) return pngPath;
    
    const jpgPath = path.join(MOCKUPS_DIR, `${colorKey}_${mockupIndex}.jpg`);
    if (fs.existsSync(jpgPath)) return jpgPath;
    
    // Fallback 1: search for any mockup for this color locally
    for (let i = 1; i <= 5; i++) {
        const altPng = path.join(MOCKUPS_DIR, `${colorKey}_${i}.png`);
        if (fs.existsSync(altPng)) return altPng;
        
        const altJpg = path.join(MOCKUPS_DIR, `${colorKey}_${i}.jpg`);
        if (fs.existsSync(altJpg)) return altJpg;
    }
    
    // Fallback 2: search for any mockup file in the directory that starts with colorKey
    if (fs.existsSync(MOCKUPS_DIR)) {
        const files = fs.readdirSync(MOCKUPS_DIR);
        const matchedFile = files.find(f => f.toLowerCase().startsWith(colorKey));
        if (matchedFile) {
            return path.join(MOCKUPS_DIR, matchedFile);
        }
    }
    
    // Fallback 3: Download image from Shopify matching the color name
    const colorLower = color.toLowerCase();
    const matchedShopifyImage = (product.images || []).find(img => 
        img.alt && img.alt.toLowerCase().includes(colorLower)
    );
    if (matchedShopifyImage) {
        return matchedShopifyImage.src;
    }
    
    // Fallback 4: Download the first product image from Shopify
    const defaultImage = product.images?.[0];
    if (defaultImage) {
        return defaultImage.src;
    }
    
    return null;
}

// ── Theme Suggestion logic ───────────────────────────────
async function suggestThemes(product, themes) {
    console.log('🤖 Suggesting themes from offline database...');
    // Suggest the first 5 themes as suggestions for the UI selection
    return themes.slice(0, 5).map(t => ({
        id: t.id,
        theme: t.theme,
        reason: `Streetwear aesthetic theme from the ${t.genre} category.`
    }));
}

// ── Download Image helper ────────────────────────────────
function downloadImageAsBase64(imageUrl) {
    return new Promise((resolve, reject) => {
        const url = new URL(imageUrl);
        const client = url.protocol === 'https:' ? https : http;

        client.get(imageUrl, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
                downloadImageAsBase64(res.headers.location).then(resolve).catch(reject);
                return;
            }

            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer.toString('base64'));
            });
        }).on('error', reject);
    });
}

// ── Main process loop ────────────────────────────────────
async function main() {
    console.log('🔥 GRIT Instagram Post Generator');
    console.log('================================\n');

    let allThemes = [];
    console.log('Select Prompt Type:');
    console.log('   [1] Model-Based Prompts (instagram-prompts.json)');
    console.log('   [2] Product-Only Graphic Prompts (instagram-product-prompts.json)');
    console.log('');
    
    let dbChoice = null;
    while (!dbChoice) {
        const answer = await askQuestion('Choose prompt type (1-2): ');
        if (answer === '1') {
            const file = path.join(__dirname, 'instagram-prompts.json');
            if (!fs.existsSync(file)) {
                console.error(`❌ Prompts database file not found at ${file}`);
                process.exit(1);
            }
            const db = JSON.parse(fs.readFileSync(file, 'utf-8'));
            allThemes = db.posts;
            dbChoice = 'model';
        } else if (answer === '2') {
            const file = path.join(__dirname, 'instagram-product-prompts.json');
            if (!fs.existsSync(file)) {
                console.error(`❌ Prompts database file not found at ${file}`);
                process.exit(1);
            }
            const db = JSON.parse(fs.readFileSync(file, 'utf-8'));
            allThemes = db.posts;
            dbChoice = 'product';
        } else {
            console.log('❌ Invalid choice. Please enter 1 or 2.');
        }
    }
    console.log(`\n📚 Loaded ${allThemes.length} themes successfully.\n`);

    // 1. Fetch products
    const products = await getAllProducts();
    console.log(`   Found ${products.length} products on Shopify.\n`);

    // 2. Process all products
    const toProcess = products.filter(p => {
        const productDir = path.join(INSTAGRAM_DIR, p.handle);
        return !fs.existsSync(productDir) && p.handle !== 'the-luxury-of-disconnect';
    });

    console.log(`🎯 ${toProcess.length} product(s) need Instagram posts:\n`);
    toProcess.forEach((p, idx) => console.log(`   [${idx + 1}] ${p.title} (${p.handle})`));
    console.log('');

    // Process first product from the list (or we can iterate)
    for (const product of toProcess) {
        console.log(`\n━━━ Current Product: ${product.title} ━━━`);
        
        const colors = getProductColors(product);
        console.log(`   Colors found: ${colors.length > 0 ? colors.join(', ') : 'None'}`);

        // Suggest themes using Gemini
        const suggestions = await suggestThemes(product, allThemes);
        console.log('\n🤖 AI Suggested Themes:');
        suggestions.forEach((s, idx) => {
            console.log(`   [${idx + 1}] Theme #${s.id}: ${s.theme}`);
            console.log(`       Reason: ${s.reason}`);
        });
        console.log('');

        // Get Theme Selection
        let selectedTheme = null;
        while (!selectedTheme) {
            const choice = await askQuestion(`Select a theme ID (1-${allThemes.length}) or enter a suggestion choice (1-5): `);
            const val = parseInt(choice, 10);
            if (val >= 1 && val <= 5) {
                const suggestedId = suggestions[val - 1].id;
                selectedTheme = allThemes.find(t => t.id === suggestedId);
            } else if (val >= 1 && val <= allThemes.length) {
                selectedTheme = allThemes.find(t => t.id === val);
            }

            if (!selectedTheme) {
                console.log(`❌ Invalid input. Please enter a number between 1 and ${allThemes.length}, or a suggestion index 1-5.`);
            }
        }

        console.log(`\nSelected: Theme #${selectedTheme.id} - "${selectedTheme.theme}" (${selectedTheme.genre})`);
        
        let activeColors = [];
        if (colors.length > 0) {
            console.log('\n🎨 Colors available for this product:');
            colors.forEach((c, idx) => console.log(`   [${idx + 1}] ${c}`));
            console.log(`   [${colors.length + 1}] All Colors`);
            
            let selectedColor = null;
            while (!selectedColor) {
                const choice = await askQuestion(`Choose a color to generate for (1-${colors.length + 1}): `);
                const val = parseInt(choice, 10);
                if (val >= 1 && val <= colors.length) {
                    selectedColor = colors[val - 1];
                    activeColors = [selectedColor];
                } else if (val === colors.length + 1) {
                    activeColors = colors;
                    selectedColor = 'All Colors';
                } else {
                    console.log(`❌ Invalid choice. Please select 1 to ${colors.length + 1}.`);
                }
            }
            console.log(`Selected color(s): ${selectedColor}`);
        } else {
            activeColors = ['Default'];
        }

        const confirmGen = await askQuestion(`Proceed with generating carousels for ${activeColors.join(', ')}? (y/n): `);
        if (confirmGen.toLowerCase() !== 'y') {
            console.log('Skipping product generation.');
            continue;
        }

        const productDir = path.join(INSTAGRAM_DIR, product.handle);
        fs.mkdirSync(productDir, { recursive: true });

        const cleanDesc = (product.body_html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // ── 2. GENERATE SINGLE COLOR CAROUSELS ────────────────────
        
        for (const color of activeColors) {
            console.log(`\n🎨 Creating Post Plan for Color: "${color}"...`);
            const colorHandle = color.toLowerCase().replace(/\s+/g, '-');
            const colorDir = path.join(productDir, colorHandle);
            fs.mkdirSync(colorDir, { recursive: true });

            // Build the generation plan
            const plan = {
                product_handle: product.handle,
                product_title: product.title,
                product_description: cleanDesc,
                color: color,
                theme_id: selectedTheme.id,
                theme_name: selectedTheme.theme,
                slides: [],
                caption_prompt: selectedTheme.caption_prompt
                    .replace(/\[COLOR\]/g, color === 'Default' ? '' : color)
                    .replace(/\[PRODUCT_NAME\]/g, product.title)
                    .replace(/\[PRODUCT_DESCRIPTION\]/g, cleanDesc)
            };

            for (let i = 0; i < selectedTheme.slides.length; i++) {
                const slidePrompt = selectedTheme.slides[i];
                const finalPrompt = slidePrompt
                    .replace(/\[COLOR\]/g, color === 'Default' ? '' : color)
                    .replace(/\[PRODUCT_NAME\]/g, product.title)
                    .replace(/\[PRODUCT_DESCRIPTION\]/g, cleanDesc);

                let refPath = null;
                if (color === 'Default') {
                    const referenceImage = product.images?.[0];
                    refPath = referenceImage ? referenceImage.src : null;
                } else {
                    refPath = await getBestMockupImagePath(color, slidePrompt, product);
                }

                plan.slides.push({
                    slide_number: i + 1,
                    prompt: finalPrompt,
                    reference_image_path: refPath
                });
            }

            // Write the plan file
            const planPath = path.join(colorDir, 'generation_plan.json');
            fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf-8');
            console.log(`   📝 Generation plan saved: instagram/${product.handle}/${colorHandle}/generation_plan.json`);
        }

        console.log(`\n🎉 Generation complete for "${product.title}"!`);
        console.log(`   Results saved in: ${productDir}`);
    }

    console.log('\n🏁 All done!');
}

main().catch(err => {
    console.error('\n❌ Fatal error during run:', err);
    process.exit(1);
});
