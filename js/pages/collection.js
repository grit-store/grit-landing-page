// ============ COLLECTION PAGE ============

const subcategoryMap = {
    men: ['T-Shirts', 'Shirt', 'Vest', 'Sweatpants', 'Shorts', 'Jackets', 'Hoodie'],
    women: ['T-Shirt', 'Tank-Top', 'Crop-Top', 'Tube-Top', 'Sports-Bra', 'Crop-Tank', 'Mini-Skirt', 'Pencil-Skirt', 'Legging', 'Shorts', 'Dress', 'Bomber-Jacket', 'Cropped Hoodie'],
    anime: ['Shirts', 'T-Shirts', 'Shorts', 'Hoodie', 'Sweatshirt'],
    original: ['Shirts', 'T-Shirts', 'Sweatpants', 'Shorts', 'Jacket', 'Hoodie', 'Sweatshirt'],
};

function isProductInCategory(p, category) {
    if (!p) return false;
    const cat = category.toLowerCase();
    const searchString = ` ${p.title} ${p.category} ${(p.tags || []).join(' ')} `.toLowerCase();
    if (cat === 'anime') {
        return p.tags && p.tags.some(tag => tag.toLowerCase() === 'anime');
    }
    let regex;
    if (cat === 'men') regex = /\b(men's|mens|men|male|unisex)\b/;
    else if (cat === 'women') regex = /\b(women's|womens|women|female|unisex)\b/;
    else regex = new RegExp(`\\b${cat}\\b`);
    return regex.test(searchString);
}

function isProductInSubcategory(p, tab) {
    if (!p) return false;
    let tabName = tab.toLowerCase().replace(/-/g, ' ');
    let searchString = ` ${p.title} ${p.category} ${(p.tags || []).join(' ')} `.toLowerCase().replace(/-/g, ' ');
    if (tabName === 'shirt' || tabName === 'shirts') {
        searchString = searchString.replace(/\bt shirts?\b|\btshirts?\b|\btees?\b|\bsweat shirts?\b|\bsweatshirts?\b/g, '');
    }
    let aliases = [tabName];
    if (tabName === 't shirts' || tabName === 't shirt') aliases.push('t shirt', 't shirts', 'tshirt', 'tshirts', 'tee', 'round neck');
    if (tabName === 'vest') aliases.push('sleeveless');
    if (tabName === 'tank top') aliases.push('tank');
    if (tabName === 'crop top') aliases.push('croptop');
    if (tabName === 'sweatpants') aliases.push('joggers', 'sweat pants', 'track pants');
    if (tabName === 'sweatshirt') aliases.push('sweat shirt', 'pullover');
    if (tabName === 'bomber jacket') aliases.push('bomber');
    if (tabName === 'cropped hoodie') aliases.push('crop hoodie');
    for (const alias of aliases) {
        if (new RegExp(`\\b${alias}\\b`).test(searchString)) return true;
    }
    return false;
}

function renderCategorySections(category, categoryProducts) {
    const container = document.getElementById('category-sections-container');
    if (!container) return;
    if (categoryProducts.length === 0 && currentCollectionProducts.length > 0) categoryProducts = currentCollectionProducts;
    
    container.innerHTML = '';

    if (categoryProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-collection-state" style="text-align: center; padding: 8rem 2rem; min-height: 40vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--color-text); letter-spacing: 2px;">NEW DROPS INCOMING</h2>
                <p style="color: var(--color-text-light); max-width: 600px; margin: 0 auto; font-size: 1.1rem;">We're currently crafting exclusive new designs for this collection. Stay tuned!</p>
            </div>
        `;
        if (typeof ScrollTrigger !== 'undefined') {
            setTimeout(() => ScrollTrigger.refresh(), 100);
        }
        return;
    }

    const tabs = subcategoryMap[category] || [];
    if (tabs.length === 0) {
        container.innerHTML = `<section class="products-section"><div class="product-grid" id="product-grid-all"></div></section>`;
        renderProducts(categoryProducts, document.getElementById('product-grid-all'));
        return;
    }
    container.innerHTML = '';
    tabs.forEach(tab => {
        const subFiltered = categoryProducts.filter(p => isProductInSubcategory(p, tab));
        
        // Skip rendering sections with no matching products to keep the layout clean
        if (subFiltered.length === 0) return;

        const sectionId = 'section-' + tab.toLowerCase().replace(/\s+/g, '-');
        const gridId = `product-grid-${tab.toLowerCase().replace(/\s+/g, '-')}`;
        
        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `
            <h2 class="category-section-title" id="${sectionId}">${tab}</h2>
            <section class="products-section">
                <div class="product-grid" id="${gridId}"></div>
                ${subFiltered.length > 4 ? `
                    <div class="view-more-container" style="text-align: center; margin-top: 3rem;">
                        <button class="btn btn-outline view-more-btn" style="padding: 0.8rem 2.5rem; font-size: 0.9rem;">View More</button>
                    </div>
                ` : ''}
            </section>
        `;
        container.appendChild(section);
        
        const grid = section.querySelector('.product-grid');
        renderProducts(subFiltered, grid);

        // Hide products past the initial 4 limit
        const cards = grid.querySelectorAll('.product-card');
        cards.forEach((card, idx) => {
            if (idx >= 4) {
                card.classList.add('hidden-product');
                card.style.display = 'none';
            }
        });

        // Add toggle action to the View More button
        const viewMoreBtn = section.querySelector('.view-more-btn');
        if (viewMoreBtn) {
            viewMoreBtn.addEventListener('click', () => {
                const isShowingMore = viewMoreBtn.textContent === 'View More';
                const hiddenCards = grid.querySelectorAll('.hidden-product');
                
                hiddenCards.forEach(card => {
                    card.style.display = isShowingMore ? 'flex' : 'none';
                });
                
                viewMoreBtn.textContent = isShowingMore ? 'Show Less' : 'View More';
                
                // Refresh GSAP ScrollTrigger if present
                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh();
                }
            });
        }
    });
    scrollToHash();
}

function initCollectionFilters(category, productsList) {
    const filterSizes = document.getElementById('filter-sizes');
    const filterColors = document.getElementById('filter-colors');
    const sortSelect = document.getElementById('sort-select');
    if (!filterSizes || !filterColors || !sortSelect) return;

    const sizes = new Set(), colors = new Set();
    productsList.forEach(p => {
        if (p.options) p.options.forEach(opt => {
            if (opt.name.toLowerCase() === 'size') opt.values.forEach(v => sizes.add(v.value));
            if (opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour') opt.values.forEach(v => colors.add(v.value));
        });
    });

    const sizeOrder = { 'xxs': 1, 'xs': 2, 's': 3, 'm': 4, 'l': 5, 'xl': 6, 'xxl': 7, '2xl': 7, 'xxxl': 8, '3xl': 8 };
    filterSizes.innerHTML = Array.from(sizes).sort((a, b) => (sizeOrder[a.toLowerCase().trim()] || 99) - (sizeOrder[b.toLowerCase().trim()] || 99))
        .map(size => `<label class="filter-checkbox-label"><input type="checkbox" value="${size}" data-type="size"> ${size}</label>`).join('');
    filterColors.innerHTML = Array.from(colors).sort()
        .map(color => `<label class="filter-checkbox-label"><input type="checkbox" value="${color}" data-type="color"> ${color}</label>`).join('');
    if (sizes.size === 0) filterSizes.innerHTML = '<p class="empty-cart-msg" style="margin:0">No sizes found.</p>';
    if (colors.size === 0) filterColors.innerHTML = '<p class="empty-cart-msg" style="margin:0">No colors found.</p>';

    function applyFiltersAndSort() {
        const activeSizes = Array.from(document.querySelectorAll('input[data-type="size"]:checked')).map(cb => cb.value);
        const activeColors = Array.from(document.querySelectorAll('input[data-type="color"]:checked')).map(cb => cb.value);
        const sortValue = sortSelect.value;
        let filtered = productsList.filter(p => {
            const matchesSize = activeSizes.length === 0 || activeSizes.some(s => (p.options?.find(o => o.name.toLowerCase() === 'size')?.values.map(v => v.value) || []).includes(s));
            const matchesColor = activeColors.length === 0 || activeColors.some(c => (p.options?.find(o => o.name.toLowerCase() === 'color' || o.name.toLowerCase() === 'colour')?.values.map(v => v.value) || []).includes(c));
            return matchesSize && matchesColor;
        });
        if (sortValue === 'price-asc') filtered.sort((a, b) => a.price - b.price);
        else if (sortValue === 'price-desc') filtered.sort((a, b) => b.price - a.price);
        else if (sortValue === 'newest') {
            filtered.sort((a, b) => {
                const getNumericId = id => {
                    if (!id) return 0;
                    try {
                        const decoded = id.startsWith('gid://') ? id : atob(id);
                        const match = decoded.match(/\d+$/);
                        return match ? parseInt(match[0]) : 0;
                    } catch (e) {
                        return 0;
                    }
                };
                return getNumericId(b.id) - getNumericId(a.id);
            });
        } else if (sortValue === 'gender-men') {
            filtered.sort((a, b) => {
                const aIsMen = isProductInCategory(a, 'men');
                const bIsMen = isProductInCategory(b, 'men');
                if (aIsMen && !bIsMen) return -1;
                if (!aIsMen && bIsMen) return 1;
                return 0;
            });
        } else if (sortValue === 'gender-women') {
            filtered.sort((a, b) => {
                const aIsWomen = isProductInCategory(a, 'women');
                const bIsWomen = isProductInCategory(b, 'women');
                if (aIsWomen && !bIsWomen) return -1;
                if (!aIsWomen && bIsWomen) return 1;
                return 0;
            });
        }
        renderCategorySections(category, filtered);
    }

    document.querySelectorAll('.filter-checkbox-label input').forEach(cb => cb.addEventListener('change', applyFiltersAndSort));
    sortSelect.addEventListener('change', applyFiltersAndSort);

    const mobileToggle = document.getElementById('mobile-filter-toggle');
    const sidebar = document.getElementById('collection-sidebar');
    const closeSidebar = document.getElementById('close-filters');
    if (mobileToggle && sidebar && closeSidebar) {
        const newMobileToggle = mobileToggle.cloneNode(true);
        mobileToggle.parentNode.replaceChild(newMobileToggle, mobileToggle);
        newMobileToggle.addEventListener('click', () => { sidebar.classList.add('active'); document.body.style.overflow = 'hidden'; });
        closeSidebar.addEventListener('click', () => { sidebar.classList.remove('active'); document.body.style.overflow = ''; });
    }
}

function loadCollectionPage() {
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('search');
    
    if (searchQuery) {
        const decodedQuery = decodeURIComponent(searchQuery);
        document.title = `GRIT | Search: ${decodedQuery}`;
        const titleEl = document.getElementById('collection-title');
        const catNameEl = document.getElementById('collection-category-name');
        const subtitleEl = document.getElementById('collection-subtitle');
        if (titleEl) titleEl.textContent = "Search Results";
        if (catNameEl) catNameEl.textContent = "Search";
        if (subtitleEl) subtitleEl.textContent = `Showing results for "${decodedQuery}"`;

        const matched = products.filter(p => {
            const hasFuzzy = typeof fuzzyMatch !== 'undefined';
            const check = (term, text) => hasFuzzy ? fuzzyMatch(term, text) : (text && text.toLowerCase().includes(term.toLowerCase()));
            return check(decodedQuery, p.title) || 
                   check(decodedQuery, p.category) || 
                   (p.tags && p.tags.some(tag => check(decodedQuery, tag)));
        });

        currentCollectionProducts = matched;
        initCollectionFilters('all', matched);
        renderCategorySections('all', matched);
        return;
    }

    const category = (params.get('category') || 'all').toLowerCase();
    const displayName = category.charAt(0).toUpperCase() + category.slice(1);
    document.title = `GRIT | ${displayName}`;
    const titleEl = document.getElementById('collection-title');
    const catNameEl = document.getElementById('collection-category-name');
    const subtitleEl = document.getElementById('collection-subtitle');
    if (titleEl) titleEl.textContent = displayName;
    if (catNameEl) catNameEl.textContent = displayName;
    if (subtitleEl) {
        const subtitles = { men: 'Refined essentials crafted for the modern man.', women: 'Elevated pieces designed for effortless style.', anime: 'Exclusive anime-inspired apparel and designs.', original: 'The signature GRIT line — where it all began.' };
        subtitleEl.textContent = subtitles[category] || 'Explore our curated collection.';
    }

    const heroSection = document.querySelector('.collection-hero');
    if (heroSection) {
        if (category === 'anime') {
            heroSection.style.backgroundImage = "";
            heroSection.style.minHeight = "";
            heroSection.style.display = "";
            heroSection.style.alignItems = "";
            if (!heroSection.querySelector('.collection-video-bg')) {
                const videoHTML = `
                    <video autoplay loop muted playsinline webkit-playsinline="true" disablePictureInPicture preload="metadata" class="collection-video-bg" id="anime-hero-video">
                        <source src="video/anime1.mp4" type="video/mp4">
                    </video>
                    <div class="collection-video-overlay"></div>
                    <button id="hero-mute-btn" class="hero-mute-btn" aria-label="Toggle Mute">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-volume-on" style="display:none;">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-volume-off">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <line x1="23" y1="9" x2="17" y2="15"></line>
                            <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                    </button>`;
                heroSection.insertAdjacentHTML('afterbegin', videoHTML);
                heroSection.classList.add('has-video-bg');

                const muteBtn = heroSection.querySelector('#hero-mute-btn');
                const video = heroSection.querySelector('#anime-hero-video');
                const iconOn = muteBtn.querySelector('.icon-volume-on');
                const iconOff = muteBtn.querySelector('.icon-volume-off');

                muteBtn.addEventListener('click', () => {
                    video.muted = !video.muted;
                    if (video.muted) {
                        iconOn.style.display = 'none';
                        iconOff.style.display = 'block';
                    } else {
                        iconOn.style.display = 'block';
                        iconOff.style.display = 'none';
                    }
                });

                // Auto pause video when scrolled out of viewport (resource conservation)
                if (window.IntersectionObserver) {
                    const videoObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                video.play().catch(() => {});
                            } else {
                                video.pause();
                            }
                        });
                    }, { threshold: 0.1 });
                    videoObserver.observe(video);
                }
            }
        } else {
            const video = heroSection.querySelector('.collection-video-bg');
            const muteBtn = heroSection.querySelector('.hero-mute-btn');
            if (video) {
                video.pause();
                video.remove();
            }
            if (muteBtn) muteBtn.remove();
            heroSection.classList.remove('has-video-bg');

            if (category === 'men') {
                heroSection.style.backgroundImage = "linear-gradient(to bottom, rgba(10, 10, 10, 0.3), rgba(10, 10, 10, 0.75)), url('assets/men hero.jpeg')";
                heroSection.style.backgroundSize = "cover";
                heroSection.style.backgroundPosition = "center center";
                heroSection.style.minHeight = "100vh";
                heroSection.style.display = "flex";
                heroSection.style.flexDirection = "column";
                heroSection.style.justifyContent = "center";
                
                const contentEl = heroSection.querySelector('.collection-hero-content');
                if (contentEl) {
                    contentEl.style.width = "100%";
                    contentEl.style.marginTop = "4rem";
                }
            } else {
                heroSection.style.backgroundImage = "";
                heroSection.style.backgroundSize = "";
                heroSection.style.backgroundPosition = "";
                heroSection.style.minHeight = "";
                heroSection.style.display = "";
                heroSection.style.flexDirection = "";
                heroSection.style.justifyContent = "";
                
                const contentEl = heroSection.querySelector('.collection-hero-content');
                if (contentEl) {
                    contentEl.style.width = "";
                    contentEl.style.marginTop = "";
                }
            }
        }
    }

    if (category === 'all') { renderCategorySections('', products); return; }

    let matchedProducts = [];
    const matchedCollection = collections.find(c => c.handle.toLowerCase() === category || c.title.toLowerCase() === category || c.handle.toLowerCase().includes(category) || c.title.toLowerCase().includes(category));
    if (matchedCollection && matchedCollection.productIds.length > 0) matchedProducts = products.filter(p => matchedCollection.productIds.includes(p.id));
    const intelligentMatch = products.filter(p => isProductInCategory(p, category));
    const combined = [...new Set([...matchedProducts, ...intelligentMatch])];
    currentCollectionProducts = combined;
    initCollectionFilters(category, combined);
    renderCategorySections(category, combined);
}
