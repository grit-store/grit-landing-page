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
    }
}

document.addEventListener('DOMContentLoaded', init);
