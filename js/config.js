// ============ SHOPIFY CLIENT & GLOBAL STATE ============
// All these variables are global so every other JS file can access them.

const SHOPIFY_DOMAIN = 'grit-real.myshopify.com';
const STOREFRONT_TOKEN = '876d4d48bd342fa15609c3a55aa20c29';

let shopifyClient = null;
try {
    if (typeof ShopifyBuy !== 'undefined') {
        shopifyClient = ShopifyBuy.buildClient({
            domain: SHOPIFY_DOMAIN,
            storefrontAccessToken: STOREFRONT_TOKEN
        });
    }
} catch (e) {
    console.warn('Shopify SDK failed to initialize:', e);
}

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBQuAe_7L1vnsY0beKnDE4Ed-B1-zxHvYU",
    authDomain: "grit-store-37ece.firebaseapp.com",
    projectId: "grit-store-37ece",
    storageBucket: "grit-store-37ece.firebasestorage.app",
    messagingSenderId: "1055253240069",
    appId: "1:1055253240069:web:25ec6ae34201fd8f9bbf6c"
};

// Google Analytics ID
const GA_ID = 'G-484DQLD9NW';

// WhatsApp Support Config (Change to your business number!)
const WHATSAPP_PHONE = '919999999999';

// Anti-Bot & Anti-Bulk Order Limits
const MAX_CART_LIMIT_PER_ITEM = 5;

// Product & Collection State
let products = [];
let collections = [];
let currentCollectionProducts = [];

// Cart State
let cart = JSON.parse(localStorage.getItem('cart')) || [];
cart = cart.filter(item => item.shopifyVariantId); // remove old mock items
localStorage.setItem('cart', JSON.stringify(cart));

// Wishlist State
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

// Firebase db (initialized in reviews.js or dynamically)
let db = null;

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${url}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') return resolve();
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.dataset.loaded = 'false';
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => {
            reject(new Error(`Failed to load script: ${url}`));
        };
        document.head.appendChild(script);
    });
}

async function ensureFirebase() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        return db;
    }
    try {
        await loadScript("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore-compat.js");
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            return db;
        }
    } catch (e) {
        console.warn("Failed to dynamically load Firebase:", e);
    }
    return null;
}
