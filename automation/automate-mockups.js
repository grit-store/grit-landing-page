/**
 * automate-mockups.js
 * 
 * Automates the mockup generation pipeline:
 * 1. Fetches products from Shopify Admin API
 * 2. Identifies products that need mockups (no "{color} 1" alt text pattern)
 * 3. Downloads the Qikink default images as reference
 * 4. Generates 5 mockup images per color using Google AI (Gemini)
 * 5. Uploads generated images to Shopify with correct alt text
 * 
 * Usage: node automate-mockups.js
 */

const https = require('https');
const http = require('http');
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
const GOOGLE_AI_KEY = env.GOOGLE_AI_KEY;
const API_VERSION = '2024-04';

if (!SHOPIFY_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not found in .env. Run: node get-shopify-token.js');
    process.exit(1);
}
if (!GOOGLE_AI_KEY || GOOGLE_AI_KEY === 'PASTE_YOUR_GOOGLE_AI_KEY_HERE') {
    console.error('❌ GOOGLE_AI_KEY not found in .env. Get one from aistudio.google.com');
    process.exit(1);
}

// ── Mockup prompts (replace [COLOR] with actual color) ───
const PROMPTS = [
    {
        id: 1,
        prompt: `Top-down flat lay of two [COLOR] graphic t-shirts neatly laid side by side, left shirt showing front graphic, right shirt showing back graphic, placed on dark charcoal textured surface, dramatic soft lighting from top left, deep shadows, premium minimal aesthetic, high resolution product photography`
    },
    {
        id: 2,
        prompt: `A [COLOR] oversized graphic t-shirt floating and suspended in mid-air, slightly angled for dimension, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography`
    },
    {
        id: 3,
        prompt: `A [COLOR] oversized graphic t-shirt floating and suspended in mid-air, showing back graphic, slightly angled for dimension, natural fabric wrinkles and folds, soft drop shadow beneath, dark charcoal textured surface background, high-end e-commerce style, studio lighting, hyper-realistic product photography`
    },
    {
        id: 4,
        prompt: `Close-up chest shot of a person wearing a [COLOR] oversized graphic t-shirt, focus on the front graphic detail, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution`
    },
    {
        id: 5,
        prompt: `Close-up back shot of a person wearing a [COLOR] oversized graphic t-shirt, focus on the back graphic detail, shallow depth of field, dark charcoal studio background, soft studio lighting, editorial product photography, high resolution`
    }
];

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
    console.log(`   📤 Uploading: ${altText}`);
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

// ── Google AI (Gemini) image generation ──────────────────
function generateMockupImage(referenceImageBase64, prompt) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            contents: [{
                parts: [
                    {
                        text: `Using this t-shirt design as reference, generate a new product photography image. Keep the EXACT same graphic/design on the t-shirt. ${prompt}`
                    },
                    {
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: referenceImageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-3.1-flash-image:generateContent?key=${GOOGLE_AI_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);

                    if (parsed.error) {
                        reject(new Error(`Gemini API error: ${parsed.error.message}`));
                        return;
                    }

                    // Find the image part in the response
                    const candidates = parsed.candidates || [];
                    for (const candidate of candidates) {
                        const parts = candidate.content?.parts || [];
                        for (const part of parts) {
                            if (part.inline_data && part.inline_data.data) {
                                resolve(part.inline_data.data);
                                return;
                            }
                        }
                    }

                    reject(new Error('No image in Gemini response'));
                } catch (e) {
                    reject(new Error(`Failed to parse Gemini response: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ── Image download helper ────────────────────────────────
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

// ── Detect which products need mockups ───────────────────
function needsMockups(product) {
    // Check if any image has the "{color} 1" alt text pattern
    const images = product.images || [];
    const hasNumberedAlt = images.some(img => {
        if (!img.alt) return false;
        return /\b\d+$/.test(img.alt.trim()); // ends with a number like "black 1"
    });
    return !hasNumberedAlt;
}

function getProductColors(product) {
    // Find the Color/Colour option
    const colorOption = (product.options || []).find(opt =>
        opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour'
    );

    if (!colorOption) return [];
    return colorOption.values || [];
}

// ── Sleep helper (for rate limiting) ─────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main pipeline ────────────────────────────────────────
async function main() {
    console.log('🚀 GRIT Mockup Automation');
    console.log('=========================\n');

    // 1. Fetch all products
    const products = await getAllProducts();
    console.log(`   Found ${products.length} products\n`);

    // 2. Filter products that need mockups
    const toProcess = products.filter(needsMockups);

    if (toProcess.length === 0) {
        console.log('✅ All products already have mockups! Nothing to do.\n');
        return;
    }

    console.log(`🎯 ${toProcess.length} product(s) need mockups:\n`);
    toProcess.forEach(p => console.log(`   • ${p.title}`));
    console.log('');

    // 3. Process each product
    for (const product of toProcess) {
        console.log(`\n━━━ Processing: ${product.title} ━━━`);

        const colors = getProductColors(product);
        if (colors.length === 0) {
            console.log('   ⚠️  No color variants found, skipping.');
            continue;
        }

        console.log(`   Colors: ${colors.join(', ')}`);

        // Get the reference image (first/default Qikink image)
        const referenceImage = product.images?.[0];
        if (!referenceImage) {
            console.log('   ⚠️  No images found, skipping.');
            continue;
        }

        console.log(`   📥 Downloading reference image...`);
        const refImageBase64 = await downloadImageAsBase64(referenceImage.src);

        // Generate mockups for each color
        for (const color of colors) {
            console.log(`\n   🎨 Color: ${color}`);

            for (const promptConfig of PROMPTS) {
                const promptText = promptConfig.prompt.replace(/\[COLOR\]/g, color);
                const altText = `${color} ${promptConfig.id}`;
                const filename = `${color.toLowerCase().replace(/\s+/g, '-')}-${promptConfig.id}.jpg`;

                console.log(`   🤖 Generating mockup ${promptConfig.id}/5: "${altText}"...`);

                try {
                    const generatedImageBase64 = await generateMockupImage(refImageBase64, promptText);

                    // Upload to Shopify
                    await uploadImageToShopify(product.id, generatedImageBase64, altText, filename);
                    console.log(`   ✅ "${altText}" uploaded!`);

                    // Rate limit: wait 2 seconds between API calls
                    await sleep(2000);

                } catch (err) {
                    console.error(`   ❌ Failed for "${altText}": ${err.message}`);
                    // Continue with next image instead of stopping
                    await sleep(3000);
                }
            }
        }

        console.log(`\n   ✅ Done: ${product.title}`);
    }

    console.log('\n\n🎉 All mockups generated and uploaded!');
    console.log('   Check your Shopify products to verify the images.\n');
}

// Run it!
main().catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
