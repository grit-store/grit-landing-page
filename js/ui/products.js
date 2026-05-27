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

    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            addToCart(e.target.dataset.id);
        });
    });

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
