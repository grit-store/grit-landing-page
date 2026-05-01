// Shopify Initialization
let shopifyClient = null;
try {
    if (typeof ShopifyBuy !== 'undefined') {
        shopifyClient = ShopifyBuy.buildClient({
            domain: 'grit-real.myshopify.com',
            storefrontAccessToken: '876d4d48bd342fa15609c3a55aa20c29'
        });
    }
} catch (e) {
    console.warn('Shopify SDK failed to initialize:', e);
}

// State
let products = [];
let collections = []; // Shopify collections (Men, Women, Kids, etc.)
let currentCollectionProducts = []; // Base product list for the active collection page

// Cart State
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Wishlist State
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

// Auto-remove any old mock products (which lack a shopifyVariantId)
const originalLength = cart.length;
cart = cart.filter(item => item.shopifyVariantId);
if (cart.length !== originalLength) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartToggle = document.getElementById('cart-toggle');
const closeCartBtn = document.getElementById('close-cart');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartCountElements = document.querySelectorAll('.cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');

// Initialize
function init() {
    fetchShopifyProducts();
    setupEventListeners();
    updateCartUI();
    updateWishlistUI();
    initGSAPAnimations();
    initCustomCursor();
    initHeroSlideshow();
    initDragonVideo();
    initSearch();
    initCategoryFilter();
    initInteractiveBackground();

    // Account Status
    initUserStatus();

    // Newsletter
    initNewsletter();

    // Analytics
    initAnalytics();

    // Collection page
    if (window.location.pathname.includes('collection.html')) {
        loadCollectionPage();
    }
}

// User Status Initialization
function initUserStatus() {
    const accountLink = document.getElementById('account-link');
    if (accountLink && typeof auth !== 'undefined') {
        if (auth.isLoggedIn()) {
            accountLink.href = 'account.html';
            // Optional: change icon color or show tooltip
            accountLink.style.color = 'var(--color-primary)';
        } else {
            accountLink.href = 'login.html';
        }
    }
}

// Fetch products from Shopify
async function fetchShopifyProducts() {
    if (!shopifyClient) {
        console.warn('Shopify client not available. Skipping product fetch.');
        return;
    }
    try {
        const shopifyProducts = await shopifyClient.product.fetchAll();

        // Let's log exactly what Shopify is sending to the website
        console.log("RAW SHOPIFY API RESPONSE:", shopifyProducts);

        // Image Optimization Helper
        const optimizeSrc = (src) => src ? src + (src.includes('?') ? '&' : '?') + 'width=1200&format=webp' : '';

        // Map Shopify format to our local format SAFELY
        products = shopifyProducts.reduce((validProducts, p) => {
            try {
                // Skip products that don't have variants or valid prices
                if (!p.variants || p.variants.length === 0) return validProducts;

                validProducts.push({
                    id: p.id,
                    title: p.title,
                    vendor: p.vendor || '',
                    tags: p.tags || [],
                    category: p.productType || 'Uncategorized',
                    price: parseFloat(p.variants[0].price.amount || 0),
                    image: p.images && p.images.length > 0 ? optimizeSrc(p.images[0].src) : '',
                    images: p.images ? p.images.map(img => ({ src: optimizeSrc(img.src), alt: img.altText || '' })) : [],
                    description: p.descriptionHtml || p.description || 'No description available.',
                    shopifyVariantId: p.variants[0].id, // Crucial for checkout
                    options: p.options, // Save Size/Color options
                    variants: p.variants // Save the specific combinations
                });
            } catch (mappingError) {
                console.error("Skipped a product due to corrupted data in Shopify:", p.title, mappingError);
            }
            return validProducts;
        }, []);

        // Also fetch all Shopify Collections (Men, Women, Kids, Original, etc.)
        try {
            const shopifyCollections = await shopifyClient.collection.fetchAllWithProducts();
            console.log("SHOPIFY COLLECTIONS:", shopifyCollections);
            collections = shopifyCollections.map(c => ({
                id: c.id,
                title: c.title,
                handle: c.handle || c.title.toLowerCase(),
                productIds: c.products ? c.products.map(p => p.id) : []
            }));
        } catch (collectionError) {
            console.warn("Could not fetch collections (will fall back to tag/type filtering):", collectionError);
        }

        if (document.getElementById('product-grid')) {
            renderProducts();

            // Dynamic Hero Slideshow: Pull 'model' images from Shopify
            const heroSlideshow = document.querySelector('.hero-image-container.slideshow');
            if (heroSlideshow) {
                const modelData = [];
                products.forEach(p => {
                    p.images.forEach(img => {
                        if (img.alt && img.alt.toLowerCase().includes('model')) {
                            modelData.push({ src: img.src, productId: p.id });
                        }
                    });
                });

                // Inject real model shots from Shopify into the slideshow
                if (modelData.length > 0) {
                    const limitedModelData = modelData.slice(0, 4);

                    // Remove any existing slide images without deleting the vertical text overlay
                    heroSlideshow.querySelectorAll('.hero-slide').forEach(img => img.remove());

                    limitedModelData.forEach((item, idx) => {
                        const imgEl = document.createElement('img');
                        imgEl.src = item.src;
                        imgEl.className = idx === 0 ? 'hero-slide active' : 'hero-slide';
                        imgEl.alt = 'GRIT Model';

                        // Add click redirect to the specific product
                        imgEl.style.cursor = 'pointer';
                        imgEl.addEventListener('click', () => {
                            window.location.href = `product.html?id=${encodeURIComponent(item.productId)}`;
                        });

                        // Insert behind the vertical text in correct order
                        const textOverlay = heroSlideshow.querySelector('.hero-vertical-text');
                        if (textOverlay) {
                            heroSlideshow.insertBefore(imgEl, textOverlay);
                        } else {
                            heroSlideshow.appendChild(imgEl);
                        }
                    });
                    initHeroSlideshow(); // Restart slideshow
                }
            }
        }

        // If on product detail page, load the detail
        if (window.location.pathname.includes('product.html')) {
            loadProductDetail();
        }

        // If on collection page, render filtered products
        if (window.location.pathname.includes('collection.html')) {
            loadCollectionPage();
        }

        // Initialize GSAP after DOM is populated
        setTimeout(() => {
            initGSAPAnimations();
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        }, 100);

    } catch (error) {
        console.error("Error fetching products from Shopify:", error);
        if (document.getElementById('product-grid')) {
            document.getElementById('product-grid').innerHTML = '<p>Error loading products. Please refresh.</p>';
        }
    }
}

