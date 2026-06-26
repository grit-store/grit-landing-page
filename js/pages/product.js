// ============ PRODUCT DETAIL PAGE ============

function loadProductDetail() {
    const productId = new URLSearchParams(window.location.search).get('id');
    const product = products.find(p => p.id === productId);
    if (!product) { const c = document.getElementById('pdp-container'); if(c) c.innerHTML = '<h2>Product not found.</h2>'; return; }

    document.getElementById('pdp-title').textContent = product.title;
    document.getElementById('pdp-price').innerHTML = `<span style="text-decoration: line-through; color: var(--color-text-light); margin-right: 8px; font-size: 0.8em;">₹${(product.price * 1.2).toFixed(2)}</span><span>₹${product.price.toFixed(2)}</span>`;
    document.getElementById('pdp-category').textContent = product.category;
    // Sanitize description HTML to prevent XSS from Shopify descriptionHtml
    const descriptionEl = document.getElementById('pdp-description');
    if (descriptionEl) {
        const tempDoc = new DOMParser().parseFromString(product.description, 'text/html');
        // Remove scripts, iframes, and event handlers
        tempDoc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
        tempDoc.querySelectorAll('*').forEach(el => {
            for (const attr of [...el.attributes]) {
                if (attr.name.startsWith('on') || attr.name === 'srcdoc') el.removeAttribute(attr.name);
                if (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) el.removeAttribute(attr.name);
            }
        });
        descriptionEl.innerHTML = tempDoc.body.innerHTML;
    }

    const mainImg = document.getElementById('pdp-main-img');
    const firstNonChartImg = product.images ? product.images.find(img => !(img.alt && img.alt.toLowerCase().includes('chart'))) : null;
    mainImg.src = firstNonChartImg ? firstNonChartImg.src : product.image;

    const detailsList = document.querySelector('.pdp-details-list');
    if (detailsList) {
        let html = '';
        if (product.vendor) html += `<li><strong>Brand:</strong> ${escapeHTML(product.vendor)}</li>`;
        if (product.category && product.category !== 'Uncategorized') html += `<li><strong>Category:</strong> ${escapeHTML(product.category)}</li>`;
        if (product.tags && product.tags.length > 0) html += `<li><strong>Tags:</strong> ${product.tags.map(t => escapeHTML(t)).join(', ')}</li>`;
        html += `<li><strong>Care:</strong> Dry clean only</li>`;
        detailsList.innerHTML = html;
    }

    let selectedOptions = {};
    const optionsContainer = document.getElementById('pdp-options-container');
    const thumbnailsContainer = document.querySelector('.pdp-thumbnails');

    let visibleImages = [];
    let currentImageIndex = 0;

    function getVisibleImages() {
        if (!product.images) return [];
        const colorKey = Object.keys(selectedOptions).find(k => k.toLowerCase() === 'color' || k.toLowerCase() === 'colour');
        const selectedColor = colorKey ? selectedOptions[colorKey] : '';
        let list = product.images.filter(img => !(img.alt && img.alt.toLowerCase().includes('chart')));
        if (selectedColor) {
            const colorFiltered = list.filter(img => { 
                const alt = img.alt ? img.alt.toLowerCase() : ''; 
                return alt.includes(selectedColor.toLowerCase()) || alt.includes('all'); 
            });
            if (colorFiltered.length > 0) list = colorFiltered;
        }
        return list;
    }

    function renderThumbnails() {
        if (!thumbnailsContainer) return;
        visibleImages = getVisibleImages();
        thumbnailsContainer.innerHTML = '';
        
        const cleanMainSrc = mainImg.src ? mainImg.src.split('?')[0] : '';
        currentImageIndex = visibleImages.findIndex(imgObj => imgObj.src.split('?')[0] === cleanMainSrc);
        if (currentImageIndex === -1) currentImageIndex = 0;

        const prevBtn = document.getElementById('pdp-prev-btn');
        const nextBtn = document.getElementById('pdp-next-btn');
        if (visibleImages.length > 1) {
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
        }

        visibleImages.forEach((imgObj, idx) => {
            const thumb = document.createElement('img');
            thumb.src = imgObj.src;
            const cleanThumbSrc = imgObj.src ? imgObj.src.split('?')[0] : '';
            thumb.className = cleanMainSrc === cleanThumbSrc ? 'pdp-thumbnail active' : 'pdp-thumbnail';
            thumb.addEventListener('click', () => {
                mainImg.src = imgObj.src;
                currentImageIndex = idx;
                document.querySelectorAll('.pdp-thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            thumbnailsContainer.appendChild(thumb);
        });
    }

    function updateVariantUI() {
        if (!product.variants) return;
        const selectedVariant = product.variants.find(v => v.selectedOptions.every(opt => selectedOptions[opt.name] === opt.value));
        if (selectedVariant) {
            document.getElementById('pdp-price').innerHTML = `<span style="text-decoration: line-through; color: var(--color-text-light); margin-right: 8px; font-size: 0.8em;">₹${(parseFloat(selectedVariant.price.amount) * 1.2).toFixed(2)}</span><span>₹${parseFloat(selectedVariant.price.amount).toFixed(2)}</span>`;
            
            let variantImg = null;
            let isChart = false;
            if (selectedVariant.image && selectedVariant.image.src) {
                const variantImgSrcClean = selectedVariant.image.src.split('?')[0];
                isChart = (product.images && product.images.some(img => 
                    img.src.split('?')[0] === variantImgSrcClean && 
                    img.alt && img.alt.toLowerCase().includes('chart')
                )) || variantImgSrcClean.toLowerCase().includes('chart') || variantImgSrcClean.toLowerCase().includes('size');
            }

            const colorKey = Object.keys(selectedOptions).find(k => k.toLowerCase() === 'color' || k.toLowerCase() === 'colour');
            const selectedColor = colorKey ? selectedOptions[colorKey] : '';

            let useVariantImage = false;
            if (selectedVariant.image && selectedVariant.image.src && !isChart) {
                const imgAlt = (selectedVariant.image.altText || selectedVariant.image.alt || '').toLowerCase();
                if (!selectedColor || imgAlt.includes(selectedColor.toLowerCase()) || imgAlt === '') {
                    useVariantImage = true;
                }
            }

            if (useVariantImage) {
                variantImg = selectedVariant.image.src;
            } else {
                if (selectedColor && product.images) {
                    let match = product.images.find(img => {
                        const alt = (img.alt || '').toLowerCase().trim();
                        return alt.includes(selectedColor.toLowerCase()) && alt.endsWith('1') && !alt.includes('chart');
                    });
                    if (!match) {
                        match = product.images.find(img => {
                            const alt = (img.alt || '').toLowerCase();
                            return alt.includes(selectedColor.toLowerCase()) && !alt.includes('chart');
                        });
                    }
                    if (match) {
                        variantImg = match.src;
                    }
                }
            }

            if (variantImg) {
                mainImg.src = variantImg;
            }
            
            const addBtn = document.getElementById('pdp-add-to-cart');
            const buyBtn = document.getElementById('pdp-buy-now');
            addBtn.dataset.variantId = selectedVariant.id;
            addBtn.textContent = selectedVariant.available ? 'Add to Cart' : 'Out of Stock';
            addBtn.disabled = !selectedVariant.available;
            buyBtn.dataset.variantId = selectedVariant.id;
            buyBtn.disabled = !selectedVariant.available;
        }
        renderThumbnails();
    }

    if (optionsContainer && product.options) {
        optionsContainer.innerHTML = '';
        product.options.forEach(option => {
            if (option.name === 'Title' && option.values[0].value === 'Default Title') return;
            
            let sortedValues = [...option.values];
            if (option.name.toLowerCase() === 'size') {
                const sizeOrder = { 'xxs':1,'xs':2,'s':3,'m':4,'l':5,'xl':6,'xxl':7,'2xl':7,'xxxl':8,'3xl':8 };
                sortedValues.sort((a,b) => { const va=a.value.toLowerCase().trim(),vb=b.value.toLowerCase().trim(); return (sizeOrder[va]||(isNaN(parseInt(va))?99:parseInt(va)))-(sizeOrder[vb]||(isNaN(parseInt(vb))?99:parseInt(vb))); });
            }
            selectedOptions[option.name] = sortedValues[0].value;
            const group = document.createElement('div');
            group.className = 'variant-group';
            group.innerHTML = `<h4 class="variant-title">${escapeHTML(option.name)}</h4>`;
            const btnGroup = document.createElement('div');
            btnGroup.className = 'variant-buttons';
            sortedValues.forEach(val => {
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

    // Add to Cart
    document.getElementById('pdp-add-to-cart').addEventListener('click', e => addToCart(product.id, e.target.dataset.variantId));

    // Buy Now
    document.getElementById('pdp-buy-now').addEventListener('click', async e => {
        const btn = e.target, targetVariantId = btn.dataset.variantId || product.shopifyVariantId, orig = btn.textContent;
        btn.textContent = 'Loading...'; btn.disabled = true;
        try {
            if (typeof auth !== 'undefined' && auth.createCheckoutUrl) {
                window.location.href = await auth.createCheckoutUrl([{ variantId: targetVariantId, quantity: 1 }]);
            } else throw new Error("Auth service not initialized.");
        } catch (error) {
            console.error("Checkout Error:", error);
            alert("Checkout Error: " + (error.message || JSON.stringify(error)));
            btn.textContent = orig; btn.disabled = false;
        }
    });

    // Fullscreen Image Viewer
    const fullscreenOverlay = document.getElementById('fullscreen-overlay');
    const fullscreenImg = document.getElementById('fullscreen-image');
    if (fullscreenOverlay && mainImg) {
        let currentZoom = 1, isDragging = false, startX, startY, translateX = 0, translateY = 0;
        const updateTransform = () => fullscreenImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
        mainImg.style.cursor = 'pointer';
        mainImg.addEventListener('click', () => { fullscreenImg.src = mainImg.src; fullscreenOverlay.classList.add('active'); currentZoom=1;translateX=0;translateY=0;updateTransform();document.body.style.overflow='hidden'; });
        document.getElementById('close-fullscreen').addEventListener('click', e => { e.stopPropagation(); fullscreenOverlay.classList.remove('active'); document.body.style.overflow=''; });
        document.getElementById('zoom-in').addEventListener('click', e => { e.stopPropagation(); currentZoom=Math.min(5,currentZoom+0.5);updateTransform(); });
        document.getElementById('zoom-out').addEventListener('click', e => { e.stopPropagation(); currentZoom=Math.max(0.5,currentZoom-0.5);updateTransform(); });
        fullscreenOverlay.addEventListener('wheel', e => { e.preventDefault(); currentZoom=Math.min(Math.max(0.5,currentZoom+(e.deltaY>0?-0.1:0.1)),5);updateTransform(); }, {passive:false});
        fullscreenImg.addEventListener('mousedown', e => { e.preventDefault();isDragging=true;startX=e.clientX-translateX;startY=e.clientY-translateY; });
        window.addEventListener('mousemove', e => { if(!isDragging)return;translateX=e.clientX-startX;translateY=e.clientY-startY;updateTransform(); });
        window.addEventListener('mouseup', () => isDragging=false);
    }

    // Hover Zoom (Disabled)
    // const mainImageContainer = document.getElementById('pdp-main-image-container');
    // if (mainImageContainer && mainImg) {
    //     mainImageContainer.addEventListener('mousemove', e => { const r=mainImageContainer.getBoundingClientRect();mainImg.style.transformOrigin=`${((e.clientX-r.left)/r.width)*100}% ${((e.clientY-r.top)/r.height)*100}%`; });
    //     mainImageContainer.addEventListener('mouseleave', () => mainImg.style.transformOrigin='center center');
    // }

    // Accordions
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling, isActive = header.classList.contains('active');
            document.querySelectorAll('.accordion-header').forEach(h => { h.classList.remove('active'); h.nextElementSibling.style.maxHeight=null; });
            if (!isActive) { header.classList.add('active'); content.style.maxHeight=content.scrollHeight+'px'; }
        });
    });

    // Size Guide Modal
    const sizeGuideModal = document.getElementById('size-guide-modal');
    const openSizeGuideBtn = document.getElementById('open-size-guide');
    if (sizeGuideModal && openSizeGuideBtn) {
        const chartImg = product.images ? product.images.find(img => img.alt && img.alt.toLowerCase().includes('chart')) : null;
        const sizeGuideImg = document.getElementById('size-guide-dynamic-img');
        const sizeGuideFallback = document.getElementById('size-guide-fallback-msg');
        if (chartImg) { if(sizeGuideImg){sizeGuideImg.src=chartImg.src;sizeGuideImg.style.display='inline-block';} if(sizeGuideFallback)sizeGuideFallback.style.display='none'; }
        else { if(sizeGuideImg)sizeGuideImg.style.display='none'; if(sizeGuideFallback)sizeGuideFallback.style.display='block'; }
        openSizeGuideBtn.addEventListener('click', () => sizeGuideModal.classList.add('active'));
        document.getElementById('close-size-guide').addEventListener('click', () => sizeGuideModal.classList.remove('active'));
        sizeGuideModal.addEventListener('click', e => { if(e.target===sizeGuideModal)sizeGuideModal.classList.remove('active'); });
    }

    // Arrow Navigation
    const prevBtn = document.getElementById('pdp-prev-btn');
    const nextBtn = document.getElementById('pdp-next-btn');

    function navigateImage(direction) {
        visibleImages = getVisibleImages();
        if (visibleImages.length <= 1) return;
        
        const cleanMainSrc = mainImg.src ? mainImg.src.split('?')[0] : '';
        currentImageIndex = visibleImages.findIndex(imgObj => imgObj.src.split('?')[0] === cleanMainSrc);
        if (currentImageIndex === -1) currentImageIndex = 0;

        if (direction === 'next') {
            currentImageIndex = (currentImageIndex + 1) % visibleImages.length;
        } else {
            currentImageIndex = (currentImageIndex - 1 + visibleImages.length) % visibleImages.length;
        }

        const nextImg = visibleImages[currentImageIndex];
        if (nextImg) {
            mainImg.src = nextImg.src;
            // Update active state on thumbnails
            document.querySelectorAll('.pdp-thumbnail').forEach((thumb, idx) => {
                if (idx === currentImageIndex) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', e => {
            e.stopPropagation();
            navigateImage('prev');
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', e => {
            e.stopPropagation();
            navigateImage('next');
        });
    }

    // Related Products
    const relatedGrid = document.getElementById('related-product-grid');
    if (relatedGrid) {
        let related = products.filter(p => p.category === product.category && p.id !== product.id);
        if (related.length < 4) related = related.concat(products.filter(p => p.id !== product.id && !related.includes(p)));
        renderProducts(related.sort(() => 0.5 - Math.random()).slice(0, 4), relatedGrid);
    }

    // Reviews
    initReviews(product);
}
