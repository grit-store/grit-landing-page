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
            <img src="${item.image}" alt="${escapeHTML(item.title)}" class="cart-item-img">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${escapeHTML(item.title)}</h4>
                <p class="cart-item-price"><span style="text-decoration: line-through; color: var(--color-text-light); margin-right: 4px; font-size: 0.85em;">₹${(item.price * 1.2).toFixed(2)}</span><span>₹${item.price.toFixed(2)}</span></p>
                <a href="product.html?id=${encodeURIComponent(item.id)}" class="btn btn-primary" style="font-size:0.75rem;padding:0.4rem 0.8rem;margin-top:0.5rem;display:inline-block;">View</a>
                <button class="remove-item" data-id="${escapeHTML(item.id)}" style="margin-top:0.5rem;">Remove</button>
            </div>
        `;
        container.appendChild(el);
    });
    container.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', e => {
            wishlist = wishlist.filter(i => i.id !== e.target.dataset.id);
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            updateWishlistUI();
        });
    });
}
