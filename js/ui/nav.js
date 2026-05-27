// ============ NAV, SEARCH & EVENT LISTENERS ============

function setupEventListeners() {
    const cartToggle = document.getElementById('cart-toggle');
    const closeCartBtn = document.getElementById('close-cart');
    if (cartToggle) cartToggle.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);

    const wishlistToggle = document.getElementById('wishlist-toggle');
    const closeWishlistBtn = document.getElementById('close-wishlist');
    const wishlistOverlay = document.getElementById('wishlist-overlay');
    if (wishlistToggle) wishlistToggle.addEventListener('click', () => { if (wishlistOverlay) wishlistOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; });
    if (closeWishlistBtn) closeWishlistBtn.addEventListener('click', () => { if (wishlistOverlay) wishlistOverlay.classList.remove('active'); document.body.style.overflow = ''; });
    if (wishlistOverlay) wishlistOverlay.addEventListener('click', e => { if (e.target === wishlistOverlay) { wishlistOverlay.classList.remove('active'); document.body.style.overflow = ''; } });

    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', () => { if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; });
    if (closeMobileMenuBtn) closeMobileMenuBtn.addEventListener('click', () => { if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active'); document.body.style.overflow = ''; });
    if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', e => { if (e.target === mobileMenuOverlay) { mobileMenuOverlay.classList.remove('active'); document.body.style.overflow = ''; } });

    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) cartOverlay.addEventListener('click', e => { if (e.target === cartOverlay) closeCart(); });

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled');
            if (window.scrollY > lastScrollY && window.scrollY > 150) navbar.classList.add('hidden'); else navbar.classList.remove('hidden');
            lastScrollY = window.scrollY;
        });
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', proceedToShopifyCheckout);

    window.addEventListener('hashchange', scrollToHash);
}

function scrollToHash() {
    if (window.location.hash) {
        setTimeout(() => {
            const target = document.querySelector(window.location.hash);
            if (target) {
                const y = target.getBoundingClientRect().top + window.scrollY - 120;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 100);
    }
}

// ============ SEARCH ============
function fuzzyMatch(query, text) {
    if (!text) return false;
    const q = query.toLowerCase(), t = text.toLowerCase();
    if (t.includes(q)) return true;
    const typos = { 'shrit': 'shirt', 'tshirt': 't-shirt', 't shirt': 't-shirt', 'sweats': 'sweat', 'pents': 'pants' };
    let adjusted = q;
    for (const [typo, fix] of Object.entries(typos)) adjusted = adjusted.replace(new RegExp(typo, 'g'), fix);
    if (t.includes(adjusted)) return true;
    if (q.length > 3) { let i = 0; for (let char of t) { if (char === adjusted[i]) i++; if (i === adjusted.length) return true; } }
    return false;
}

function initSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearch = document.getElementById('close-search');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchToggle || !searchOverlay) return;

    searchToggle.addEventListener('click', () => { searchOverlay.classList.add('active'); if (searchInput) setTimeout(() => searchInput.focus(), 100); });
    if (closeSearch) closeSearch.addEventListener('click', () => searchOverlay.classList.remove('active'));
    searchOverlay.addEventListener('click', e => { if (e.target === searchOverlay) searchOverlay.classList.remove('active'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') searchOverlay.classList.remove('active'); });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (!searchResults) return;
            if (query.length < 2) { searchResults.innerHTML = ''; return; }
            const matched = products.filter(p => fuzzyMatch(query, p.title) || fuzzyMatch(query, p.category) || (p.tags && p.tags.some(tag => fuzzyMatch(query, tag))));
            if (matched.length === 0) { searchResults.innerHTML = '<p class="empty-cart-msg">No products found.</p>'; return; }
            searchResults.innerHTML = '';
            matched.forEach(p => {
                const item = document.createElement('a');
                item.href = `product.html?id=${p.id}`;
                item.className = 'search-result-item';
                item.innerHTML = `<img src="${p.image}" alt="${escapeHTML(p.title)}" loading="lazy"><div><div class="search-result-title">${escapeHTML(p.title)}</div><div class="search-result-price">₹${p.price.toFixed(2)}</div></div>`;
                searchResults.appendChild(item);
            });
        });
    }
}

function initCategoryFilter() {
    const filterLinks = document.querySelectorAll('[data-filter]');
    filterLinks.forEach(link => {
        link.addEventListener('click', e => {
            if (document.getElementById('product-grid')) {
                e.preventDefault();
                const filter = link.dataset.filter;
                const filtered = filter === 'all' ? products : products.filter(p => p.category.toLowerCase().includes(filter) || p.title.toLowerCase().includes(filter) || (p.tags && p.tags.some(t => t.toLowerCase().includes(filter))));
                renderProducts(filtered);
                document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function initUserStatus() {
    const accountLink = document.getElementById('account-link');
    if (accountLink && typeof auth !== 'undefined') {
        if (auth.isLoggedIn()) { accountLink.href = 'account.html'; accountLink.style.color = 'var(--color-primary)'; }
        else accountLink.href = 'login.html';
    }
}
