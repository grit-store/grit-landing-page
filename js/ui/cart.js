// ============ CART ============

const cartCountElements = document.querySelectorAll('.cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartOverlay = document.getElementById('cart-overlay');

function addToCart(productId, specificVariantId, quantityToAdd = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const targetVariantId = specificVariantId || product.shopifyVariantId;
    const existingItem = cart.find(item => item.shopifyVariantId === targetVariantId);
    if (existingItem) {
        if (existingItem.quantity + quantityToAdd > MAX_CART_LIMIT_PER_ITEM) {
            showToastNotification(`For security reasons, you can purchase a maximum of ${MAX_CART_LIMIT_PER_ITEM} units of this item.`, 'error');
            return;
        }
        existingItem.quantity += quantityToAdd;
    } else {
        const variant = product.variants ? product.variants.find(v => v.id === targetVariantId) : null;
        let cartTitle = product.title, cartPrice = product.price, cartImage = product.image;
        if (variant && variant.title && variant.title !== 'Default Title') {
            cartTitle = `${product.title} - ${variant.title.replace(' / ', ', ')}`;
            cartPrice = parseFloat(variant.price.amount);
            if (variant.image) cartImage = variant.image.src;
        }
        cart.push({ id: productId + '-' + targetVariantId, productId: product.id, title: cartTitle, category: product.category, price: cartPrice, image: cartImage, shopifyVariantId: targetVariantId, quantity: quantityToAdd });
    }
    if (typeof gtag === 'function') {
        gtag('event', 'add_to_cart', { currency: 'INR', value: product.price * quantityToAdd, items: [{ item_id: product.id, item_name: product.title, price: product.price, quantity: quantityToAdd }] });
    }
    saveCart(); updateCartUI(); openCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart(); updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        if (change > 0 && item.quantity + change > MAX_CART_LIMIT_PER_ITEM) {
            showToastNotification(`For security reasons, you can purchase a maximum of ${MAX_CART_LIMIT_PER_ITEM} units of this item.`, 'error');
            return;
        }
        item.quantity += change;
        if (item.quantity <= 0) cart = cart.filter(i => i.id !== productId);
        saveCart(); updateCartUI();
    }
}

function saveCart() { 
    localStorage.setItem('cart', JSON.stringify(cart)); 
    try {
        syncCartToFirebase();
    } catch (err) {
        console.warn("Real-time cart sync failed:", err);
    }
}

async function syncCartToFirebase() {
    if (typeof auth === 'undefined' || !auth.isLoggedIn()) return;
    const user = auth.getUser();
    if (!user || !user.email) return;

    const firestoreDb = await ensureFirebase();
    if (!firestoreDb) return;

    try {
        const cartDocRef = firestoreDb.collection('carts').doc(user.email);
        if (cart.length > 0) {
            await cartDocRef.set({
                items: cart,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await cartDocRef.delete();
        }
    } catch (e) {
        console.warn("Failed to sync cart changes to Firebase:", e);
    }
}

function openCart() {
    if (cartOverlay) cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeCart() {
    if (cartOverlay) cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function updateCartUI() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = totalItems);


    const container = document.getElementById('cart-items');
    const totalPriceEl = document.getElementById('cart-total-price');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart-msg">Your cart is currently empty.</p>';
        if (totalPriceEl) totalPriceEl.textContent = '₹0.00';

        return;
    }

    container.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.image}" alt="${escapeHTML(item.title)}" class="cart-item-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%22100%22 viewBox=%220 0 80 100%22%3E%3Crect width=%2280%22 height=%22100%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E'">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${escapeHTML(item.title)}</h4>
                <p class="cart-item-price">₹${item.price.toFixed(2)}</p>
                <div class="cart-item-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn decrease-qty" data-id="${escapeHTML(item.id)}">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn increase-qty" data-id="${escapeHTML(item.id)}">+</button>
                    </div>
                    <button class="remove-item" data-id="${escapeHTML(item.id)}">Remove</button>
                </div>
            </div>
        `;
        container.appendChild(itemEl);
    });

    if (totalPriceEl) totalPriceEl.textContent = '₹' + total.toFixed(2);


    container.querySelectorAll('.remove-item').forEach(btn => btn.addEventListener('click', e => removeFromCart(e.target.dataset.id)));
    container.querySelectorAll('.increase-qty').forEach(btn => btn.addEventListener('click', e => updateQuantity(e.target.dataset.id, 1)));
    container.querySelectorAll('.decrease-qty').forEach(btn => btn.addEventListener('click', e => updateQuantity(e.target.dataset.id, -1)));
}

async function proceedToShopifyCheckout() {
    if (cart.length === 0) return alert('Your cart is empty.');
    const checkoutBtn = document.getElementById('checkout-btn');
    const originalText = checkoutBtn ? checkoutBtn.textContent : 'Checkout';
    if (checkoutBtn) { checkoutBtn.textContent = 'Loading Secure Checkout...'; checkoutBtn.disabled = true; }
    try {
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        if (typeof gtag === 'function') {
            gtag('event', 'begin_checkout', { currency: 'INR', value: total, items: cart.map(item => ({ item_id: item.productId, item_name: item.title, price: item.price, quantity: item.quantity })) });
        }
        if (typeof auth !== 'undefined' && auth.createCheckoutUrl) {
            const checkoutUrl = await auth.createCheckoutUrl(cart.map(item => ({ variantId: item.shopifyVariantId, quantity: item.quantity })));
            if (auth.isLoggedIn()) {
                auth.saveOrder({ items: cart.map(item => ({ title: item.title, quantity: item.quantity, price: item.price })), total });
                setTimeout(() => { cart = []; saveCart(); updateCartUI(); }, 500);
            }
            window.location.href = checkoutUrl;
        } else {
            throw new Error("Auth service not initialized.");
        }
    } catch (error) {
        console.error("Checkout Error:", error);
        alert("Checkout Error: " + (error.message || JSON.stringify(error)));
        if (checkoutBtn) { checkoutBtn.textContent = originalText; checkoutBtn.disabled = false; }
    }
}
