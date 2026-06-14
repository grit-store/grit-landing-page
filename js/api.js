// ============ SHOPIFY API ============

async function fetchShopifyProducts() {
    if (!shopifyClient) {
        console.warn('Shopify client not available. Skipping product fetch.');
        return;
    }
    try {
        const shopifyProducts = await shopifyClient.product.fetchAll();

        const optimizeSrc = (src) => src ? src + (src.includes('?') ? '&' : '?') + 'width=1200&format=webp' : '';

        products = shopifyProducts.reduce((validProducts, p) => {
            try {
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
                    shopifyVariantId: p.variants[0].id,
                    options: p.options,
                    variants: p.variants
                });
            } catch (mappingError) {
                console.error("Skipped a product due to corrupted data in Shopify:", p.title, mappingError);
            }
            return validProducts;
        }, []);

        try {
            const shopifyCollections = await shopifyClient.collection.fetchAllWithProducts();
            collections = shopifyCollections.map(c => ({
                id: c.id,
                title: c.title,
                handle: c.handle || c.title.toLowerCase(),
                productIds: c.products ? c.products.map(p => p.id) : []
            }));
        } catch (collectionError) {
            console.warn("Could not fetch collections:", collectionError);
        }

        // Home page: render product grid + dynamic hero
        if (document.getElementById('product-grid')) {
            renderProducts();
            const heroSlideshow = document.querySelector('.hero-image-container.slideshow');
            if (heroSlideshow) {
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    const mobileImages = [
                        { src: 'assets/women hero mobile.jpeg', category: 'women' },
                        { src: 'assets/men hero mobile.jpeg', category: 'men' }
                    ];
                    heroSlideshow.querySelectorAll('.hero-slide').forEach(el => el.remove());
                    mobileImages.forEach((item, idx) => {
                        const linkEl = document.createElement('a');
                        linkEl.href = `collection.html?category=${item.category}`;
                        linkEl.className = idx === 0 ? 'hero-slide active' : 'hero-slide';
                        
                        const imgEl = document.createElement('img');
                        imgEl.src = item.src;
                        imgEl.alt = `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} Collection Mobile`;
                        linkEl.appendChild(imgEl);

                        const textOverlay = heroSlideshow.querySelector('.hero-vertical-text');
                        if (textOverlay) {
                            heroSlideshow.insertBefore(linkEl, textOverlay);
                        } else {
                            heroSlideshow.appendChild(linkEl);
                        }
                    });
                    initHeroSlideshow();
                } else {
                    const modelData = [];
                    products.forEach(p => {
                        (p.images || []).forEach(img => {
                            if (img.alt && img.alt.toLowerCase().includes('model')) {
                                modelData.push({ src: img.src, productId: p.id });
                            }
                        });
                    });
                    if (modelData.length > 0) {
                        const limitedModelData = modelData.slice(0, 4);
                        heroSlideshow.querySelectorAll('.hero-slide').forEach(el => el.remove());
                        limitedModelData.forEach((item, idx) => {
                            const imgEl = document.createElement('img');
                            imgEl.src = item.src;
                            imgEl.className = idx === 0 ? 'hero-slide active' : 'hero-slide';
                            imgEl.alt = 'GRIT Model';
                            imgEl.style.cursor = 'pointer';
                            imgEl.addEventListener('click', () => {
                                window.location.href = `product.html?id=${encodeURIComponent(item.productId)}`;
                            });
                            const textOverlay = heroSlideshow.querySelector('.hero-vertical-text');
                            if (textOverlay) {
                                heroSlideshow.insertBefore(imgEl, textOverlay);
                            } else {
                                heroSlideshow.appendChild(imgEl);
                            }
                        });
                        initHeroSlideshow();
                    } else {
                        const desktopImages = [
                            { src: 'assets/women hero.jpeg', category: 'women' },
                            { src: 'assets/men hero.jpeg', category: 'men' }
                        ];
                        heroSlideshow.querySelectorAll('.hero-slide').forEach(el => el.remove());
                        desktopImages.forEach((item, idx) => {
                            const linkEl = document.createElement('a');
                            linkEl.href = `collection.html?category=${item.category}`;
                            linkEl.className = idx === 0 ? 'hero-slide active' : 'hero-slide';
                            
                            const imgEl = document.createElement('img');
                            imgEl.src = item.src;
                            imgEl.alt = `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} Collection`;
                            linkEl.appendChild(imgEl);

                            const textOverlay = heroSlideshow.querySelector('.hero-vertical-text');
                            if (textOverlay) {
                                heroSlideshow.insertBefore(linkEl, textOverlay);
                            } else {
                                heroSlideshow.appendChild(linkEl);
                            }
                        });
                        initHeroSlideshow();
                    }
                }
            }
        }

        setTimeout(() => {
            initGSAPAnimations();
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        }, 100);

    } catch (error) {
        console.error("Error fetching products from Shopify:", error);
        const grid = document.getElementById('product-grid');
        if (grid) grid.innerHTML = '<p>Error loading products. Please refresh.</p>';
    }
}
