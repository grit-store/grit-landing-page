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
const LOCAL_MOCKUPS_PARENT_DIR = path.join(__dirname, '..', 'automation', 'local_mockups');
const ZENITSU_MOCKUPS_DIR = path.join(__dirname, '..', 'automation', 'zenitsu_generated_mockups');
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

// Minimum file size (bytes) to be considered a real mockup (not a blank/placeholder)
const MIN_DESIGN_FILE_SIZE = 100 * 1024; // 100KB

/**
 * Classifies mockup files for a given color into Front/Back/Flatlay categories
 * and detects design presence on each side based on file sizes.
 *
 * Returns { hasFrontDesign, hasBackDesign, frontMockups, backMockups, flatLayMockups, allMockups, designMockups, blankMockups }
 */
function analyzeMockupsForColor(mockupDir, colorHandle, colorKey) {
    const frontMockups = [];
    const backMockups = [];
    const flatLayMockups = [];
    const allMockups = [];

    if (!fs.existsSync(mockupDir)) {
        return {
            hasFrontDesign: false,
            hasBackDesign: false,
            frontMockups,
            backMockups,
            flatLayMockups,
            allMockups,
            designMockups: [],
            blankMockups: []
        };
    }

    const files = fs.readdirSync(mockupDir);
    const matchedFiles = [];
    for (const file of files) {
        const lower = file.toLowerCase();
        if (!lower.startsWith(colorHandle) && !lower.startsWith(colorKey)) continue;
        const ext = path.extname(lower);
        if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;

        const fullPath = path.join(mockupDir, file);
        const { size } = fs.statSync(fullPath);
        matchedFiles.push({ path: fullPath, size, filename: file });
    }

    matchedFiles.forEach(item => {
        const name = item.filename.toLowerCase();
        const match = name.match(/[-_]([1-5])\.(png|jpg|jpeg|webp)$/);
        const index = match ? parseInt(match[1], 10) : null;

        allMockups.push(item.path);
        if (index === 1) {
            flatLayMockups.push(item);
        } else if (index === 2 || index === 4) {
            frontMockups.push(item);
        } else if (index === 3 || index === 5) {
            backMockups.push(item);
        } else {
            // default fallback if index isn't 1-5
            frontMockups.push(item);
        }
    });

    const isDesign = item => item.size >= MIN_DESIGN_FILE_SIZE;

    let hasFrontDesign = frontMockups.some(isDesign);
    let hasBackDesign = backMockups.some(isDesign);

    // Fallback: If we only have index 1 mockups (like crop-tank), check if index 1 has design
    if (flatLayMockups.length > 0 && frontMockups.length === 0 && backMockups.length === 0) {
        if (flatLayMockups.some(isDesign)) {
            hasFrontDesign = true;
        }
    }

    const designMockups = matchedFiles.filter(isDesign).map(i => i.path);
    const blankMockups = matchedFiles.filter(i => !isDesign(i)).map(i => i.path);

    return {
        hasFrontDesign,
        hasBackDesign,
        frontMockups: frontMockups.map(i => i.path),
        backMockups: backMockups.map(i => i.path),
        flatLayMockups: flatLayMockups.map(i => i.path),
        allMockups,
        designMockups,
        blankMockups
    };
}

/**
 * Returns true if a slide prompt is asking to "show the design/graphic/print".
 * In that case we must use a design-bearing mockup, not a blank one.
 */
function promptShowsDesign(slidePrompt) {
    const p = slidePrompt.toLowerCase();
    return (
        p.includes('showing the') ||
        p.includes('showing its') ||
        /\bgraphic\b/.test(p) ||
        /\bprint\b/.test(p) ||
        /\bprints\b/.test(p) ||
        /\bartwork\b/.test(p) ||
        /\bdesign\b/.test(p) ||
        /\bdesigns\b/.test(p)
    );
}

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

