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

// Firebase db (initialized in reviews.js)
let db = null;
