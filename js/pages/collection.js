// ============ COLLECTION PAGE ============

const subcategoryMap = {
    men: ['T-Shirts', 'Shirt', 'Vest', 'Sweatpants', 'Shorts', 'Jackets', 'Hoodie'],
    women: ['T-Shirt', 'Tank-Top', 'Crop-Top', 'Tube-Top', 'Sports-Bra', 'Crop-Tank', 'Mini-Skirt', 'Pencil-Skirt', 'Legging', 'Shorts', 'Dress', 'Bomber-Jacket', 'Cropped Hoodie'],
    others: ['Shirts', 'T-Shirts', 'Shorts', 'Hoodie', 'Sweatshirt'],
    original: ['Shirts', 'T-Shirts', 'Sweatpants', 'Shorts', 'Jacket', 'Hoodie', 'Sweatshirt'],
};

function isProductInCategory(p, category) {
    if (!p) return false;
    const cat = category.toLowerCase();
    const searchString = ` ${p.title} ${p.category} ${(p.tags || []).join(' ')} `.toLowerCase();
    if (cat === 'others') {
        const isMen = /\b(men's|mens|men)\b/.test(searchString);
        const isWomen = /\b(women's|womens|women)\b/.test(searchString);
        const isUnisex = /\bunisex\b/.test(searchString);
        if ((!isMen && !isWomen) || isUnisex) return true;
        return /\bkids?\b|\baccessories\b|\bmugs?\b|\bothers\b/.test(searchString);
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
    const category = (params.get('category') || 'all').toLowerCase();
    const displayName = category.charAt(0).toUpperCase() + category.slice(1);
    document.title = `GRIT | ${displayName}`;
    const titleEl = document.getElementById('collection-title');
    const catNameEl = document.getElementById('collection-category-name');
    const subtitleEl = document.getElementById('collection-subtitle');
    if (titleEl) titleEl.textContent = displayName;
    if (catNameEl) catNameEl.textContent = displayName;
    if (subtitleEl) {
        const subtitles = { men: 'Refined essentials crafted for the modern man.', women: 'Elevated pieces designed for effortless style.', others: 'Unique styles and accessories for every occasion.', original: 'The signature GRIT line — where it all began.' };
        subtitleEl.textContent = subtitles[category] || 'Explore our curated collection.';
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
