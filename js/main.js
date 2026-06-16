// ============ MAIN ORCHESTRATOR ============
// This file runs last and calls all the functions defined in the other JS files.

window.addEventListener('error', function(e) {
    console.error("Global JS Error:", e);
});

async function init() {
    try {
        await fetchShopifyProducts();
        setupEventListeners();
        updateCartUI();
        try {
            await syncCartOnStartup();
        } catch (syncErr) {
            console.warn("Startup cart sync failed:", syncErr);
        }
        updateWishlistUI();
        initGSAPAnimations();
        initCustomCursor();
        initHeroSlideshow();
        initSearch();
        initCategoryFilter();
        initInteractiveBackground();
        initUserStatus();
        initNewsletter();
        initAnalytics();

        hidePageLoader();
        interceptNavigation();

        if (window.location.pathname.includes('collection.html')) {
            loadCollectionPage();
        }
        if (window.location.pathname.includes('product.html')) {
            loadProductDetail();
        }
    } catch (e) {
        console.error("Initialization error:", e);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background:red;color:white;padding:10px;z-index:9999;position:fixed;top:0;left:0;width:100%;font-family:sans-serif;font-weight:bold;';
        errorDiv.textContent = `Initialization Error: ${e.message}`;
        document.body.prepend(errorDiv);
        hidePageLoader();
    }
}

document.addEventListener('DOMContentLoaded', init);

async function syncCartOnStartup() {
    if (typeof auth === 'undefined' || !auth.isLoggedIn()) return;
    const user = auth.getUser();
    if (!user || !user.email) return;

    const firestoreDb = await ensureFirebase();
    if (!firestoreDb) return;

    try {
        const cartDocRef = firestoreDb.collection('carts').doc(user.email);
        const doc = await cartDocRef.get();
        if (doc.exists) {
            const cloudCart = doc.data().items || [];
            
            // Merge cloudCart with local cart
            let mergedCart = [...cart];
            cloudCart.forEach(cloudItem => {
                const existingIndex = mergedCart.findIndex(
                    localItem => localItem.shopifyVariantId === cloudItem.shopifyVariantId
                );
                if (existingIndex > -1) {
                    const newQty = Math.min(
                        mergedCart[existingIndex].quantity + cloudItem.quantity,
                        MAX_CART_LIMIT_PER_ITEM
                    );
                    mergedCart[existingIndex].quantity = newQty;
                } else {
                    mergedCart.push(cloudItem);
                }
            });

            cart = mergedCart;
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();

            // Sync the merged cart back to the cloud
            await cartDocRef.set({
                items: cart,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Upload current local cart to Firestore if items exist
            if (cart.length > 0) {
                await cartDocRef.set({
                    items: cart,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    } catch (e) {
        console.warn("Error syncing cart on startup:", e);
    }
}

// ============ PAGE LOADER ============
function hidePageLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        // Slight delay to ensure smooth transition and allow assets to settle
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 300);
    }
}

function interceptNavigation() {
    document.addEventListener('click', function(e) {
        // Find closest anchor tag
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        
        // Ignore links that don't cause full page navigation
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target === '_blank' || link.hasAttribute('download')) {
            return;
        }

        // Show loader
        const loader = document.getElementById('page-loader');
        if (loader) {
            e.preventDefault();
            loader.classList.remove('hidden');
            
            // Navigate after a short delay to allow transition to start visually
            setTimeout(() => {
                window.location.href = link.href;
            }, 400); // 400ms delay for smooth transition
        }
    });
}
