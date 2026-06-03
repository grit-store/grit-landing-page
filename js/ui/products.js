// ============ PRODUCT RENDERING ============

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
        const productCard = document.createElement('div');
        productCard.className = 'product-card reveal';
        productCard.innerHTML = `
            <div class="product-image-wrapper">
                <a href="product.html?id=${encodeURIComponent(product.id)}">
                    <img src="${product.image}" alt="${escapeHTML(product.title)}" class="product-image product-image-primary" loading="lazy" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22500%22 viewBox=%220 0 400 500%22%3E%3Crect width=%22400%22 height=%22500%22 fill=%22%23f0f0f0%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22sans-serif%22 font-size=%2220%22 text-anchor=%22middle%22 fill=%22%23999%22%3EImage Placeholder%3C/text%3E%3C/svg%3E'">
                    ${product.images && product.images.length > 1 ? `<img src="${product.images[1].src}" alt="${escapeHTML(product.title)} Alternate" class="product-image product-image-secondary" loading="lazy">` : ''}
                </a>
                <div class="product-actions">
                    <button class="btn btn-primary w-100 add-to-cart-btn magnetic" data-id="${escapeHTML(product.id)}">Add to Cart</button>
                </div>
            </div>
            <div class="product-info">
                <div>
                    <a href="product.html?id=${encodeURIComponent(product.id)}">
                        <h3 class="product-title">${escapeHTML(product.title)}</h3>
                    </a>
                    <p class="product-category">${escapeHTML(product.category)}</p>
                </div>
                <div class="product-price">₹${product.price.toFixed(2)}</div>
            </div>
        `;
        grid.appendChild(productCard);
    });

    if (!grid.dataset.listenerAdded) {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-to-cart-btn');
            if (btn) {
                e.preventDefault();
                openQuickAddModal(btn.dataset.id);
            }
        });
        grid.dataset.listenerAdded = 'true';
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
        grid.querySelectorAll('a, button, input, .product-image-wrapper').forEach(el => {
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

function openQuickAddModal(productId) {
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
    modalPrice.textContent = '₹' + product.price.toFixed(2);
    
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
                option.values.sort((a,b) => { 
                    const va=a.value.toLowerCase().trim(), vb=b.value.toLowerCase().trim(); 
                    return (sizeOrder[va]||(isNaN(parseInt(va))?99:parseInt(va)))-(sizeOrder[vb]||(isNaN(parseInt(vb))?99:parseInt(vb))); 
                });
            }

            // Pre-select first option value
            selectedOptions[option.name] = option.values[0].value;

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
            modalPrice.textContent = '₹' + parseFloat(selectedVariant.price.amount).toFixed(2);
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