// Render Products to DOM
function renderProducts(productList = null, targetGrid = null) {
    const grid = targetGrid || productGrid;
    if (!grid) return;
    const list = productList || products;
    grid.innerHTML = '';
    if (list.length === 0) {
        grid.innerHTML = '<p style="color:var(--color-text-light);text-align:center;grid-column:1/-1;padding:3rem">No products found in this category.</p>';
        return;
    }
    list.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card reveal';
        productCard.innerHTML = `
            <div class="product-image-wrapper">
                <a href="product.html?id=${product.id}">
                    <img src="${product.image}" alt="${product.title}" class="product-image product-image-primary" loading="lazy" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22500%22 viewBox=%220 0 400 500%22%3E%3Crect width=%22400%22 height=%22500%22 fill=%22%23f0f0f0%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22sans-serif%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22%23999%22%3EImage Placeholder%3C/text%3E%3C/svg%3E'">
                    ${product.images && product.images.length > 1 ? `<img src="${product.images[1].src}" alt="${product.title} Alternate" class="product-image product-image-secondary" loading="lazy">` : ''}
                </a>
                <div class="product-actions">
                    <button class="btn btn-primary w-100 add-to-cart-btn magnetic" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
            <div class="product-info">
                <div>
                    <a href="product.html?id=${product.id}">
                        <h3 class="product-title">${product.title}</h3>
                    </a>
                    <p class="product-category">${product.category}</p>
                </div>
                <div class="product-price">₹${product.price.toFixed(2)}</div>
            </div>
        `;
        grid.appendChild(productCard);
    });

    // Attach event listeners to new buttons
    const addButtons = document.querySelectorAll('.add-to-cart-btn');
    addButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            addToCart(productId);
        });
    });

    // Animate newly added cards immediately
    if (typeof gsap !== 'undefined') {
        gsap.to('.product-card', {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.05,
            ease: "power2.out",
            onComplete: () => {
                document.querySelectorAll('.product-card').forEach(el => el.classList.remove('reveal'));
            }
        });
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }
}

// Add Item to Cart
function addToCart(productId, specificVariantId = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const targetVariantId = specificVariantId || product.shopifyVariantId;
    const existingItem = cart.find(item => item.shopifyVariantId === targetVariantId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        const variant = product.variants ? product.variants.find(v => v.id === targetVariantId) : null;
        let cartTitle = product.title;
        let cartPrice = product.price;
        let cartImage = product.image;

        if (variant && variant.title && variant.title !== 'Default Title') {
            cartTitle = `${product.title} - ${variant.title.replace(' / ', ', ')}`;
            cartPrice = parseFloat(variant.price.amount);
            if (variant.image) cartImage = variant.image.src;
        }

        cart.push({
            id: productId + '-' + targetVariantId,
            productId: product.id,
            title: cartTitle,
            category: product.category,
            price: cartPrice,
            image: cartImage,
            shopifyVariantId: targetVariantId,
            quantity: 1
        });
    }

    // GA4 Tracking
    if (typeof gtag === 'function') {
        gtag('event', 'add_to_cart', {
            currency: 'INR',
            value: product.price,
            items: [{ item_id: product.id, item_name: product.title, price: product.price, quantity: 1 }]
        });
    }

    saveCart();
    updateCartUI();
    openCart();
}

// Remove Item from Cart completely
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

// Update Item Quantity
function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
        saveCart();
        updateCartUI();
    }
}

// Save Cart to Local Storage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Update Cart UI
function updateCartUI() {
    // Update count
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCountElements.forEach(el => el.textContent = totalItems);

    const shippingThreshold = 5000;
    const shippingMsg = document.getElementById('shipping-message');
    const shippingFill = document.getElementById('shipping-bar-fill');

    // Update items list
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is currently empty.</p>';
        cartTotalPrice.textContent = '₹0.00';

        if (shippingMsg && shippingFill) {
            shippingMsg.textContent = `Add ₹${shippingThreshold.toLocaleString('en-IN')} to unlock free shipping.`;
            shippingFill.style.width = "0%";
        }
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="cart-item-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%22100%22 viewBox=%220 0 80 100%22%3E%3Crect width=%2280%22 height=%22100%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E'">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.title}</h4>
                <p class="cart-item-price">₹${item.price.toFixed(2)}</p>
                <div class="cart-item-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn decrease-qty" data-id="${item.id}">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn increase-qty" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}">Remove</button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });

    // Update total price
    cartTotalPrice.textContent = '₹' + total.toFixed(2);

    // Update shipping progress
    if (shippingMsg && shippingFill) {
        if (total >= shippingThreshold) {
            shippingMsg.textContent = "You've unlocked free shipping!";
            shippingFill.style.width = "100%";
        } else {
            const remaining = shippingThreshold - total;
            shippingMsg.textContent = `Add ₹${remaining.toFixed(2)} to unlock free shipping.`;
            const percentage = (total / shippingThreshold) * 100;
            shippingFill.style.width = `${percentage}%`;
        }
    }

    // Attach listeners
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => removeFromCart(e.target.dataset.id));
    });
    document.querySelectorAll('.increase-qty').forEach(btn => {
        btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.id, 1));
    });
    document.querySelectorAll('.decrease-qty').forEach(btn => {
        btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.id, -1));
    });
}