async function getBestMockupImagePath(color, slidePrompt, product, mockupAnalysis) {
    const colorKey = color.toLowerCase().replace(/\s+/g, '_');
    const colorHandle = color.toLowerCase().replace(/\s+/g, '-');
    let mockupIndex = getBestMockupIndex(slidePrompt);
    const productHandle = product.handle;
    const needsDesign = promptShowsDesign(slidePrompt);

    // 1. Check local standardized mockup directory matching this product handle
    let localProductMockupDir = null;
    if (fs.existsSync(LOCAL_MOCKUPS_PARENT_DIR)) {
        const folders = fs.readdirSync(LOCAL_MOCKUPS_PARENT_DIR);
        const matchedFolder = folders.find(f => {
            const fLower = f.toLowerCase();
            const pLower = productHandle.toLowerCase();
            return fLower === pLower || 
                   fLower.replace(/-[0-9]+$/, '') === pLower.replace(/-[0-9]+$/, '') || 
                   pLower.includes(fLower) || 
                   fLower.includes(pLower);
        });
        if (matchedFolder) {
            localProductMockupDir = path.join(LOCAL_MOCKUPS_PARENT_DIR, matchedFolder);
        }
    }

    if (localProductMockupDir && fs.existsSync(localProductMockupDir)) {
        // Use pre-analyzed mockup lists (passed in) or analyze now
        const analysis = mockupAnalysis || analyzeMockupsForColor(localProductMockupDir, colorHandle, colorKey);
        const { hasFrontDesign, hasBackDesign, frontMockups, backMockups, flatLayMockups, allMockups } = analysis;

        // If the prompt needs to show the design/graphic, make sure we direct it to the correct printed side
        if (needsDesign) {
            if (hasBackDesign && !hasFrontDesign) {
                // Back design only: if slide is requesting a front view, swap to the corresponding back view
                if (mockupIndex === 2 || mockupIndex === 4) {
                    mockupIndex = (mockupIndex === 4) ? 5 : 3;
                }
            } else if (hasFrontDesign && !hasBackDesign) {
                // Front design only: if slide is requesting a back view, swap to the corresponding front view
                if (mockupIndex === 3 || mockupIndex === 5) {
                    mockupIndex = (mockupIndex === 5) ? 4 : 2;
                }
            }
        }

        // Try to find the preferred index mockup
        const preferredByIndex = [
            path.join(localProductMockupDir, `${colorHandle}-${mockupIndex}.png`),
            path.join(localProductMockupDir, `${colorHandle}-${mockupIndex}.jpg`),
            path.join(localProductMockupDir, `${colorKey}_${mockupIndex}.png`),
            path.join(localProductMockupDir, `${colorKey}_${mockupIndex}.jpg`)
        ];

        for (const p of preferredByIndex) {
            if (allMockups.includes(p)) return p;
        }

        // Fallback pools if the specific index file doesn't exist
        if (needsDesign) {
            if (hasBackDesign && !hasFrontDesign) {
                const backPool = backMockups.filter(p => fs.existsSync(p) && fs.statSync(p).size >= MIN_DESIGN_FILE_SIZE);
                if (backPool.length > 0) return backPool[0];
            } else if (hasFrontDesign && !hasBackDesign) {
                const frontPool = frontMockups.filter(p => fs.existsSync(p) && fs.statSync(p).size >= MIN_DESIGN_FILE_SIZE);
                if (frontPool.length > 0) return frontPool[0];
            } else {
                const designPool = allMockups.filter(p => fs.existsSync(p) && fs.statSync(p).size >= MIN_DESIGN_FILE_SIZE);
                if (designPool.length > 0) return designPool[0];
            }
        }

        // Last resort: any mockup for this color
        if (allMockups.length > 0) return allMockups[0];
    }

    // 2. Custom Zenitsu directory (only if the product is actually Zenitsu)
    if (productHandle.includes('zenitsu') && fs.existsSync(ZENITSU_MOCKUPS_DIR)) {
        const checkPaths = [
            path.join(ZENITSU_MOCKUPS_DIR, `${colorHandle}-${mockupIndex}.png`),
            path.join(ZENITSU_MOCKUPS_DIR, `${colorHandle}-${mockupIndex}.jpg`)
        ];
        for (const p of checkPaths) {
            if (fs.existsSync(p)) return p;
        }

        for (let i = 1; i <= 5; i++) {
            const altPaths = [
                path.join(ZENITSU_MOCKUPS_DIR, `${colorHandle}-${i}.png`),
                path.join(ZENITSU_MOCKUPS_DIR, `${colorHandle}-${i}.jpg`)
            ];
            for (const p of altPaths) {
                if (fs.existsSync(p)) return p;
            }
        }
    }

    // 3. Old generated_mockups directory (only if the product is Crop Tank or we're matching colors specifically)
    if ((productHandle.includes('crop') || ['baby_blue', 'light_baby_pink', 'white'].includes(colorKey)) && fs.existsSync(MOCKUPS_DIR)) {
        const checkPaths = [
            path.join(MOCKUPS_DIR, `${colorKey}_${mockupIndex}.png`),
            path.join(MOCKUPS_DIR, `${colorKey}_${mockupIndex}.jpg`)
        ];
        for (const p of checkPaths) {
            if (fs.existsSync(p)) return p;
        }

        for (let i = 1; i <= 5; i++) {
            const altPaths = [
                path.join(MOCKUPS_DIR, `${colorKey}_${i}.png`),
                path.join(MOCKUPS_DIR, `${colorKey}_${i}.jpg`)
            ];
            for (const p of altPaths) {
                if (fs.existsSync(p)) return p;
            }
        }
    }

    // Fallback 4: Download image from Shopify matching the color name
    const colorLower = color.toLowerCase();
    const matchedShopifyImage = (product.images || []).find(img => 
        img.alt && img.alt.toLowerCase().includes(colorLower)
    );
    if (matchedShopifyImage) {
        return matchedShopifyImage.src;
    }
    
    // Fallback 5: Download the first product image from Shopify
    const defaultImage = product.images?.[0];
    if (defaultImage) {
        return defaultImage.src;
    }
    
    return null;
}

