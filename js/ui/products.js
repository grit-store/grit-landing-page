// ============ PRODUCT RENDERING ============

function renderCardColorSwatches(product) {
    const colorOption = product.options ? product.options.find(opt => opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour') : null;
    if (!colorOption || colorOption.values.length <= 1) return '';

    const COLOR_HEX_MAP = {
        'black': '#1A1A1A',
        'white': '#FAFAF9',
        'grey': '#8E8E93',
        'gray': '#8E8E93',
        'red': '#FF3B30',
        'blue': '#007AFF',
        'green': '#34C759',
        'yellow': '#FFCC00',
        'orange': '#FF9500',
        'purple': '#AF52DE',
        'pink': '#FF2D55',
        'brown': '#A2845E',
        'beige': '#F5F5DC',
        'navy': '#0A192F',
        'cream': '#FFFDD0',
        'sand': '#C2B280',
        'olive': '#808000',
        'khaki': '#F0E68C',
        'charcoal': '#36454F',
        'burgundy': '#800020',
        'maroon': '#800000',
        'lavender': '#E6E6FA',
        'peach': '#FFDAB9',
        'teal': '#008080',
        'mustard': '#FFDB58',
        'rust': '#B7410E',
        'tan': '#D2B48C',
        'cappuccino': '#7B3F00',
        'crimson': '#DC143C',
        'indigo': '#4B0082',
        'violet': '#EE82EE',
        // Compound color names
        'light baby pink': '#FFB6C1',
        'baby pink': '#F4C2C2',
        'light pink': '#FFB6C1',
        'baby blue': '#89CFF0',
        'light blue': '#ADD8E6',
        'sky blue': '#87CEEB',
        'dark blue': '#00008B',
        'dark green': '#006400',
        'light grey': '#D3D3D3',
        'light gray': '#D3D3D3',
        'dark grey': '#696969',
        'dark gray': '#696969',
        'off white': '#FAF9F6',
        'coral': '#FF7F50',
        'mint': '#98FF98',
        'mint green': '#98FF98',
        'hot pink': '#FF69B4',
        'royal blue': '#4169E1',
        'forest green': '#228B22',
        'dusty pink': '#D4A5A5',
        'dusty rose': '#DCAE96',
        'sage': '#B2AC88',
        'sage green': '#B2AC88',
        'wine': '#722F37',
        'ivory': '#FFFFF0',
        'mauve': '#E0B0FF',
        'coral pink': '#F88379'
    };

    let swatchesHtml = '<div class="product-card-colors">';
    colorOption.values.forEach((val, index) => {
        const colorName = val.value.trim();
        const colorKey = colorName.toLowerCase();
        const hex = COLOR_HEX_MAP[colorKey] || colorName;
        
        // Find "color 1" image (primary) and "color 2" image (secondary/hover)
        let colorImg1 = '';
        let colorImg2 = '';
        if (product.images && product.images.length > 0) {
            const match1 = product.images.find(img => {
                const alt = (img.alt || '').toLowerCase().trim();
                return alt.includes(colorKey) && alt.endsWith('1') && !alt.includes('chart');
            });
            const match2 = product.images.find(img => {
                const alt = (img.alt || '').toLowerCase().trim();
                return alt.includes(colorKey) && alt.endsWith('2') && !alt.includes('chart');
            });
            if (match1) colorImg1 = match1.src;
            if (match2) colorImg2 = match2.src;
            
            // Fallback: any image containing the color name
            if (!colorImg1) {
                const fallback = product.images.find(img => {
                    const alt = (img.alt || '').toLowerCase();
                    return alt.includes(colorKey) && !alt.includes('chart');
                });
                if (fallback) colorImg1 = fallback.src;
            }
        }
        
        // Fallback to variant image
        if (!colorImg1 && product.variants) {
            const vMatch = product.variants.find(v => v.selectedOptions.some(opt => (opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour') && opt.value.toLowerCase() === colorKey));
            if (vMatch && vMatch.image) {
                colorImg1 = vMatch.image.src;
            }
        }

        const borderStyle = colorKey === 'white' || colorKey === '#ffffff' ? 'border: 1px solid rgba(255,255,255,0.4);' : '';

        swatchesHtml += `
            <span class="product-card-color-swatch ${index === 0 ? 'active' : ''}" 
                  style="background-color: ${hex}; ${borderStyle}" 
                  data-color="${escapeHTML(colorName)}" 
                  data-img1="${escapeHTML(colorImg1)}"
                  data-img2="${escapeHTML(colorImg2)}"
                  title="${escapeHTML(colorName)}">
            </span>
        `;
    });
    swatchesHtml += '</div>';
    return swatchesHtml;
}

function renderProducts(productList, targetGrid) {
    const grid = targetGrid || document.getElementById('product-grid');
    if (!grid) return;
    const list = productList || products;
    grid.innerHTML = '';
    if (list.length === 0) {
        grid.innerHTML = '<p style="color:var(--color-text-light);text-align:center;grid-column:1/-1;padding:3rem">No products found in this category.</p>';
        return;
    }
    list.forEach(product => {
        let primaryImgSrc = product.image;
        let secondaryImgSrc = null;

        if (product.images && product.images.length > 0) {
            const img1 = product.images.find(img => img.alt && img.alt.trim().endsWith('1'));
            const img2 = product.images.find(img => img.alt && img.alt.trim().endsWith('2'));
            
            if (img1) primaryImgSrc = img1.src;
            else primaryImgSrc = product.images[0].src;
            
            if (img2) secondaryImgSrc = img2.src;
            else if (product.images.length > 1) secondaryImgSrc = product.images[1].src;
        }

        const colorOption = product.options ? product.options.find(opt => opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour') : null;
        const defaultColor = colorOption && colorOption.values.length > 0 ? colorOption.values[0].value : '';

        const productCard = document.createElement('div');
        productCard.className = 'product-card reveal';
        productCard.innerHTML = `
            <div class="product-image-wrapper">
                <a href="product.html?id=${encodeURIComponent(product.id)}">
                    <img src="${primaryImgSrc}" alt="${escapeHTML(product.title)}" class="product-image product-image-primary" loading="lazy" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22500%22 viewBox=%220 0 400 500%22%3E%3Crect width=%22400%22 height=%22500%22 fill=%22%23f0f0f0%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22sans-serif%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22%23999%22%3EImage Placeholder%3C/text%3E%3C/svg%3E'">
                    ${secondaryImgSrc ? `<img src="${secondaryImgSrc}" alt="${escapeHTML(product.title)} Alternate" class="product-image product-image-secondary" loading="lazy">` : ''}
                </a>
                <div class="product-actions">
                    <button class="btn btn-primary w-100 add-to-cart-btn magnetic" data-id="${escapeHTML(product.id)}" data-selected-color="${escapeHTML(defaultColor)}">Add to Cart</button>
                </div>
            </div>
            <div class="product-info">
                <div>
                    <a href="product.html?id=${encodeURIComponent(product.id)}">
                        <h3 class="product-title">${escapeHTML(product.title)}</h3>
                    </a>
                    <p class="product-category">${escapeHTML(product.category)}</p>
                    ${renderCardColorSwatches(product)}
                </div>
                <div class="product-price"><span style="text-decoration: line-through; color: var(--color-text-light); margin-right: 8px; font-size: 0.9em;">₹${(product.price * 1.2).toFixed(2)}</span><span>₹${product.price.toFixed(2)}</span></div>
            </div>
        `;
        grid.appendChild(productCard);
    });

    if (!grid.dataset.listenerAdded) {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-to-cart-btn');
            if (btn) {
                e.preventDefault();
                openQuickAddModal(btn.dataset.id, btn.dataset.selectedColor);
            }
        });
        grid.dataset.listenerAdded = 'true';
    }

    if (!grid.dataset.swatchListenerAdded) {
        // Helper: update both primary and secondary images on a card
        function updateCardImages(card, img1Src, img2Src) {
            const primaryImg = card.querySelector('.product-image-primary');
            let secondaryImg = card.querySelector('.product-image-secondary');
            const imageLink = card.querySelector('.product-image-wrapper > a');

            if (primaryImg && img1Src) {
                primaryImg.src = img1Src;
            }

            if (img2Src) {
                if (secondaryImg) {
                    secondaryImg.src = img2Src;
                } else if (imageLink) {
                    // Create the secondary image element if it doesn't exist
                    secondaryImg = document.createElement('img');
                    secondaryImg.className = 'product-image product-image-secondary';
                    secondaryImg.loading = 'lazy';
                    secondaryImg.src = img2Src;
                    secondaryImg.alt = (primaryImg ? primaryImg.alt : '') + ' Alternate';
                    imageLink.appendChild(secondaryImg);
                }
            } else if (secondaryImg) {
                // No img2 for this color — remove secondary so hover doesn't show stale image
                secondaryImg.remove();
            }
        }

        grid.addEventListener('mouseover', (e) => {
            const swatch = e.target.closest('.product-card-color-swatch');
            if (swatch) {
                const card = swatch.closest('.product-card');
                updateCardImages(card, swatch.dataset.img1, swatch.dataset.img2);
                
                const swatches = card.querySelectorAll('.product-card-color-swatch');
                swatches.forEach(s => s.classList.remove('hovered'));
                swatch.classList.add('hovered');
            }
        });

        grid.addEventListener('mouseout', (e) => {
            const swatch = e.target.closest('.product-card-color-swatch');
            if (swatch) {
                const card = swatch.closest('.product-card');
                const activeSwatch = card.querySelector('.product-card-color-swatch.active');
                
                if (activeSwatch) {
                    updateCardImages(card, activeSwatch.dataset.img1, activeSwatch.dataset.img2);
                } else {
                    // Fallback: revert to original product images
                    const addBtn = card.querySelector('.add-to-cart-btn');
                    if (addBtn) {
                        const product = (productList || products).find(p => p.id === addBtn.dataset.id);
                        if (product) {
                            const primaryImg = card.querySelector('.product-image-primary');
                            if (primaryImg) primaryImg.src = product.image;
                        }
                    }
                }
                swatch.classList.remove('hovered');
            }
        });

        grid.addEventListener('click', (e) => {
            const swatch = e.target.closest('.product-card-color-swatch');
            if (swatch) {
                e.preventDefault();
                e.stopPropagation();
                
                const card = swatch.closest('.product-card');
                const swatches = card.querySelectorAll('.product-card-color-swatch');
                swatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                
                updateCardImages(card, swatch.dataset.img1, swatch.dataset.img2);
                
                const addBtn = card.querySelector('.add-to-cart-btn');
                if (addBtn) {
                    addBtn.dataset.selectedColor = swatch.dataset.color;
                }
            }
        });

        grid.dataset.swatchListenerAdded = 'true';
    }

    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        grid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--x', `${e.clientX - rect.left}px`);
                card.style.setProperty('--y', `${e.clientY - rect.top}px`);
            });
        });
        grid.querySelectorAll('a, button, input, .product-image-wrapper, .product-card-color-swatch').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
        });
        grid.querySelectorAll('.magnetic').forEach(btn => {
            btn.addEventListener('mousemove', e => {
                const rect = btn.getBoundingClientRect();
                btn.style.transform = `translate(${(e.clientX - rect.left - rect.width / 2) * 0.3}px, ${(e.clientY - rect.top - rect.height / 2) * 0.3}px)`;
            });
            btn.addEventListener('mouseleave', () => btn.style.transform = 'translate(0px, 0px)');
        });
    }

    if (typeof gsap !== 'undefined') {
        gsap.to('.product-card', {
            y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out",
            onComplete: () => document.querySelectorAll('.product-card').forEach(el => el.classList.remove('reveal'))
        });
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }
}

