/**
 * components.js - Shared HTML Components Injector for GRIT
 * Dynamically injects the Announcement Bar, Navigation, Overlays (Cart/Wishlist/Search),
 * Custom Cursor, and Footers to prevent massive HTML code duplication across pages.
 */

function injectComponents() {
    const isAuthPage = location.pathname.includes('login.html') || location.pathname.includes('account.html');
    const isProductPage = location.pathname.includes('product.html');

    // Header Injection (Announcement Bar, Backgrounds, Custom Cursor, Navigation)
    const siteHeader = document.getElementById('site-header');
    if (siteHeader) {
        siteHeader.innerHTML = `
            <!-- Announcement Bar -->
            <div class="announcement-bar">
                <div class="marquee-content">
                    <span>FREE SHIPPING ON ORDERS OVER ₹5,000 | PREMIUM QUALITY GUARANTEED</span>
                    <span>FREE SHIPPING ON ORDERS OVER ₹5,000 | PREMIUM QUALITY GUARANTEED</span>
                    <span>FREE SHIPPING ON ORDERS OVER ₹5,000 | PREMIUM QUALITY GUARANTEED</span>
                    <span>FREE SHIPPING ON ORDERS OVER ₹5,000 | PREMIUM QUALITY GUARANTEED</span>
                </div>
            </div>

            <canvas id="interactive-bg"></canvas>
            <div class="dragon-bg"></div>

            <!-- Custom Cursor -->
            <div class="custom-cursor" id="custom-cursor"></div>

            <!-- Navigation -->
            <nav class="navbar ${isAuthPage ? 'scrolled' : ''}">
                <div class="nav-container">
                    <a href="index.html" class="logo"><img src="assets/logo.png" alt="GRIT" style="height: 90px; width: auto;"></a>
                    ${isAuthPage ? `
                    <div class="nav-links">
                        <a href="collection.html?category=men">Men</a>
                        <a href="collection.html?category=women">Women</a>
                        <a href="collection.html?category=others">Others</a>
                        <a href="about.html">About</a>
                    </div>
                    <div class="nav-actions">
                        <a href="index.html" class="icon-button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                        </a>
                    </div>
                    ` : `
                    <div class="nav-links">
                        <div class="nav-item-dropdown">
                            <a href="collection.html?category=men">Men</a>
                            <div class="dropdown-content">
                                <a href="collection.html?category=men#section-t-shirts">T-Shirts</a>
                                <a href="collection.html?category=men#section-shirt">Shirt</a>
                                <a href="collection.html?category=men#section-vest">Vest</a>
                                <a href="collection.html?category=men#section-sweatpants">Sweatpants</a>
                                <a href="collection.html?category=men#section-shorts">Shorts</a>
                                <a href="collection.html?category=men#section-jackets">Jackets</a>
                                <a href="collection.html?category=men#section-hoodie">Hoodie</a>
                            </div>
                        </div>
                        <div class="nav-item-dropdown">
                            <a href="collection.html?category=women">Women</a>
                            <div class="dropdown-content columns-2">
                                <a href="collection.html?category=women#section-t-shirt">T-Shirt</a>
                                <a href="collection.html?category=women#section-tank-top">Tank-Top</a>
                                <a href="collection.html?category=women#section-crop-top">Crop-Top</a>
                                <a href="collection.html?category=women#section-tube-top">Tube-Top</a>
                                <a href="collection.html?category=women#section-sports-bra">Sports-Bra</a>
                                <a href="collection.html?category=women#section-crop-tank">Crop-Tank</a>
                                <a href="collection.html?category=women#section-mini-skirt">Mini-Skirt</a>
                                <a href="collection.html?category=women#section-pencil-skirt">Pencil-Skirt</a>
                                <a href="collection.html?category=women#section-legging">Legging</a>
                                <a href="collection.html?category=women#section-shorts">Shorts</a>
                                <a href="collection.html?category=women#section-dress">Dress</a>
                                <a href="collection.html?category=women#section-bomber-jacket">Bomber-Jacket</a>
                                <a href="collection.html?category=women#section-cropped-hoodie">Cropped Hoodie</a>
                            </div>
                        </div>
                        <div class="nav-item-dropdown">
                            <a href="collection.html?category=others">Others</a>
                            <div class="dropdown-content">
                                <a href="collection.html?category=others#section-shirts">Shirts</a>
                                <a href="collection.html?category=others#section-t-shirts">T-Shirts</a>
                                <a href="collection.html?category=others#section-shorts">Shorts</a>
                                <a href="collection.html?category=others#section-hoodie">Hoodie</a>
                                <a href="collection.html?category=others#section-sweatshirt">Sweatshirt</a>
                            </div>
                        </div>
                        <a href="about.html">About</a>
                    </div>
                    <div class="nav-actions">
                        <a href="login.html" id="account-link" class="icon-button" aria-label="Account">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </a>
                        <button id="search-toggle" class="icon-button" aria-label="Open Search">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>
                        <button id="wishlist-toggle" class="icon-button" aria-label="Open Wishlist">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        <button id="cart-toggle" class="icon-button" aria-label="Open Cart">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            <span class="cart-count">0</span>
                        </button>
                    </div>
                    `}
                </div>
            </nav>
        `;
    }

    // Overlays Injection (Search, Wishlist, Cart Drawers)
    const siteOverlays = document.getElementById('site-overlays');
    if (siteOverlays) {
        siteOverlays.innerHTML = `
            <!-- Search Overlay -->
            <div class="search-overlay" id="search-overlay">
                <div class="search-container">
                    <button class="close-search" id="close-search">&times;</button>
                    <input type="text" id="search-input" placeholder="Search products..." autocomplete="off">
                    <div class="search-results" id="search-results"></div>
                </div>
            </div>

            <!-- Wishlist Overlay -->
            <div class="cart-overlay" id="wishlist-overlay">
                <div class="cart-drawer">
                    <div class="cart-header">
                        <h2>Wishlist</h2>
                        <button class="close-cart" id="close-wishlist" aria-label="Close Wishlist">&times;</button>
                    </div>
                    <div class="cart-items" id="wishlist-items">
                        <p class="empty-cart-msg">Your wishlist is empty.</p>
                    </div>
                </div>
            </div>

            <!-- Cart Overlay -->
            <div class="cart-overlay" id="cart-overlay">
                <div class="cart-drawer">
                    <div class="cart-header">
                        <h2>Your Cart</h2>
                        <button class="close-cart" id="close-cart" aria-label="Close Cart">&times;</button>
                    </div>
                    
                    <!-- Shipping Progress Bar -->
                    <div class="shipping-progress-container" id="shipping-progress-container">
                        <p class="shipping-message" id="shipping-message">Add ₹5,000 to unlock free shipping.</p>
                        <div class="shipping-bar-bg">
                            <div class="shipping-bar-fill" id="shipping-bar-fill"></div>
                        </div>
                    </div>

                    <div class="cart-items" id="cart-items">
                        <p class="empty-cart-msg">Your cart is currently empty.</p>
                    </div>
                    <div class="cart-footer">
                        <div class="cart-total">
                            <span>Subtotal:</span>
                            <span id="cart-total-price">₹0.00</span>
                        </div>
                        <button class="btn btn-primary w-100" id="checkout-btn">Proceed to Checkout</button>
                    </div>
                </div>
            </div>

            ${isProductPage ? `
            <!-- Fullscreen Image Overlay -->
            <div class="fullscreen-overlay" id="fullscreen-overlay">
                <button class="close-fullscreen" id="close-fullscreen" aria-label="Exit Fullscreen">&times;</button>
                <div class="zoom-controls">
                    <button id="zoom-out" aria-label="Zoom Out">-</button>
                    <button id="zoom-in" aria-label="Zoom In">+</button>
                </div>
                <div class="fullscreen-image-container" id="fullscreen-image-container">
                    <img src="" alt="Fullscreen Product" id="fullscreen-image">
                </div>
            </div>
            ` : ''}
        `;
    }

    // Footer Injection
    const siteFooter = document.getElementById('site-footer');
    if (siteFooter) {
        if (isAuthPage) {
            siteFooter.innerHTML = `
                <footer class="site-footer">
                    <div class="footer-bottom">
                        <p>&copy; 2026 GRIT. All rights reserved.</p>
                    </div>
                </footer>
            `;
        } else {
            siteFooter.innerHTML = `
                <footer class="site-footer reveal">
                    <div class="footer-content">
                        <div class="footer-brand">
                            <h3>GRIT</h3>
                            <p>Modern essentials for the conscious mind.</p>
                        </div>
                        <div class="footer-links">
                            <h4>Shop</h4>
                            <a href="collection.html?category=men">Men</a>
                            <a href="collection.html?category=women">Women</a>
                            <a href="collection.html?category=others">Others</a>
                        </div>
                        <div class="footer-links">
                            <h4>Support</h4>
                            <a href="contact.html#faq">FAQ</a>
                            <a href="contact.html#shipping">Shipping &amp; Returns</a>
                            <a href="contact.html">Contact Us</a>
                        </div>
                        <div class="footer-links">
                            <h4>Company</h4>
                            <a href="about.html">About Us</a>
                            <a href="contact.html">Contact</a>
                            <a href="login.html">My Account</a>
                        </div>
                        <div class="footer-links">
                            <h4>Follow Us</h4>
                            <a href="https://www.instagram.com/grit__nation?igsh=MTZ2bHFzeXU5OTF3Zg==" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:0.4rem;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
                                Instagram
                            </a>
                            <a href="https://wa.me/919999999999" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:0.4rem;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                WhatsApp
                            </a>
                        </div>
                    </div>
                    <div class="footer-bottom">
                        <p>&copy; 2026 GRIT. All rights reserved.</p>
                    </div>
                </footer>
            `;
        }
    }
}

// Injects immediately if DOM is parsed, otherwise on DOMContentLoaded
if (document.getElementById('site-header')) {
    injectComponents();
} else {
    document.addEventListener('DOMContentLoaded', injectComponents);
}
