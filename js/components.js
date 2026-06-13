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
                    <span>COD AVAILABLE</span>
                    <span>PREMIUM QUALITY GUARANTEED</span>
                    <span>COD AVAILABLE</span>
                    <span>PREMIUM QUALITY GUARANTEED</span>
                    <span>COD AVAILABLE</span>
                    <span>PREMIUM QUALITY GUARANTEED</span>
                    <span>COD AVAILABLE</span>
                    <span>PREMIUM QUALITY GUARANTEED</span>
                </div>
            </div>

            <canvas id="interactive-bg"></canvas>
            <div class="dragon-bg"></div>

            <!-- Custom Cursor -->
            <div class="custom-cursor" id="custom-cursor"></div>

            <!-- Navigation -->
            <nav class="navbar ${isAuthPage ? 'scrolled' : ''}">
                <div class="nav-container">
                    <!-- Hamburger Menu Button (Mobile Only) -->
                    <button class="hamburger-menu-btn" id="mobile-menu-toggle" aria-label="Toggle Menu">
                        <span class="hamburger-bar"></span>
                        <span class="hamburger-bar"></span>
                        <span class="hamburger-bar"></span>
                    </button>

                    <a href="index.html" class="logo"><img src="assets/logo.png" alt="GRIT" class="logo-image"></a>
                    ${isAuthPage ? `
                    <div class="nav-links">
                        <a href="collection.html?category=men">Men</a>
                        <a href="collection.html?category=women">Women</a>
                        <a href="collection.html?category=anime">Anime</a>
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
                            <a href="collection.html?category=anime">Anime</a>
                            <div class="dropdown-content">
                                <a href="collection.html?category=anime#section-shirts">Shirts</a>
                                <a href="collection.html?category=anime#section-t-shirts">T-Shirts</a>
                                <a href="collection.html?category=anime#section-shorts">Shorts</a>
                                <a href="collection.html?category=anime#section-hoodie">Hoodie</a>
                                <a href="collection.html?category=anime#section-sweatshirt">Sweatshirt</a>
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

    // Overlays Injection (Search, Wishlist, Cart Drawers, Loader)
    const siteOverlays = document.getElementById('site-overlays');
    if (siteOverlays) {
        siteOverlays.innerHTML = `
            <!-- Global Page Loader -->
            <div id="page-loader" class="page-loader">
                <div class="loader-content">
                    <img src="assets/logo.png" alt="GRIT Loading" class="loader-logo">
                    <div class="spinner"></div>
                </div>
            </div>

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

            <!-- Quick Add / Variant Selection Modal -->
            <div class="modal-overlay" id="quick-add-modal">
                <div class="modal-content quick-add-content">
                    <button class="close-modal" id="close-quick-add" aria-label="Close Modal">&times;</button>
                    <div class="quick-add-grid">
                        <div class="quick-add-image-sec">
                            <img src="" alt="Product Image" id="quick-add-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22500%22 viewBox=%220 0 400 500%22%3E%3Crect width=%22400%22 height=%22500%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E'">
                        </div>
                        <div class="quick-add-info-sec">
                            <span class="quick-add-category" id="quick-add-category"></span>
                            <h2 class="quick-add-title" id="quick-add-title"></h2>
                            <div class="quick-add-price" id="quick-add-price"></div>
                            
                            <div class="quick-add-options" id="quick-add-options-container">
                                <!-- Dynamic options (Size, Color) will be injected here -->
                            </div>

                            <div class="quick-add-qty-container">
                                <h4 class="variant-title">Quantity</h4>
                                <div class="quantity-selector">
                                    <button class="quantity-btn" id="quick-add-qty-decrease">-</button>
                                    <span class="quantity-value" id="quick-add-qty-value">1</span>
                                    <button class="quantity-btn" id="quick-add-qty-increase">+</button>
                                </div>
                            </div>
                            
                            <button class="btn btn-primary w-100 magnetic" id="quick-add-submit-btn">Add to Cart</button>
                        </div>
                    </div>
                </div>
            </div>



            <!-- Mobile Navigation Drawer -->
            <div class="mobile-menu-overlay" id="mobile-menu-overlay">
                <div class="mobile-menu-drawer" id="mobile-menu-drawer">
                    <div class="mobile-menu-header">
                        <span class="mobile-menu-logo">GRIT</span>
                        <button class="close-mobile-menu" id="close-mobile-menu" aria-label="Close Menu">&times;</button>
                    </div>
                    <div class="mobile-menu-links">
                        <a href="index.html" class="mobile-nav-link">Home</a>
                        
                        <div class="mobile-nav-group">
                            <span class="mobile-nav-group-title">Collections</span>
                            <a href="collection.html?category=men" class="mobile-sub-link">Men's Apparel</a>
                            <a href="collection.html?category=women" class="mobile-sub-link">Women's Apparel</a>
                            <a href="collection.html?category=anime" class="mobile-sub-link">Anime</a>
                        </div>

                        <div class="mobile-nav-group">
                            <span class="mobile-nav-group-title">Company</span>
                            <a href="about.html" class="mobile-sub-link">About Our Brand</a>
                            <a href="contact.html" class="mobile-sub-link">Contact &amp; Support</a>
                        </div>
                    </div>
                    <div class="mobile-menu-footer">
                        <a href="login.html" class="btn btn-primary w-100" style="text-align:center;">My Account</a>
                    </div>
                </div>
            </div>
            
            <style>
                .logo-image {
                    height: 80px;
                    width: auto;
                    transition: height 0.3s ease;
                }
                .navbar.scrolled .logo-image {
                    height: 50px;
                }
                .navbar.scrolled .nav-container {
                    padding: 0.5rem 5%;
                }
                @media (max-width: 768px) {
                    .logo-image {
                        height: 50px;
                    }
                    .navbar.scrolled .logo-image {
                        height: 40px;
                    }
                    .navbar.scrolled .nav-container {
                        padding: 0.3rem 5%;
                    }
                }

                /* Hamburger Button (Mobile Only) */
                .hamburger-menu-btn {
                    display: none;
                    flex-direction: column;
                    justify-content: space-between;
                    width: 24px;
                    height: 16px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    z-index: 1001;
                }
                .hamburger-bar {
                    width: 100%;
                    height: 2px;
                    background-color: var(--color-text);
                    transition: all 0.3s ease;
                }
                
                /* Mobile Menu Overlay & Drawer */
                .mobile-menu-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    z-index: 2100;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.4s ease, visibility 0.4s;
                    pointer-events: auto;
                }
                .mobile-menu-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }
                .mobile-menu-drawer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 80%;
                    max-width: 320px;
                    height: 100%;
                    background: #121212;
                    border-right: 1px solid rgba(196, 159, 112, 0.2);
                    padding: 2.5rem 1.8rem;
                    display: flex;
                    flex-direction: column;
                    transform: translateX(-100%);
                    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .mobile-menu-overlay.active .mobile-menu-drawer {
                    transform: translateX(0);
                }
                .mobile-menu-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3.5rem;
                }
                .mobile-menu-logo {
                    font-size: 1.5rem;
                    font-weight: 700;
                    letter-spacing: 2px;
                    color: var(--color-text);
                    font-family: 'Outfit', sans-serif;
                }
                .close-mobile-menu {
                    background: none;
                    border: none;
                    color: var(--color-text-light);
                    font-size: 2.5rem;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                }
                .close-mobile-menu:hover {
                    color: var(--color-primary);
                }
                .mobile-menu-links {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2.2rem;
                }
                .mobile-nav-link {
                    font-size: 1.25rem;
                    font-weight: 500;
                    color: var(--color-text);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    text-decoration: none;
                    font-family: 'Outfit', sans-serif;
                }
                .mobile-nav-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                }
                .mobile-nav-group-title {
                    font-size: 0.8rem;
                    color: var(--color-text-light);
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin-bottom: 0.4rem;
                    font-family: 'Outfit', sans-serif;
                }
                .mobile-sub-link {
                    font-size: 1.05rem;
                    color: rgba(255, 255, 255, 0.85);
                    text-decoration: none;
                    transition: color 0.2s;
                    font-family: 'Outfit', sans-serif;
                }
                .mobile-sub-link:hover {
                    color: var(--color-primary);
                }
                .mobile-menu-footer {
                    margin-top: auto;
                }


                @media (max-width: 768px) {
                    .hamburger-menu-btn {
                        display: flex;
                    }
                }
            </style>
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
                            <a href="collection.html?category=anime">Anime</a>
                        </div>
                        <div class="footer-links">
                            <h4>Support</h4>
                            <a href="contact.html#faq">FAQ</a>
                            <a href="contact.html">Contact Us</a>
                            <a href="shipping-policy.html">Shipping Policy</a>
                            <a href="refund-policy.html">Refund &amp; Returns</a>
                        </div>
                        <div class="footer-links">
                            <h4>Company</h4>
                            <a href="about.html">About Us</a>
                            <a href="privacy.html">Privacy Policy</a>
                            <a href="terms.html">Terms of Service</a>
                            <a href="login.html">My Account</a>
                        </div>
                        <div class="footer-links">
                            <h4>Follow Us</h4>
                            <a href="https://www.instagram.com/grit__nation?igsh=MTZ2bHFzeXU5OTF3Zg==" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:0.4rem;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
                                Instagram
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