let quickAddEscapeHandler = null;

function openQuickAddModal(productId, preselectedColor) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('quick-add-modal');
    if (!modal) return;

    const modalImg = document.getElementById('quick-add-img');
    const modalTitle = document.getElementById('quick-add-title');
    const modalCategory = document.getElementById('quick-add-category');
    const modalPrice = document.getElementById('quick-add-price');
    const optionsContainer = document.getElementById('quick-add-options-container');
    const qtyValue = document.getElementById('quick-add-qty-value');
    const submitBtn = document.getElementById('quick-add-submit-btn');

    if (!modalImg || !modalTitle || !modalCategory || !modalPrice || !optionsContainer || !qtyValue || !submitBtn) return;

    // Reset quantity
    let currentQty = 1;
    qtyValue.textContent = currentQty;

    // Set basic product details
    modalTitle.textContent = product.title;
    modalCategory.textContent = product.category;
    modalPrice.innerHTML = `<span style="text-decoration: line-through; color: var(--color-text-light); margin-right: 8px; font-size: 0.9em;">₹${(product.price * 1.2).toFixed(2)}</span><span>₹${product.price.toFixed(2)}</span>`;
    
    // Set initial image
    modalImg.src = product.image;
    modalImg.alt = product.title;

    let selectedOptions = {};

    // Options rendering
    optionsContainer.innerHTML = '';
    if (product.options) {
        product.options.forEach(option => {
            if (option.name === 'Title' && option.values[0].value === 'Default Title') return;
            
            // Sort size option
            if (option.name.toLowerCase() === 'size') {
                const sizeOrder = { 'xxs':1,'xs':2,'s':3,'m':4,'l':5,'xl':6,'xxl':7,'2xl':7,'xxxl':8,'3xl':8 };
                option.values = [...option.values].sort((a,b) => { 
                    const va=a.value.toLowerCase().trim(), vb=b.value.toLowerCase().trim(); 
                    return (sizeOrder[va]||(isNaN(parseInt(va))?99:parseInt(va)))-(sizeOrder[vb]||(isNaN(parseInt(vb))?99:parseInt(vb))); 
                });
            }

            // Pre-select first option value or the pre-selected color
            if ((option.name.toLowerCase() === 'color' || option.name.toLowerCase() === 'colour') && preselectedColor) {
                const hasColor = option.values.some(val => val.value.toLowerCase() === preselectedColor.toLowerCase());
                if (hasColor) {
                    const matchVal = option.values.find(val => val.value.toLowerCase() === preselectedColor.toLowerCase());
                    selectedOptions[option.name] = matchVal.value;
                } else {
                    selectedOptions[option.name] = option.values[0].value;
                }
            } else {
                selectedOptions[option.name] = option.values[0].value;
            }


            const group = document.createElement('div');
            group.className = 'variant-group';
            group.innerHTML = `<h4 class="variant-title">${escapeHTML(option.name)}</h4>`;
            
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
                    updateQuickAddVariantUI();
                });
                btnGroup.appendChild(btn);
            });
            group.appendChild(btnGroup);
            optionsContainer.appendChild(group);
        });
    }

    function updateQuickAddVariantUI() {
        if (!product.variants) return;
        const selectedVariant = product.variants.find(v => 
            v.selectedOptions.every(opt => selectedOptions[opt.name] === opt.value)
        );
        if (selectedVariant) {
            modalPrice.innerHTML = `<span style="text-decoration: line-through; color: var(--color-text-light); margin-right: 8px; font-size: 0.9em;">₹${(parseFloat(selectedVariant.price.amount) * 1.2).toFixed(2)}</span><span>₹${parseFloat(selectedVariant.price.amount).toFixed(2)}</span>`;
            if (selectedVariant.image && selectedVariant.image.src) {
                modalImg.src = selectedVariant.image.src;
            } else {
                modalImg.src = product.image;
            }
            submitBtn.dataset.variantId = selectedVariant.id;
            submitBtn.textContent = selectedVariant.available ? 'Add to Cart' : 'Out of Stock';
            submitBtn.disabled = !selectedVariant.available;
        } else {
            submitBtn.dataset.variantId = '';
            submitBtn.textContent = 'Unavailable';
            submitBtn.disabled = true;
        }
    }

    // Call update UI once initially
    updateQuickAddVariantUI();

    // Quantity selectors
    const decreaseBtn = document.getElementById('quick-add-qty-decrease');
    const increaseBtn = document.getElementById('quick-add-qty-increase');
    
    // Clear old quantity listeners
    decreaseBtn.onclick = () => {
        if (currentQty > 1) {
            currentQty--;
            qtyValue.textContent = currentQty;
        }
    };
    
    increaseBtn.onclick = () => {
        if (currentQty < MAX_CART_LIMIT_PER_ITEM) {
            currentQty++;
            qtyValue.textContent = currentQty;
        } else {
            showToastNotification(`For security reasons, you can purchase a maximum of ${MAX_CART_LIMIT_PER_ITEM} units of this item.`, 'error');
        }
    };

    // Add to cart submit
    submitBtn.onclick = () => {
        const targetVariantId = submitBtn.dataset.variantId || product.shopifyVariantId;
        addToCart(product.id, targetVariantId, currentQty);
        closeQuickAddModal();
    };

    // Close handlers
    const closeBtn = document.getElementById('close-quick-add');
    closeBtn.onclick = closeQuickAddModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeQuickAddModal();
    };

    // Escape handler
    if (quickAddEscapeHandler) {
        window.removeEventListener('keydown', quickAddEscapeHandler);
    }
    quickAddEscapeHandler = (e) => {
        if (e.key === 'Escape') closeQuickAddModal();
    };
    window.addEventListener('keydown', quickAddEscapeHandler);

    // Apply active class to show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Custom cursor hover styling
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        modal.querySelectorAll('button, input').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
        });
    }
}

function closeQuickAddModal() {
    const modal = document.getElementById('quick-add-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = '';
    if (quickAddEscapeHandler) {
        window.removeEventListener('keydown', quickAddEscapeHandler);
        quickAddEscapeHandler = null;
    }
}