// Cart Toggle Logic
function openCart() {
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeCart() {
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Event Listeners Setup
function setupEventListeners() {
    if (cartToggle) cartToggle.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);

    // Wishlist
    const wishlistToggle = document.getElementById('wishlist-toggle');
    const closeWishlistBtn = document.getElementById('close-wishlist');
    const wishlistOverlay = document.getElementById('wishlist-overlay');
    if (wishlistToggle) wishlistToggle.addEventListener('click', () => {
        if (wishlistOverlay) wishlistOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    if (closeWishlistBtn) closeWishlistBtn.addEventListener('click', () => {
        if (wishlistOverlay) wishlistOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    if (wishlistOverlay) wishlistOverlay.addEventListener('click', (e) => {
        if (e.target === wishlistOverlay) {
            wishlistOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close cart when clicking outside drawer
    if (cartOverlay) {
        cartOverlay.addEventListener('click', (e) => {
            if (e.target === cartOverlay) {
                closeCart();
            }
        });
    }

    // Navbar scroll behavior (hide on scroll down, show on scroll up)
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            // Darken background if not at top
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            // Hide if scrolling down past 150px
            if (window.scrollY > lastScrollY && window.scrollY > 150) {
                navbar.classList.add('hidden');
            } else {
                navbar.classList.remove('hidden');
            }
            lastScrollY = window.scrollY;
        });
    }

    // Checkout Button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', proceedToShopifyCheckout);
    }

    // Handle hash changes for smooth scrolling
    window.addEventListener('hashchange', scrollToHash);
}

function scrollToHash() {
    if (window.location.hash) {
        setTimeout(() => {
            const target = document.querySelector(window.location.hash);
            if (target) {
                // Scroll with offset for navbar
                const y = target.getBoundingClientRect().top + window.scrollY - 120;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 100);
    }
}

// Proceed to Shopify Checkout
async function proceedToShopifyCheckout() {
    if (cart.length === 0) return alert('Your cart is empty.');

    const checkoutBtn = document.getElementById('checkout-btn');
    const originalText = checkoutBtn ? checkoutBtn.textContent : 'Checkout';
    if (checkoutBtn) {
        checkoutBtn.textContent = 'Loading Secure Checkout...';
        checkoutBtn.disabled = true;
    }

    try {
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        // GA4 Tracking
        if (typeof gtag === 'function') {
            gtag('event', 'begin_checkout', {
                currency: 'INR',
                value: total,
                items: cart.map(item => ({ item_id: item.productId, item_name: item.title, price: item.price, quantity: item.quantity }))
            });
        }

        if (typeof auth !== 'undefined' && auth.createCheckoutUrl) {
            const checkoutUrl = await auth.createCheckoutUrl(cart.map(item => ({
                variantId: item.shopifyVariantId,
                quantity: item.quantity
            })));
            
            // Record the order locally if the user is logged in
            if (auth.isLoggedIn()) {
                auth.saveOrder({
                    items: cart.map(item => ({
                        title: item.title,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    total: total
                });

                // Clear cart after a small delay to simulate purchase success
                setTimeout(() => {
                    cart = [];
                    saveCart();
                    updateCartUI();
                }, 500);
            }

            window.location.href = checkoutUrl;
        } else {
            throw new Error("Auth service not initialized. Cannot create checkout.");
        }

    } catch (error) {
        console.error("Checkout Error:", error);
        alert("Checkout Error: " + (error.message || JSON.stringify(error)));
        if (checkoutBtn) {
            checkoutBtn.textContent = originalText;
            checkoutBtn.disabled = false;
        }
    }
}

// ============ WISHLIST ============
function updateWishlistUI() {
    const container = document.getElementById('wishlist-items');
    if (!container) return;
    if (wishlist.length === 0) {
        container.innerHTML = '<p class="empty-cart-msg">Your wishlist is empty.</p>';
        return;
    }
    container.innerHTML = '';
    wishlist.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="cart-item-img">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.title}</h4>
                <p class="cart-item-price">\u20B9${item.price.toFixed(2)}</p>
                <a href="product.html?id=${item.id}" class="btn btn-primary" style="font-size:0.75rem;padding:0.4rem 0.8rem;margin-top:0.5rem;display:inline-block;">View</a>
                <button class="remove-item" data-id="${item.id}" style="margin-top:0.5rem;">Remove</button>
            </div>
        `;
        container.appendChild(el);
    });
    container.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.target.dataset.id;
            wishlist = wishlist.filter(i => i.id !== id);
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            updateWishlistUI();
        });
    });
}

// ============ SEARCH ============
function fuzzyMatch(query, text) {
    if (!text) return false;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (t.includes(q)) return true;
    
    const typos = { 'shrit': 'shirt', 'tshirt': 't-shirt', 't shirt': 't-shirt', 'sweats': 'sweat', 'pents': 'pants' };
    let adjusted = q;
    for (const [typo, fix] of Object.entries(typos)) {
        adjusted = adjusted.replace(new RegExp(typo, 'g'), fix);
    }
    if (t.includes(adjusted)) return true;
    
    // Loose character match for small typos
    if (q.length > 3) {
        let i = 0;
        for (let char of t) {
            if (char === adjusted[i]) i++;
            if (i === adjusted.length) return true;
        }
    }
    return false;
}

function initSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearch = document.getElementById('close-search');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchToggle || !searchOverlay) return;

    searchToggle.addEventListener('click', () => {
        searchOverlay.classList.add('active');
        if (searchInput) setTimeout(() => searchInput.focus(), 100);
    });
    if (closeSearch) closeSearch.addEventListener('click', () => searchOverlay.classList.remove('active'));
    searchOverlay.addEventListener('click', e => {
        if (e.target === searchOverlay) searchOverlay.classList.remove('active');
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') searchOverlay.classList.remove('active');
    });
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (!searchResults) return;
            if (query.length < 2) { searchResults.innerHTML = ''; return; }
            
            const matched = products.filter(p =>
                fuzzyMatch(query, p.title) ||
                fuzzyMatch(query, p.category) ||
                (p.tags && p.tags.some(tag => fuzzyMatch(query, tag)))
            );
            
            if (matched.length === 0) {
                searchResults.innerHTML = '<p class="empty-cart-msg">No products found.</p>';
                return;
            }
            searchResults.innerHTML = '';
            matched.forEach(p => {
                const item = document.createElement('a');
                item.href = `product.html?id=${p.id}`;
                item.className = 'search-result-item';
                item.innerHTML = `
                    <img src="${p.image}" alt="${p.title}" loading="lazy">
                    <div>
                        <div class="search-result-title">${p.title}</div>
                        <div class="search-result-price">\u20B9${p.price.toFixed(2)}</div>
                    </div>
                `;
                searchResults.appendChild(item);
            });
        });
    }
}

// ============ CATEGORY FILTER ============
function initCategoryFilter() {
    const filterLinks = document.querySelectorAll('[data-filter]');
    filterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (document.getElementById('product-grid')) {
                e.preventDefault();
                const filter = link.dataset.filter;
                const filtered = filter === 'all' ? products : products.filter(p =>
                    p.category.toLowerCase().includes(filter) ||
                    p.title.toLowerCase().includes(filter) ||
                    (p.tags && p.tags.some(t => t.toLowerCase().includes(filter)))
                );
                renderProducts(filtered.length > 0 ? filtered : products);
                document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Run init
document.addEventListener('DOMContentLoaded', init);

// Collection Page Logic
function loadCollectionPage() {
    const params = new URLSearchParams(window.location.search);
    const category = (params.get('category') || 'all').toLowerCase();

    // Capitalise for display
    const displayName = category.charAt(0).toUpperCase() + category.slice(1);

    // Update page <title> and header elements
    document.title = `GRIT | ${displayName}`;
    const titleEl = document.getElementById('collection-title');
    const catNameEl = document.getElementById('collection-category-name');
    const subtitleEl = document.getElementById('collection-subtitle');
    if (titleEl) titleEl.textContent = displayName;
    if (catNameEl) catNameEl.textContent = displayName;
    if (subtitleEl) {
        const subtitles = {
            men: 'Refined essentials crafted for the modern man.',
            women: 'Elevated pieces designed for effortless style.',
            others: 'Unique styles and accessories for every occasion.',
            original: 'The signature GRIT line — where it all began.',
        };
        subtitleEl.textContent = subtitles[category] || 'Explore our curated collection.';
    }

    if (category === 'all') {
        renderCategorySections('', products);
        return;
    }

    // 1. Try to match a Shopify Collection by handle or title
    let matchedProducts = [];
    const matchedCollection = collections.find(c =>
        c.handle.toLowerCase() === category ||
        c.title.toLowerCase() === category ||
        c.handle.toLowerCase().includes(category) ||
        c.title.toLowerCase().includes(category)
    );

    if (matchedCollection && matchedCollection.productIds.length > 0) {
        matchedProducts = products.filter(p => matchedCollection.productIds.includes(p.id));
    }

    // 2. Also fall back: match intelligently using our smart filters
    const intelligentMatch = products.filter(p => isProductInCategory(p, category));

    // Combine both and remove duplicates
    const combined = [...new Set([...matchedProducts, ...intelligentMatch])];

    currentCollectionProducts = combined; // Store as stable reference

    // Initialize Filters with the fetched products
    initCollectionFilters(category, combined);

    renderCategorySections(category, combined);
}

// ============ COLLECTION FILTERS ============
function initCollectionFilters(category, productsList) {
    const filterSizes = document.getElementById('filter-sizes');
    const filterColors = document.getElementById('filter-colors');
    const sortSelect = document.getElementById('sort-select');

    if (!filterSizes || !filterColors || !sortSelect) return;

    // Extract unique sizes and colors from the current product list
    const sizes = new Set();
    const colors = new Set();

    productsList.forEach(p => {
        if (p.options) {
            p.options.forEach(opt => {
                if (opt.name.toLowerCase() === 'size') {
                    opt.values.forEach(v => sizes.add(v.value));
                }
                if (opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour') {
                    opt.values.forEach(v => colors.add(v.value));
                }
            });
        }
    });

    // Render Size Checkboxes
    filterSizes.innerHTML = Array.from(sizes).sort((a, b) => {
        // Sort sizes logically
        const sizeOrder = { 'xxs': 1, 'xs': 2, 's': 3, 'm': 4, 'l': 5, 'xl': 6, 'xxl': 7, '2xl': 7, 'xxxl': 8, '3xl': 8 };
        const rankA = sizeOrder[a.toLowerCase().trim()] || 99;
        const rankB = sizeOrder[b.toLowerCase().trim()] || 99;
        return rankA - rankB;
    }).map(size => `
        <label class="filter-checkbox-label">
            <input type="checkbox" value="${size}" data-type="size"> ${size}
        </label>
    `).join('');

    // Render Color Checkboxes
    filterColors.innerHTML = Array.from(colors).sort().map(color => `
        <label class="filter-checkbox-label">
            <input type="checkbox" value="${color}" data-type="color"> ${color}
        </label>
    `).join('');

    // Add empty state if no colors/sizes
    if (sizes.size === 0) filterSizes.innerHTML = '<p class="empty-cart-msg" style="margin:0">No sizes found.</p>';
    if (colors.size === 0) filterColors.innerHTML = '<p class="empty-cart-msg" style="margin:0">No colors found.</p>';

    // Apply Filters Function
    function applyFiltersAndSort() {
        // Get active filters
        const activeSizes = Array.from(document.querySelectorAll('input[data-type="size"]:checked')).map(cb => cb.value);
        const activeColors = Array.from(document.querySelectorAll('input[data-type="color"]:checked')).map(cb => cb.value);
        const sortValue = sortSelect.value;

        // Filter
        let filtered = productsList.filter(p => {
            let matchesSize = true;
            let matchesColor = true;

            if (activeSizes.length > 0) {
                const pSizes = p.options?.find(o => o.name.toLowerCase() === 'size')?.values.map(v => v.value) || [];
                matchesSize = activeSizes.some(s => pSizes.includes(s));
            }

            if (activeColors.length > 0) {
                const pColors = p.options?.find(o => o.name.toLowerCase() === 'color' || o.name.toLowerCase() === 'colour')?.values.map(v => v.value) || [];
                matchesColor = activeColors.some(c => pColors.includes(c));
            }

            return matchesSize && matchesColor;
        });

        // Sort
        if (sortValue === 'price-asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortValue === 'price-desc') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (sortValue === 'newest') {
            // Shopify IDs are usually sequential based on creation time
            filtered.sort((a, b) => b.id.localeCompare(a.id));
        }

        renderCategorySections(category, filtered);
    }

    // Attach listeners
    document.querySelectorAll('.filter-checkbox-label input').forEach(cb => {
        cb.addEventListener('change', applyFiltersAndSort);
    });
    sortSelect.addEventListener('change', applyFiltersAndSort);

    // Mobile Sidebar Toggle Logic
    const mobileToggle = document.getElementById('mobile-filter-toggle');
    const sidebar = document.getElementById('collection-sidebar');
    const closeSidebar = document.getElementById('close-filters');

    if (mobileToggle && sidebar && closeSidebar) {
        // Clone and replace to avoid duplicate listeners on re-runs
        const newMobileToggle = mobileToggle.cloneNode(true);
        mobileToggle.parentNode.replaceChild(newMobileToggle, mobileToggle);

        newMobileToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}

// Subcategory definitions per main category
const subcategoryMap = {
    men: ['T-Shirts', 'Shirt', 'Vest', 'Sweatpants', 'Shorts', 'Jackets', 'Hoodie'],
    women: ['T-Shirt', 'Tank-Top', 'Crop-Top', 'Tube-Top', 'Sports-Bra', 'Crop-Tank', 'Mini-Skirt', 'Pencil-Skirt', 'Legging', 'Shorts', 'Dress', 'Bomber-Jacket', 'Cropped Hoodie'],
    others: ['Shirts', 'T-Shirts', 'Shorts', 'Hoodie', 'Sweatshirt'],
    original: ['Shirts', 'T-Shirts', 'Sweatpants', 'Shorts', 'Jacket', 'Hoodie', 'Sweatshirt'],
};

// Helper: Determine if a product belongs to a main category (Handles Qikink structures)
function isProductInCategory(p, category) {
    if (!p) return false;
    const cat = category.toLowerCase();

    // Convert everything to a searchable string
    const searchString = ` ${p.title} ${p.category} ${(p.tags || []).join(' ')} `.toLowerCase();

    if (cat === 'others') {
        const isMen = /\b(men's|mens|men)\b/.test(searchString);
        const isWomen = /\b(women's|womens|women)\b/.test(searchString);
        // If it's explicitly men or women, it's not 'others' (unless tagged unisex)
        const isUnisex = /\bunisex\b/.test(searchString);
        if ((!isMen && !isWomen) || isUnisex) return true;

        // Also check explicit 'others' keywords
        return /\bkids?\b|\baccessories\b|\bmugs?\b|\bothers\b/.test(searchString);
    }

    let regex;
    if (cat === 'men') {
        // Match men, mens, men's, male, or unisex
        regex = /\b(men's|mens|men|male|unisex)\b/;
    } else if (cat === 'women') {
        // Match women, womens, women's, female, or unisex
        regex = /\b(women's|womens|women|female|unisex)\b/;
    } else {
        regex = new RegExp(`\\b${cat}\\b`);
    }

    return regex.test(searchString);
}

// Helper: Determine if a product belongs to a subcategory (Handles Qikink aliases)
function isProductInSubcategory(p, tab) {
    if (!p) return false;
    let tabName = tab.toLowerCase().replace(/-/g, ' ');

    let searchString = ` ${p.title} ${p.category} ${(p.tags || []).join(' ')} `.toLowerCase().replace(/-/g, ' ');

    // Protect "Shirt" from matching "T-Shirt" or "Sweatshirt"
    if (tabName === 'shirt' || tabName === 'shirts') {
        searchString = searchString.replace(/\bt shirts?\b|\btshirts?\b|\btees?\b|\bsweat shirts?\b|\bsweatshirts?\b/g, '');
    }

    let aliases = [tabName];
    // Qikink common aliases
    if (tabName === 't shirts' || tabName === 't shirt') aliases.push('tshirt', 'tee', 'round neck');
    if (tabName === 'vest') aliases.push('sleeveless');
    if (tabName === 'tank top') aliases.push('tank');
    if (tabName === 'crop top') aliases.push('croptop');
    if (tabName === 'sweatpants') aliases.push('joggers', 'sweat pants', 'track pants');
    if (tabName === 'sweatshirt') aliases.push('sweat shirt', 'pullover');
    if (tabName === 'bomber jacket') aliases.push('bomber');
    if (tabName === 'cropped hoodie') aliases.push('crop hoodie');

    for (const alias of aliases) {
        const regex = new RegExp(`\\b${alias}\\b`);
        if (regex.test(searchString)) return true;
    }
    return false;
}

// Render stacked category sections
function renderCategorySections(category, categoryProducts) {
    const container = document.getElementById('category-sections-container');
    if (!container) return;

    if (categoryProducts.length === 0 && currentCollectionProducts.length > 0) {
        categoryProducts = currentCollectionProducts;
    }

    let tabs = subcategoryMap[category] || [];

    // Fallback if no subcategories for this category
    if (tabs.length === 0) {
        container.innerHTML = `
            <section class="products-section">
                <div class="product-grid" id="product-grid-all"></div>
            </section>
        `;
        renderProducts(categoryProducts, document.getElementById('product-grid-all'));
        return;
    }

    container.innerHTML = '';

    tabs.forEach(tab => {
        // Create section for this tab
        const sectionId = 'section-' + tab.toLowerCase().replace(/\s+/g, '-');
        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `
            <h2 class="category-section-title" id="${sectionId}">${tab}</h2>
            <section class="products-section">
                <div class="product-grid" id="product-grid-${tab.toLowerCase().replace(/\s+/g, '-')}">
                </div>
            </section>
        `;
        container.appendChild(section);

        // Filter products for this tab
        let subFiltered = [];
        if (categoryProducts && categoryProducts.length > 0) {
            subFiltered = categoryProducts.filter(p => isProductInSubcategory(p, tab));
        }

        // Render into this specific grid
        const grid = section.querySelector('.product-grid');

        if (subFiltered.length > 2) {
            grid.classList.add('horizontal-scroll');
        }

        renderProducts(subFiltered, grid);
    });

    // Scroll if we have a hash
    scrollToHash();
}


function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    const product = products.find(p => p.id === productId);

    if (!product) {
        document.getElementById('pdp-container').innerHTML = '<h2>Product not found.</h2>';
        return;
    }

    // Populate DOM
    document.getElementById('pdp-title').textContent = product.title;
    document.getElementById('pdp-price').textContent = '\u20B9' + product.price.toFixed(2);
    document.getElementById('pdp-category').textContent = product.category;

    const mainImg = document.getElementById('pdp-main-img');
    // Set initial image to the first one that is NOT a size chart
    const firstNonChartImg = product.images ? product.images.find(img => !(img.alt && img.alt.toLowerCase().includes('chart'))) : null;
    mainImg.src = firstNonChartImg ? firstNonChartImg.src : product.image;

    document.getElementById('pdp-description').innerHTML = product.description;

    // Populate dynamic details list
    const detailsList = document.querySelector('.pdp-details-list');
    if (detailsList) {
        let detailsHTML = '';
        if (product.vendor) detailsHTML += `<li><strong>Brand:</strong> ${product.vendor}</li>`;
        if (product.category && product.category !== 'Uncategorized') detailsHTML += `<li><strong>Category:</strong> ${product.category}</li>`;
        if (product.tags && product.tags.length > 0) detailsHTML += `<li><strong>Tags:</strong> ${product.tags.join(', ')}</li>`;
        detailsHTML += `<li><strong>Care:</strong> Dry clean only</li>`;
        detailsList.innerHTML = detailsHTML;
    }

    // Variant Selection Logic
    let selectedOptions = {};
    const optionsContainer = document.getElementById('pdp-options-container');

    function updateVariantUI() {
        if (!product.variants) return;
        const selectedVariant = product.variants.find(v =>
            v.selectedOptions.every(opt => selectedOptions[opt.name] === opt.value)
        );

        if (selectedVariant) {
            document.getElementById('pdp-price').textContent = '₹' + parseFloat(selectedVariant.price.amount).toFixed(2);

            // Swap image if the color variant has a specific image
            if (selectedVariant.image) {
                mainImg.src = selectedVariant.image.src;
            }

            const addBtn = document.getElementById('pdp-add-to-cart');
            addBtn.dataset.variantId = selectedVariant.id;
            addBtn.textContent = selectedVariant.available ? 'Add to Cart' : 'Out of Stock';
            addBtn.disabled = !selectedVariant.available;

            const buyBtn = document.getElementById('pdp-buy-now');
            buyBtn.dataset.variantId = selectedVariant.id;
            buyBtn.disabled = !selectedVariant.available;
        }

        renderThumbnails();
    }

    // Thumbnail Rendering Logic
    const thumbnailsContainer = document.querySelector('.pdp-thumbnails');

    function renderThumbnails() {
        if (!thumbnailsContainer || !product.images) return;

        // Find the currently selected Color
        const colorKey = Object.keys(selectedOptions).find(k => k.toLowerCase() === 'color' || k.toLowerCase() === 'colour');
        const selectedColor = colorKey ? selectedOptions[colorKey] : '';

        thumbnailsContainer.innerHTML = '';

        // Exclude chart images from the gallery
        let visibleImages = product.images.filter(img => !(img.alt && img.alt.toLowerCase().includes('chart')));

        // If a color is selected, filter images by Alt Text
        if (selectedColor) {
            const colorFiltered = visibleImages.filter(img => {
                const alt = img.alt ? img.alt.toLowerCase() : '';
                const color = selectedColor.toLowerCase();
                // Show if alt text CONTAINS the color (e.g., 'model black'), or 'all'
                return alt.includes(color) || alt.includes('all');
            });

            // Fallback: If filtering hid EVERY image because no alt text is set yet, just show them all (excluding chart)
            if (colorFiltered.length > 0) {
                visibleImages = colorFiltered;
            }
        }

        visibleImages.forEach((imgObj) => {
            const thumb = document.createElement('img');
            thumb.src = imgObj.src;
            thumb.className = mainImg.src === imgObj.src ? 'pdp-thumbnail active' : 'pdp-thumbnail';

            thumb.addEventListener('click', () => {
                mainImg.src = imgObj.src;
                document.querySelectorAll('.pdp-thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });

            thumbnailsContainer.appendChild(thumb);
        });
    }

    if (optionsContainer && product.options) {
        optionsContainer.innerHTML = '';
        product.options.forEach(option => {
            if (option.name === 'Title' && option.values[0].value === 'Default Title') return;

            // Sort Size options logically (XS -> XXL or numeric)
            if (option.name.toLowerCase() === 'size') {
                const sizeOrder = { 'xxs': 1, 'xs': 2, 's': 3, 'm': 4, 'l': 5, 'xl': 6, 'xxl': 7, '2xl': 7, 'xxxl': 8, '3xl': 8 };
                option.values.sort((a, b) => {
                    const valA = a.value.toLowerCase().trim();
                    const valB = b.value.toLowerCase().trim();
                    const rankA = sizeOrder[valA] || (isNaN(parseInt(valA)) ? 99 : parseInt(valA));
                    const rankB = sizeOrder[valB] || (isNaN(parseInt(valB)) ? 99 : parseInt(valB));
                    return rankA - rankB;
                });
            }

            selectedOptions[option.name] = option.values[0].value; // Default selection

            const group = document.createElement('div');
            group.className = 'variant-group';
            group.innerHTML = `<h4 class="variant-title">${option.name}</h4>`;

            const btnGroup = document.createElement('div');
            btnGroup.className = 'variant-buttons';

            option.values.forEach(val => {
                const btn = document.createElement('button');
                btn.className = `variant-btn ${selectedOptions[option.name] === val.value ? 'active' : ''}`;
                btn.textContent = val.value;

                btn.addEventListener('click', () => {
                    Array.from(btnGroup.children).forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    selectedOptions[option.name] = val.value;
                    updateVariantUI();
                });

                btnGroup.appendChild(btn);
            });
            group.appendChild(btnGroup);
            optionsContainer.appendChild(group);
        });
        updateVariantUI();
    }

    // Attach event listeners
    document.getElementById('pdp-add-to-cart').addEventListener('click', (e) => {
        addToCart(product.id, e.target.dataset.variantId);
    });

    document.getElementById('pdp-buy-now').addEventListener('click', async (e) => {
        const btn = e.target;
        const targetVariantId = btn.dataset.variantId || product.shopifyVariantId;
        const originalText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.disabled = true;

        try {
            if (typeof auth !== 'undefined' && auth.createCheckoutUrl) {
                const checkoutUrl = await auth.createCheckoutUrl([{
                    variantId: targetVariantId,
                    quantity: 1
                }]);
                window.location.href = checkoutUrl;
            } else {
                throw new Error("Auth service not initialized. Cannot create checkout.");
            }
        } catch (error) {
            console.error("Checkout Error:", error);
            alert("Checkout Error: " + (error.message || JSON.stringify(error)));
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Fullscreen Image Logic
    const fullscreenOverlay = document.getElementById('fullscreen-overlay');
    const fullscreenImg = document.getElementById('fullscreen-image');
    const closeFullscreenBtn = document.getElementById('close-fullscreen');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');

    if (fullscreenOverlay && mainImg) {
        let currentZoom = 1;
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;

        mainImg.style.cursor = 'zoom-in';
        mainImg.addEventListener('click', () => {
            fullscreenImg.src = mainImg.src;
            fullscreenOverlay.classList.add('active');
            currentZoom = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
            document.body.style.overflow = 'hidden';
        });

        closeFullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fullscreenOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom = Math.min(5, currentZoom + 0.5);
            updateTransform();
        });

        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom = Math.max(0.5, currentZoom - 0.5);
            updateTransform();
        });

        fullscreenOverlay.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            currentZoom = Math.min(Math.max(0.5, currentZoom + delta), 5);
            updateTransform();
        }, { passive: false });

        fullscreenImg.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent default image drag
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        function updateTransform() {
            fullscreenImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
        }
    }

    // --- PHASE 2: PDP Enhancements ---

    // 1. Mouse-tracking Hover Zoom
    const mainImageContainer = document.getElementById('pdp-main-image-container');
    if (mainImageContainer && mainImg) {
        mainImageContainer.addEventListener('mousemove', (e) => {
            const rect = mainImageContainer.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            mainImg.style.transformOrigin = `${x}% ${y}%`;
        });
        mainImageContainer.addEventListener('mouseleave', () => {
            mainImg.style.transformOrigin = 'center center';
        });
    }

    // 2. Accordions
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isActive = header.classList.contains('active');

            // Close all
            document.querySelectorAll('.accordion-header').forEach(h => {
                h.classList.remove('active');
                h.nextElementSibling.style.maxHeight = null;
            });

            // If it wasn't active, open it
            if (!isActive) {
                header.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });

    // 3. Size Guide Modal
    const sizeGuideModal = document.getElementById('size-guide-modal');
    const openSizeGuideBtn = document.getElementById('open-size-guide');
    const closeSizeGuideBtn = document.getElementById('close-size-guide');
    const sizeGuideImg = document.getElementById('size-guide-dynamic-img');
    const sizeGuideFallback = document.getElementById('size-guide-fallback-msg');

    // Find the chart image for this product
    let chartImageSrc = null;
    if (product.images) {
        const chartImg = product.images.find(img => img.alt && img.alt.toLowerCase().includes('chart'));
        if (chartImg) {
            chartImageSrc = chartImg.src;
        }
    }

    if (sizeGuideModal && openSizeGuideBtn) {
        // Setup Modal Content
        if (chartImageSrc) {
            if (sizeGuideImg) {
                sizeGuideImg.src = chartImageSrc;
                sizeGuideImg.style.display = 'inline-block';
            }
            if (sizeGuideFallback) sizeGuideFallback.style.display = 'none';
        } else {
            if (sizeGuideImg) sizeGuideImg.style.display = 'none';
            if (sizeGuideFallback) sizeGuideFallback.style.display = 'block';
        }

        openSizeGuideBtn.addEventListener('click', () => {
            sizeGuideModal.classList.add('active');
        });
        closeSizeGuideBtn.addEventListener('click', () => {
            sizeGuideModal.classList.remove('active');
        });
        sizeGuideModal.addEventListener('click', (e) => {
            if (e.target === sizeGuideModal) {
                sizeGuideModal.classList.remove('active');
            }
        });
    }

    // 4. Load Related Products
    loadRelatedProducts(product);

    // 5. Load Reviews
    initReviews(product);
}

// Load "You May Also Like" Products
function loadRelatedProducts(currentProduct) {
    const grid = document.getElementById('related-product-grid');
    if (!grid) return;

    // Try to find products in the same category, excluding the current one
    let related = products.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id);

    // Fallback if not enough products
    if (related.length < 4) {
        const others = products.filter(p => p.id !== currentProduct.id && !related.includes(p));
        related = related.concat(others);
    }

    // Shuffle and pick top 4
    related = related.sort(() => 0.5 - Math.random()).slice(0, 4);

    renderProducts(related, grid);
}

// ============ NEWSLETTER ============
function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('newsletter-email').value.trim();
        if (!email) return;
        // Save to localStorage (deduplicated)
        const subs = JSON.parse(localStorage.getItem('grit_newsletter') || '[]');
        if (!subs.includes(email)) {
            subs.push(email);
            localStorage.setItem('grit_newsletter', JSON.stringify(subs));
        }
        // Show success state
        form.style.display = 'none';
        const successEl = document.getElementById('newsletter-success');
        if (successEl) successEl.style.display = 'block';
    });
}

// ============ ANALYTICS (GA4/PIXEL) ============
function initAnalytics() {
    // Inject Google Analytics dynamically
    // Replace 'G-XXXXXXXXXX' with your real Measurement ID
    const gaId = 'G-XXXXXXXXXX'; 
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', gaId);
    
    // Add custom pixel/tracking if needed here
}

// ============ REVIEWS (FIREBASE FIRESTORE) ============
// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQuAe_7L1vnsY0beKnDE4Ed-B1-zxHvYU",
    authDomain: "grit-store-37ece.firebaseapp.com",
    projectId: "grit-store-37ece",
    storageBucket: "grit-store-37ece.firebasestorage.app",
    messagingSenderId: "1055253240069",
    appId: "1:1055253240069:web:25ec6ae34201fd8f9bbf6c"
};

// Initialize only if SDK is present
let db = null;
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
}

function starsHTML(rating, size = '1.1rem') {
    return Array.from({ length: 5 }, (_, i) =>
        `<span style="color:${i < rating ? 'var(--color-primary)' : '#444'};font-size:${size};">★</span>`
    ).join('');
}

async function renderReviews(productId) {
    const listEl = document.getElementById('reviews-list');
    const avgEl = document.getElementById('reviews-avg');
    const starsEl = document.getElementById('reviews-stars');
    const countEl = document.getElementById('reviews-count');

    if (!listEl) return;

    let reviews = [];

    // Fetch from Firebase if initialized and config is valid
    if (db && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
        try {
            const snapshot = await db.collection('reviews')
                .where('productId', '==', String(productId))
                .orderBy('timestamp', 'desc')
                .get();
            reviews = snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error("Error fetching reviews from Firebase:", error);
            listEl.innerHTML = '<p style="color:var(--color-text-light);">Unable to load reviews.</p>';
            return;
        }
    } else {
        // Fallback to localStorage if Firebase not configured
        const all = JSON.parse(localStorage.getItem('grit_product_reviews')) || {};
        reviews = all[productId] || [];
    }

    if (reviews.length === 0) {
        listEl.innerHTML = '<p style="color:var(--color-text-light);">No reviews yet. Be the first!</p>';
        if (avgEl) avgEl.textContent = '—';
        if (starsEl) starsEl.innerHTML = starsHTML(0);
        if (countEl) countEl.textContent = 'No reviews yet';
        return;
    }

    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const rounded = Math.round(avg * 10) / 10;

    if (avgEl) avgEl.textContent = rounded.toFixed(1);
    if (starsEl) starsEl.innerHTML = starsHTML(Math.round(avg));
    if (countEl) countEl.textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;

    listEl.innerHTML = reviews.map(r => `
        <div class="review-item">
            <div>${starsHTML(r.rating)}</div>
            <h4>${r.title}</h4>
            <p class="review-author">
                ${r.userName}
                ${r.verified ? '<span class="verified">✓ Verified Buyer</span>' : ''}
                <span style="color:var(--color-text-light);font-size:0.8rem;margin-left:0.5rem;">${r.date}</span>
            </p>
            <p>${r.body}</p>
        </div>
    `).join('');
}

async function saveReview(productId, review) {
    if (db && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
        try {
            review.productId = String(productId);
            review.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('reviews').add(review);
        } catch (error) {
            console.error("Error saving review to Firebase:", error);
            throw error;
        }
    } else {
        // Fallback
        const all = JSON.parse(localStorage.getItem('grit_product_reviews')) || {};
        if (!all[productId]) all[productId] = [];
        all[productId].unshift(review);
        localStorage.setItem('grit_product_reviews', JSON.stringify(all));
    }
}

function initReviews(product) {
    const productId = product.id;

    // Render existing reviews
    renderReviews(productId);

    const modal = document.getElementById('review-modal');
    const openBtn = document.getElementById('open-review-modal');
    const closeBtn = document.getElementById('close-review-modal');
    const loginPrompt = document.getElementById('review-login-prompt');
    const reviewForm = document.getElementById('review-form');
    const successMsg = document.getElementById('review-success');
    const productName = document.getElementById('review-modal-product-name');
    const errorEl = document.getElementById('review-form-error');
    if (!modal || !openBtn) return;

    if (productName) productName.textContent = product.title;

    // Helper: has this user purchased this product? (Shopify Customer Auth Structure)
    function userHasPurchased() {
        if (typeof auth === 'undefined' || !auth.isLoggedIn()) return false;
        const user = auth.getUser();
        if (!user || !user.orders || !user.orders.edges) return false;

        const productTitleLower = product.title.toLowerCase();

        return user.orders.edges.some(({ node: order }) => {
            // Check if any line item in this order matches the product title
            if (!order.lineItems || !order.lineItems.edges) return false;
            return order.lineItems.edges.some(({ node: item }) =>
                item.title && item.title.toLowerCase().includes(productTitleLower)
            );
        });
    }

    // Update "Write a Review" button visibility based on eligibility
    function updateWriteReviewBtn() {
        if (!openBtn) return;
        if (typeof auth === 'undefined' || !auth.isLoggedIn()) {
            // Not logged in — keep button visible (will show login prompt in modal)
            openBtn.style.display = '';
            openBtn.title = 'Log in to write a review';
        } else if (!userHasPurchased()) {
            // Logged in but hasn't purchased
            openBtn.style.display = 'none';
            const noPurchaseNote = document.createElement('p');
            noPurchaseNote.id = 'no-purchase-note';
            noPurchaseNote.style.cssText = 'font-size:0.82rem;color:var(--color-text-light);margin-top:1rem;line-height:1.4;';
            noPurchaseNote.textContent = 'Only customers who have purchased this product can leave a review.';
            const existing = document.getElementById('no-purchase-note');
            if (!existing) openBtn.parentElement.appendChild(noPurchaseNote);
        } else {
            // Eligible — show button
            openBtn.style.display = '';
            const existing = document.getElementById('no-purchase-note');
            if (existing) existing.remove();
        }
    }
    updateWriteReviewBtn();

    // Open modal
    openBtn.addEventListener('click', () => {
        // Reset all panels
        reviewForm.style.display = 'none';
        loginPrompt.style.display = 'none';
        successMsg.style.display = 'none';
        errorEl.style.display = 'none';
        const notPurchasedEl = document.getElementById('review-not-purchased');
        if (notPurchasedEl) notPurchasedEl.style.display = 'none';

        if (typeof auth === 'undefined' || !auth.isLoggedIn()) {
            // Not logged in
            loginPrompt.style.display = 'block';
        } else if (!userHasPurchased()) {
            // Logged in but hasn't purchased — show purchase-required message
            const notPurchasedEl = document.getElementById('review-not-purchased');
            if (notPurchasedEl) notPurchasedEl.style.display = 'block';
        } else {
            // Eligible to review
            reviewForm.style.display = 'flex';
            reviewForm.style.flexDirection = 'column';
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });


    // Close modal
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // Star Picker
    let selectedRating = 0;
    const starSpans = document.querySelectorAll('#star-picker span');
    const ratingInput = document.getElementById('review-rating');

    starSpans.forEach(span => {
        span.addEventListener('mouseover', () => highlightStars(parseInt(span.dataset.value)));
        span.addEventListener('mouseout', () => highlightStars(selectedRating));
        span.addEventListener('click', () => {
            selectedRating = parseInt(span.dataset.value);
            ratingInput.value = selectedRating;
            highlightStars(selectedRating);
        });
    });

    function highlightStars(count) {
        starSpans.forEach(s => {
            const v = parseInt(s.dataset.value);
            s.style.color = v <= count ? 'var(--color-primary)' : '#555';
        });
    }
    highlightStars(0);

    // Form Submit
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = parseInt(ratingInput.value);
        const title = document.getElementById('review-title').value.trim();
        const body = document.getElementById('review-body').value.trim();
        const submitBtn = document.getElementById('review-submit-btn');

        if (rating === 0) {
            errorEl.textContent = 'Please select a star rating.';
            errorEl.style.display = 'block';
            return;
        }
        if (!title || !body) {
            errorEl.textContent = 'Please fill in all fields.';
            errorEl.style.display = 'block';
            return;
        }
        errorEl.style.display = 'none';

        const user = auth.getUser();
        const isVerified = userHasPurchased();
        const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;

        const review = {
            rating,
            title,
            body,
            userName: userName,
            verified: isVerified,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            userId: user.id
        };

        try {
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }
            await saveReview(productId, review);
            await renderReviews(productId);

            // Show success
            reviewForm.style.display = 'none';
            successMsg.style.display = 'block';
        } catch (error) {
            errorEl.textContent = 'Failed to submit review. Please try again.';
            errorEl.style.display = 'block';
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Review'; }
        }

        // Reset form
        reviewForm.reset();
        selectedRating = 0;
        ratingInput.value = 0;
        highlightStars(0);

        // Auto-close after 2.5s
        setTimeout(closeModal, 2500);
    });
}

// Custom Cursor Logic
function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;

    // Track mouse
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Spotlight glow effect for cards - Optimized
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });
    });

    // Add hover effect to interactive elements
    const interactives = document.querySelectorAll('a, button, input, .product-image-wrapper');
    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });

    // Magnetic Buttons
    const magneticBtns = document.querySelectorAll('.magnetic');
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            // Pull the button towards cursor slightly
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = `translate(0px, 0px)`;
        });
    });

    // Animation loop for smooth trailing
    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.2;
        cursorY += (mouseY - cursorY) * 0.2;

        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;

        requestAnimationFrame(animateCursor);
    }

    if (window.innerWidth > 768) {
        animateCursor();
    }
}

// Hero Slideshow
let slideshowInterval;
function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length <= 1) return;

    if (slideshowInterval) clearInterval(slideshowInterval);

    let currentSlide = 0;

    slideshowInterval = setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 3000); // Cross-fade every 3 seconds
}

// Dragon Video (placeholder — extend if you add a video background later)
function initDragonVideo() {
    // Reserved for future dragon video background integration
}


function initGSAPAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // 1. Hero Parallax (DripVoid Style)
    const heroImageContainer = document.querySelector('.hero-image-container');
    const heroContent = document.querySelector('.hero-content');

    if (heroImageContainer && heroContent) {
        // Move the background video down slightly as you scroll (creates depth)
        gsap.to(heroImageContainer, {
            yPercent: 25,
            opacity: 0,
            ease: "none",
            scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });

        // Push the text up faster and fade it out
        gsap.to(heroContent, {
            yPercent: -40,
            opacity: 0,
            ease: "none",
            scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }

    // 2. Product Grid Staggered Reveal
    const productGrid = document.querySelector('.product-grid');
    if (productGrid) {
        const cards = gsap.utils.toArray('.product-card');
        gsap.to(cards, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
                trigger: productGrid,
                start: "top 80%",
                toggleActions: "play reverse play reverse"
            }
        });
    }

    // 3. General Reveals (Headers, Footer)
    const generalReveals = gsap.utils.toArray('.reveal:not(.product-card)');
    generalReveals.forEach(reveal => {
        gsap.to(reveal, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
                trigger: reveal,
                start: "top 85%",
                toggleActions: "play reverse play reverse"
            }
        });
    });
}

// ============ INTERACTIVE BACKGROUND ============
function initInteractiveBackground() {
    const canvas = document.getElementById('interactive-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let dots = [];

    // Configuration
    const dotSpacing = 30; // distance between dots
    const dotRadius = 1.5;
    const dotColor = 'rgba(253, 251, 249, 0.15)'; // matches var(--color-text) at 15% opacity
    const repelRadius = 120;
    const repelForce = 2.0;
    const returnForce = 0.05;
    const friction = 0.85;

    let mouse = { x: -1000, y: -1000 };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initDots();
    }

    function initDots() {
        dots = [];
        // Add offset so dots are centered
        const offsetX = (width % dotSpacing) / 2;
        const offsetY = (height % dotSpacing) / 2;

        const cols = Math.floor(width / dotSpacing) + 1;
        const rows = Math.floor(height / dotSpacing) + 1;

        for (let i = 0; i <= cols; i++) {
            for (let j = 0; j <= rows; j++) {
                const x = (i * dotSpacing) + offsetX;
                const y = (j * dotSpacing) + offsetY;
                dots.push({
                    baseX: x,
                    baseY: y,
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0
                });
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        dots.forEach(dot => {
            // Distance from mouse
            const dx = mouse.x - dot.x;
            const dy = mouse.y - dot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Repel force
            if (dist < repelRadius) {
                const force = (repelRadius - dist) / repelRadius;
                // Move dot away from mouse
                dot.vx -= (dx / dist) * force * repelForce;
                dot.vy -= (dy / dist) * force * repelForce;
            }

            // Return to base (spring)
            dot.vx += (dot.baseX - dot.x) * returnForce;
            dot.vy += (dot.baseY - dot.y) * returnForce;

            // Apply friction
            dot.vx *= friction;
            dot.vy *= friction;

            dot.x += dot.vx;
            dot.y += dot.vy;

            // Draw dot
            if (dist < repelRadius * 1.5) {
                ctx.fillStyle = '#a83f3f'; // Red color from logo
            } else {
                ctx.fillStyle = dotColor;
            }

            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    });
    window.addEventListener('mouseout', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    resize();
    animate();
}
