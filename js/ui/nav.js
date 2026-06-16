// ============ NAV, SEARCH & EVENT LISTENERS ============

function setupEventListeners() {
    const cartToggle = document.getElementById('cart-toggle');
    const closeCartBtn = document.getElementById('close-cart');
    if (cartToggle) cartToggle.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);

    const wishlistToggle = document.getElementById('wishlist-toggle');
    const mobileWishlistToggle = document.getElementById('mobile-wishlist-toggle');
    const closeWishlistBtn = document.getElementById('close-wishlist');
    const wishlistOverlay = document.getElementById('wishlist-overlay');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    const openWishlist = () => {
        if (wishlistOverlay) wishlistOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    };

    if (wishlistToggle) wishlistToggle.addEventListener('click', openWishlist);
    if (mobileWishlistToggle) {
        mobileWishlistToggle.addEventListener('click', (e) => {
            e.preventDefault();
            openWishlist();
        });
    }
    if (closeWishlistBtn) closeWishlistBtn.addEventListener('click', () => { if (wishlistOverlay) wishlistOverlay.classList.remove('active'); document.body.style.overflow = ''; });
    if (wishlistOverlay) wishlistOverlay.addEventListener('click', e => { if (e.target === wishlistOverlay) { wishlistOverlay.classList.remove('active'); document.body.style.overflow = ''; } });

    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', () => { if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; });
    if (closeMobileMenuBtn) closeMobileMenuBtn.addEventListener('click', () => { if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active'); document.body.style.overflow = ''; });
    if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', e => { if (e.target === mobileMenuOverlay) { mobileMenuOverlay.classList.remove('active'); document.body.style.overflow = ''; } });

    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) cartOverlay.addEventListener('click', e => { if (e.target === cartOverlay) closeCart(); });

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('account.html');
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50 || isAuthPage) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled');
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

function highlightSearchMatch(text, query) {
    if (!query) return text;
    // Escape special regex characters
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<strong class="search-highlight">$1</strong>');
}

function initSearch() {
    const searchToggle = document.getElementById('search-toggle');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearch = document.getElementById('close-search');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchToggle || !searchOverlay) return;

    let selectedIndex = -1;
    let debounceTimeout = null;

    const trendingSearches = [
        { text: 'Oversized Tee', type: 'term' },
        { text: 'Hoodie', type: 'term' },
        { text: 'Sweatpants', type: 'term' },
        { text: 'Men', type: 'category' },
        { text: 'Women', type: 'category' }
    ];

    function showSuggestions() {
        if (!searchResults) return;
        selectedIndex = -1;
        searchResults.innerHTML = `
            <div class="search-suggestions-container">
                <h4 class="suggestions-heading">Trending Searches</h4>
                <div class="search-tags">
                    ${trendingSearches.map(t => `<button class="search-tag" data-query="${escapeHTML(t.text)}">${escapeHTML(t.text)}</button>`).join('')}
                </div>
            </div>
        `;
        // Attach click listeners to tags
        searchResults.querySelectorAll('.search-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = tag.dataset.query;
                    performSearch(tag.dataset.query);
                    searchInput.focus();
                }
            });
        });
    }

    function performSearch(query) {
        if (!searchResults) return;
        selectedIndex = -1;
        if (query.length < 2) {
            showSuggestions();
            return;
        }

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
        
        // Render matching products
        matched.forEach(p => {
            const item = document.createElement('a');
            item.href = `product.html?id=${p.id}`;
            item.className = 'search-result-item';
            
            const highlightedTitle = highlightSearchMatch(p.title, query);
            
            item.innerHTML = `
                <img src="${p.image}" alt="${escapeHTML(p.title)}" loading="lazy">
                <div>
                    <div class="search-result-title">${highlightedTitle}</div>
                    <div class="search-result-price"><span style="text-decoration: line-through; color: var(--color-text-light); margin-right: 4px; font-size: 0.85em;">₹${(p.price * 1.2).toFixed(2)}</span><span>₹${p.price.toFixed(2)}</span></div>
                </div>
            `;
            searchResults.appendChild(item);
        });

        // Append the "View All Results" link at the bottom
        const viewAll = document.createElement('a');
        viewAll.href = `collection.html?search=${encodeURIComponent(query)}`;
        viewAll.className = 'view-all-results-link';
        viewAll.innerHTML = `View all results for "${escapeHTML(query)}" &rarr;`;
        searchResults.appendChild(viewAll);

        // Micro-animations for results staggering in
        if (typeof gsap !== 'undefined') {
            gsap.from(searchResults.querySelectorAll('.search-result-item, .view-all-results-link'), {
                y: 15,
                opacity: 0,
                duration: 0.3,
                stagger: 0.04,
                ease: "power2.out"
            });
        }
    }

    function updateActiveSearchItem() {
        const items = searchResults.querySelectorAll('.search-result-item, .view-all-results-link');
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add('keyboard-selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('keyboard-selected');
            }
        });
    }

    // Toggle overlay visibility
    searchToggle.addEventListener('click', () => {
        searchOverlay.classList.add('active');
        showSuggestions();
        if (searchInput) {
            setTimeout(() => {
                searchInput.value = '';
                searchInput.focus();
            }, 100);
        }
    });

    if (closeSearch) {
        closeSearch.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
        });
    }

    searchOverlay.addEventListener('click', e => {
        if (e.target === searchOverlay) {
            searchOverlay.classList.remove('active');
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchOverlay.classList.remove('active');
        }
    });

    if (searchInput) {
        // Debounce input to prevent UI lag
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                performSearch(query);
            }, 150);
        });

        // Keydown handler for Arrow keys, Enter, and resetting selections
        searchInput.addEventListener('keydown', e => {
            const items = searchResults.querySelectorAll('.search-result-item, .view-all-results-link');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateActiveSearchItem();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                updateActiveSearchItem();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex > -1 && selectedIndex < items.length) {
                    items[selectedIndex].click();
                } else {
                    // Redirect directly to full search page
                    const query = searchInput.value.trim();
                    if (query.length >= 2) {
                        window.location.href = `collection.html?search=${encodeURIComponent(query)}`;
                    }
                }
            }
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