// ── Theme Suggestion logic ───────────────────────────────
async function suggestThemes(product, themes) {
    console.log('🤖 Analyzing product details and matching themes...');
    
    const title = (product.title || '').toLowerCase();
    const tags = Array.isArray(product.tags) ? product.tags.map(t => t.toLowerCase()) : [];
    const bodyHtml = (product.body_html || '').toLowerCase();
    const searchString = ` ${title} ${tags.join(' ')} ${bodyHtml} `;

    let preferredGenres = [];
    let reasonTemplate = '';

    // 1. Anime / Pop-Culture Graphic Tees (Zenitsu, Rick's Lineup, etc.)
    if (searchString.includes('anime') || searchString.includes('zenitsu') || searchString.includes('rick') || searchString.includes('lineup')) {
        preferredGenres = ['Urban Night', 'Cultural / Street', 'Moody / Atmospheric'];
        reasonTemplate = 'Matches the high-energy cyber, neon, or street culture aesthetic of your graphic print product.';
    } 
    // 2. Activewear / Crop Tops / Sporty fits (Crop Tank, etc.)
    else if (searchString.includes('crop') || searchString.includes('tank') || searchString.includes('active') || searchString.includes('sports')) {
        preferredGenres = ['Active / Streetwear', 'Minimal Studio', 'Golden / Natural Light'];
        reasonTemplate = 'Complements the activewear, sporty, or minimal styling of your crop/tank top.';
    } 
    // 3. Minimal / Luxury / Premium Essentials (The Luxury of Disconnect, etc.)
    else if (searchString.includes('disconnect') || searchString.includes('luxury') || searchString.includes('minimal')) {
        preferredGenres = ['Minimal Studio', 'Golden / Natural Light', 'Moody / Atmospheric', 'Architectural'];
        reasonTemplate = 'Aligns with the premium, clean, or minimal aesthetic of this product line.';
    } 
    // 4. Default Streetwear Fallback
    else {
        preferredGenres = ['Lifestyle / Context', 'Golden / Natural Light', 'Urban Night'];
        reasonTemplate = 'Selected as a versatile premium streetwear lookbook aesthetic.';
    }

    // Filter themes that belong to the preferred genres
    let matchedThemes = themes.filter(t => preferredGenres.includes(t.genre));

    // If we have fewer than 5 matched themes, fill the rest with other available themes to ensure 5 slots
    if (matchedThemes.length < 5) {
        const remaining = themes.filter(t => !matchedThemes.some(mt => mt.id === t.id));
        matchedThemes = matchedThemes.concat(remaining);
    }

    // Take the top 5 suggested themes
    const finalSuggestions = matchedThemes.slice(0, 5);

    return finalSuggestions.map(t => ({
        id: t.id,
        theme: t.theme,
        reason: `${reasonTemplate} (Genre: ${t.genre})`
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


// ── CLI Argument Parser ──────────────────────────────────
function getArgValue(name) {
    const idx = process.argv.indexOf(name);
    return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

// ── Main process loop ────────────────────────────────────
async function main() {
    console.log('🔥 GRIT Instagram Post Generator');
    console.log('================================\n');

    // ── Parse all CLI arguments ──────────────────────────
    const forceReprocess = process.argv.includes('--force') || process.argv.includes('-f');
    const filterHandle = getArgValue('--handle');
    const cliPromptType = getArgValue('--prompt-type');  // "1" or "2"
    const cliThemeId = getArgValue('--theme');            // theme ID number
    const cliColor = getArgValue('--color');              // color name or "all"
    const autoConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

    // ── 1. Load prompt database ──────────────────────────
    let allThemes = [];
    let dbChoice = null;

    if (cliPromptType === '1' || cliPromptType === '2') {
        // Non-interactive: use CLI arg
        dbChoice = cliPromptType === '1' ? 'model' : 'product';
    } else {
        // Interactive: ask user
        console.log('Select Prompt Type:');
        console.log('   [1] Model-Based Prompts (instagram-prompts.json)');
        console.log('   [2] Product-Only Graphic Prompts (instagram-product-prompts.json)');
        console.log('');
        while (!dbChoice) {
            const answer = await askQuestion('Choose prompt type (1-2): ');
            if (answer === '1') dbChoice = 'model';
            else if (answer === '2') dbChoice = 'product';
            else console.log('❌ Invalid choice. Please enter 1 or 2.');
        }
    }

    const promptFile = dbChoice === 'model'
        ? path.join(__dirname, 'instagram-prompts.json')
        : path.join(__dirname, 'instagram-product-prompts.json');
    
    if (!fs.existsSync(promptFile)) {
        console.error(`❌ Prompts database file not found at ${promptFile}`);
        process.exit(1);
    }
    const db = JSON.parse(fs.readFileSync(promptFile, 'utf-8'));
    allThemes = db.posts;
    console.log(`📚 Loaded ${allThemes.length} themes (${dbChoice === 'model' ? 'Model-Based' : 'Product-Only'}).\n`);

    // ── 2. Fetch products ────────────────────────────────
    const products = await getAllProducts();
    console.log(`   Found ${products.length} products on Shopify.\n`);

    const toProcess = products.filter(p => {
        if (filterHandle && p.handle !== filterHandle) return false;
        const productDir = path.join(INSTAGRAM_DIR, p.handle);
        if (forceReprocess) return p.handle !== 'the-luxury-of-disconnect';
        return !fs.existsSync(productDir) && p.handle !== 'the-luxury-of-disconnect';
    });

    if (toProcess.length === 0) {
        console.log('   ✅ All products already have Instagram posts generated.');
        console.log('   Use --force or -f to re-generate plans for existing products.\n');
        return;
    }

    console.log(`🎯 ${toProcess.length} product(s) to process:\n`);
    toProcess.forEach((p, idx) => console.log(`   [${idx + 1}] ${p.title} (${p.handle})`));
    console.log('');

    // ── 3. Process each product ──────────────────────────
    for (const product of toProcess) {
        console.log(`\n━━━ Current Product: ${product.title} ━━━`);
        
        const colors = getProductColors(product);
        console.log(`   Colors found: ${colors.length > 0 ? colors.join(', ') : 'None'}`);

        // ── Theme Selection ──────────────────────────────
        let selectedTheme = null;

        if (cliThemeId) {
            // Non-interactive: use CLI theme ID
            const themeVal = parseInt(cliThemeId, 10);
            selectedTheme = allThemes.find(t => t.id === themeVal);
            if (!selectedTheme) {
                console.error(`❌ Theme ID ${cliThemeId} not found in loaded themes.`);
                process.exit(1);
            }
        } else {
            // Interactive: show suggestions and ask
            const suggestions = await suggestThemes(product, allThemes);
            console.log('\n🤖 AI Suggested Themes:');
            suggestions.forEach((s, idx) => {
                console.log(`   [${idx + 1}] Theme #${s.id}: ${s.theme}`);
                console.log(`       Reason: ${s.reason}`);
            });
            console.log('');

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
        }

        console.log(`\nSelected: Theme #${selectedTheme.id} - "${selectedTheme.theme}" (${selectedTheme.genre})`);
        
        // ── Color Selection ──────────────────────────────
        let activeColors = [];
        if (colors.length > 0) {
            if (cliColor) {
                // Non-interactive: use CLI color
                if (cliColor.toLowerCase() === 'all') {
                    activeColors = colors;
                    console.log(`Selected color(s): All Colors`);
                } else {
                    const matched = colors.find(c => c.toLowerCase() === cliColor.toLowerCase());
                    if (matched) {
                        activeColors = [matched];
                        console.log(`Selected color(s): ${matched}`);
                    } else {
                        console.error(`❌ Color "${cliColor}" not found. Available: ${colors.join(', ')}`);
                        process.exit(1);
                    }
                }
            } else {
                // Interactive: ask user
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
            }
        } else {
            activeColors = ['Default'];
        }

        // ── Confirmation ─────────────────────────────────
        if (!autoConfirm) {
            const confirmGen = await askQuestion(`Proceed with generating carousels for ${activeColors.join(', ')}? (y/n): `);
            if (confirmGen.toLowerCase() !== 'y') {
                console.log('Skipping product generation.');
                continue;
            }
        } else {
            console.log(`   Auto-confirmed: generating carousels for ${activeColors.join(', ')}`);
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

            // ── Pre-analyze mockups once for this color ───────────────
            const colorKey = colorHandle.replace(/-/g, '_');
            let mockupDir = null;
            if (fs.existsSync(LOCAL_MOCKUPS_PARENT_DIR)) {
                const folders = fs.readdirSync(LOCAL_MOCKUPS_PARENT_DIR);
                const matched = folders.find(f => {
                    const fL = f.toLowerCase(), pH = product.handle.toLowerCase();
                    return fL === pH || fL.replace(/-[0-9]+$/, '') === pH.replace(/-[0-9]+$/, '') ||
                           pH.includes(fL) || fL.includes(pH);
                });
                if (matched) mockupDir = path.join(LOCAL_MOCKUPS_PARENT_DIR, matched);
            }

            const mockupAnalysis = mockupDir
                ? analyzeMockupsForColor(mockupDir, colorHandle, colorKey)
                : { designMockups: [], blankMockups: [], allMockups: [] };

            // ── Print design layout classification ────────────────────
            console.log(`   🔍 Mockup analysis:`);
            console.log(`       - Front design detected: ${mockupAnalysis.hasFrontDesign ? 'YES' : 'NO'}`);
            console.log(`       - Back design detected: ${mockupAnalysis.hasBackDesign ? 'YES' : 'NO'}`);
            console.log(`       - Total design mockups: ${mockupAnalysis.designMockups.length}`);
            console.log(`       - Total blank mockups: ${mockupAnalysis.blankMockups.length}`);
            if (mockupAnalysis.blankMockups.length > 0) {
                console.log(`   ⚠️  Blank mockups detected (will NOT be used for design-showcase slides):`);
                mockupAnalysis.blankMockups.forEach(p => console.log(`       - ${path.basename(p)}`));
            }

            const { hasFrontDesign, hasBackDesign } = mockupAnalysis;

            for (let i = 0; i < selectedTheme.slides.length; i++) {
                const slidePrompt = selectedTheme.slides[i];
                let basePrompt = slidePrompt
                    .replace(/\[COLOR\]/g, color === 'Default' ? '' : color)
                    .replace(/\[PRODUCT_NAME\]/g, product.title)
                    .replace(/\[PRODUCT_DESCRIPTION\]/g, cleanDesc);

                const needsDesign = promptShowsDesign(basePrompt);
                const promptLower = basePrompt.toLowerCase();
                const isBackView = /\bback\b/.test(promptLower) || promptLower.includes('behind') || promptLower.includes('from behind');
                const isFlatLay = promptLower.includes('flat lay') || promptLower.includes('folded');

                // ── 1. Dynamically align/rewrite prompt text if needed ──
                if (needsDesign) {
                    if (hasBackDesign && !hasFrontDesign) {
                        // Back design only: if prompt specifies showing front print/design, change to back view
                        if (promptLower.includes('front') || promptLower.includes('chest')) {
                            console.log(`   🔄 Slide ${i + 1}: Mismatch detected (back design only, prompt asked for front). Rewriting to back view.`);
                            basePrompt = basePrompt
                                .replace(/front design/gi, 'back design')
                                .replace(/front graphic/gi, 'back graphic')
                                .replace(/front print/gi, 'back print')
                                .replace(/chest print/gi, 'back print')
                                .replace(/chest graphic/gi, 'back graphic')
                                .replace(/front/gi, 'back')
                                .replace(/chest/gi, 'back');
                        }
                    } else if (hasFrontDesign && !hasBackDesign) {
                        // Front design only: if prompt specifies showing back print/design, change to front view
                        if (promptLower.includes('back')) {
                            console.log(`   🔄 Slide ${i + 1}: Mismatch detected (front design only, prompt asked for back). Rewriting to front view.`);
                            basePrompt = basePrompt
                                .replace(/back design/gi, 'front design')
                                .replace(/back graphic/gi, 'front graphic')
                                .replace(/back print/gi, 'front print')
                                .replace(/back/gi, 'front');
                        }
                    }
                }

                // Re-evaluate view check after any potential rewriting
                const finalPromptLower = basePrompt.toLowerCase();
                const finalIsBackView = /\bback\b/.test(finalPromptLower) || finalPromptLower.includes('behind') || finalPromptLower.includes('from behind');
                const finalIsFlatLay = finalPromptLower.includes('flat lay') || finalPromptLower.includes('folded');

                // ── 2. Build design-preservation system instruction for this specific slide ──
                let slideDesignInstruction = '';
                if (hasFrontDesign && hasBackDesign) {
                    if (finalIsBackView) {
                        slideDesignInstruction = `CRITICAL: Replicate the BACK design/graphic and text EXACTLY as it appears in the reference image. Same colors, placement, and size. Do NOT show the front design on the back. Do NOT invent or add any other graphics. `;
                    } else if (finalIsFlatLay) {
                        slideDesignInstruction = `CRITICAL: Replicate the design/graphic and text EXACTLY as it appears in the reference image. Same colors, placement, and size. Do NOT invent or add any other graphics. `;
                    } else {
                        slideDesignInstruction = `CRITICAL: Replicate the FRONT design/graphic and text EXACTLY as it appears in the reference image. Same colors, placement, and size. Do NOT show the back design on the front. Do NOT invent or add any other graphics. `;
                    }
                } else if (hasBackDesign && !hasFrontDesign) {
                    if (finalIsBackView || finalIsFlatLay) {
                        slideDesignInstruction = `CRITICAL: Replicate the BACK design/graphic and text EXACTLY as it appears in the reference image. Same colors, placement, and size. Do NOT invent or add any other graphics. `;
                    } else {
                        slideDesignInstruction = `CRITICAL: This shirt has a design ONLY on the BACK. The FRONT is completely plain and blank. You MUST generate a front view of the shirt that is completely blank and plain, with NO graphic, print, text, or logo. Keep the fabric solid and clean. `;
                    }
                } else if (hasFrontDesign && !hasBackDesign) {
                    if (finalIsBackView) {
                        slideDesignInstruction = `CRITICAL: This shirt has a design ONLY on the FRONT. The BACK is completely plain and blank. You MUST generate a back view of the shirt that is completely blank and plain, with NO graphic, print, text, or logo. Keep the fabric solid and clean. `;
                    } else {
                        slideDesignInstruction = `CRITICAL: Replicate the FRONT design/graphic and text EXACTLY as it appears in the reference image. Same colors, placement, and size. Do NOT invent or add any other graphics. `;
                    }
                } else {
                    slideDesignInstruction = `CRITICAL: This t-shirt is completely plain and blank on BOTH the front and the back. Keep the t-shirt completely clean with NO graphics, prints, logos, or text whatsoever. `;
                }

                const finalPrompt = slideDesignInstruction + basePrompt;

                let refPath = null;
                if (color === 'Default') {
                    const referenceImage = product.images?.[0];
                    refPath = referenceImage ? referenceImage.src : null;
                } else {
                    refPath = await getBestMockupImagePath(color, basePrompt, product, mockupAnalysis);
                }

                // If reference image path is a URL (from Shopify fallback), download it locally to the color directory
                if (refPath && (refPath.startsWith('http://') || refPath.startsWith('https://'))) {
                    const parsedUrl = new URL(refPath);
                    const ext = path.extname(parsedUrl.pathname) || '.png';
                    const refFilename = `reference_slide_${i + 1}${ext}`;
                    const localRefPath = path.join(colorDir, refFilename);
                    console.log(`   📥 Downloading reference image for slide ${i + 1}...`);
                    try {
                        await downloadImage(refPath, localRefPath);
                        refPath = localRefPath;
                    } catch (err) {
                        console.error(`   ⚠️ Failed to download reference image: ${err.message}`);
                    }
                }

                // Only override blank mockups if the slide actually needs to showcase the design
                const isBlank = refPath && mockupAnalysis.blankMockups.includes(refPath);
                if (isBlank && needsDesign) {
                    console.log(`   ⚠️  Slide ${i + 1}: assigned mockup is BLANK for a design-showcase slide — overriding with a design mockup`);
                    if (mockupAnalysis.designMockups.length > 0) {
                        refPath = mockupAnalysis.designMockups[0];
                        console.log(`       → Using: ${path.basename(refPath)}`);
                    }
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
