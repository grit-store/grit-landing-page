# GRIT Codebase — Production Readiness Audit

> Reviewed by: Senior Software Engineer perspective  
> Scope: Security, Shopify Integration, Payment Gateway, Bug Fixes, Edge Cases, Code Quality

---

## 🔴 CRITICAL — Security Vulnerabilities (Fix Before Launch)

### 1. Storefront API Token Exposed in Client-Side Code
**Files:** `auth.js`, `main.js`, `test_sdk.js`, `test_cart.js`, `test.js`

The Shopify Storefront Access Token (`876d4d48bd342fa15609c3a55aa20c29`) is hardcoded in multiple client-side JavaScript files. While Storefront tokens are technically designed for public use, they should still be environment-scoped.

**Bigger problem:** The test files (`test_sdk.js`, `test_cart.js`, `test.js`) are sitting in the same directory as production code and will be served to the public. These expose your store domain and token, and provide a blueprint for API abuse.

**Fix:**
- Delete all `test_*.js` files from the repo before deployment.
- Move sensitive config to a `.env` file or a backend proxy.
- Enforce token rotation and rate limits in Shopify admin.

---

### 2. No CSRF Protection on Contact Form
**File:** `contact.html`

The contact form submits directly to `localStorage` with zero validation beyond empty-field checks. While it doesn't hit a server, if this is later connected to a backend, there is no anti-CSRF token or honeypot field, making it trivially spammable.

**Fix:**
- Add a honeypot hidden field.
- If connecting to a backend later, implement CSRF tokens.

---

### 3. `innerHTML` Used With Shopify Data (XSS Risk)
**File:** `main.js` — `renderProducts()`, `updateCartUI()`, `renderCategorySections()`, `renderReviews()`

Product titles, category names, and user-submitted review content (`r.title`, `r.body`, `r.userName`) are inserted directly via `innerHTML` without sanitization. A malicious product title or review in Shopify/Firestore could inject arbitrary HTML/JS.

**Example (line in `renderReviews`):**
```js
<h4>${r.title}</h4>   // r.title is unsanitized user input
<p>${r.body}</p>       // r.body is unsanitized user input
```

**Fix:**
```js
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
// Then use escapeHTML(r.title), escapeHTML(r.body) everywhere
```

---

### 4. Firebase Config Exposed With Write Access
**File:** `main.js`

The full Firebase project config including `apiKey` is hardcoded in the client bundle. Anyone can use these credentials to write unlimited fake reviews to your Firestore database.

**Fix:**
- Add Firestore Security Rules that restrict writes to authenticated users who have actually purchased the product (verify via a Cloud Function, not client-side).
- Current Firestore rules likely default to open read/write — verify in Firebase console immediately.
- Minimum rule needed:
```
match /reviews/{reviewId} {
  allow read: if true;
  allow write: if request.auth != null; // Even this is insufficient alone
}
```

---

### 5. GA4 Measurement ID Is a Placeholder in Production Code
**File:** `main.js` — `initAnalytics()`

```js
const gaId = 'G-XXXXXXXXXX';
```

This placeholder is being injected into every page load, making a live network request to Google Tag Manager with a fake ID. This will throw console errors on every page and pollute GTM infrastructure.

**Fix:** Replace with a real ID or remove the `initAnalytics()` call entirely until it's set up.

---

## 🔴 CRITICAL — Payment / Shopify Integration Bugs

### 6. Base64 Decode Logic Is Unreliable for Variant IDs
**File:** `auth.js` — `createCheckoutUrl()`

```js
if (!decodedId.includes('gid://')) {
  try { decodedId = atob(decodedId); } catch(e) {}
}
```

The Shopify JS Buy SDK v2 returns variant IDs as Base64-encoded GIDs (e.g., `gid://shopify/ProductVariant/123` encoded in base64). The `atob()` decode is inside a silent `catch(e) {}` — if decoding fails for any reason, the original broken ID is silently passed to the Cart API, causing the checkout mutation to fail with no user-facing error.

**Fix:**
- Log the error at minimum.
- Validate the decoded string starts with `gid://shopify/` before using it.
- Add a user-facing error message if checkout creation fails.

---

### 7. Cart Is Cleared Before Confirming Shopify Redirect
**File:** `main.js` — `proceedToShopifyCheckout()`

```js
setTimeout(() => {
  cart = [];
  saveCart();
  updateCartUI();
}, 500);

window.location.href = checkoutUrl;
```

The cart is wiped 500ms after redirect begins, *before* the user actually completes payment. If they abandon the Shopify checkout and press Back, their cart is empty. This is a direct revenue loss bug.

**Fix:** Only clear the cart after receiving a confirmed order webhook (server-side), or store a `pendingCheckout` flag and only clear after verifying payment.

---

### 8. `saveOrder()` in `auth.js` Does Nothing
**File:** `auth.js`

```js
saveOrder(orderData) {
  console.log("Order placed natively on Shopify...");
}
```

This method is called in `main.js` during checkout but is completely non-functional — it only logs to console. If order history is expected to update immediately after purchase, it won't.

**Fix:** Either remove the call to `saveOrder()` in `main.js` entirely (since Shopify is the source of truth), or implement a proper post-purchase confirmation flow using Shopify webhooks.

---

### 9. No Checkout Error Shown to User on Variant ID Failure
**File:** `main.js` — `proceedToShopifyCheckout()`

```js
} catch (error) {
  alert("Checkout Error: " + (error.message || JSON.stringify(error)));
```

Using `alert()` in production is a poor UX anti-pattern. It's also missing for the `auth.createCheckoutUrl` path — if the cart contains a product with a null/undefined `shopifyVariantId` (which can happen if `addToCart` is called before products finish loading), the entire checkout silently fails.

**Fix:**
- Replace `alert()` with an inline error message in the cart drawer.
- Guard against null `shopifyVariantId` before allowing "Add to Cart".

---

### 10. Cart Persists Across Users on Shared Devices
**File:** `main.js`

The cart is stored in `localStorage` with the key `'cart'` — not namespaced to the logged-in user. If User A checks out and User B logs in on the same browser, User B sees User A's cart.

**Fix:** Namespace the cart key by user ID: `cart_${auth.getUser()?.id || 'guest'}`.

---

## 🟠 HIGH — Authentication & Session Bugs

### 11. Token Expiry Check Is Insufficient
**File:** `auth.js` — `isLoggedIn()`

```js
if (new Date(this.token.expiresAt) < new Date()) {
  this.logout();
  return false;
}
```

`this.token` is parsed from `localStorage` in the constructor but if `localStorage` is cleared by the browser (e.g., private browsing session ends, storage quota exceeded), `this.token` will be `null` and `this.token.expiresAt` will throw a `TypeError`, crashing the entire `AuthService` instance silently.

**Fix:** Add a null check: `if (!this.token || !this.token.expiresAt)`.

---

### 12. `account.html` Uses Stale `auth.getUser()` Before Async Fetch Completes
**File:** `account.html` inline script

```js
const u = auth.getUser();
if (u) {
  const fullNameEl = document.getElementById('user-name-display-full');
  if (fullNameEl) fullNameEl.textContent = u.name; // u.name doesn't exist
}
```

Two bugs here:
1. The Shopify customer object uses `firstName`/`lastName`, not `name`. `u.name` will always be `undefined`.
2. This script runs before `auth.js`'s `DOMContentLoaded` handler (which calls `auth.fetchUser()`), so it reads stale cached data.

**Fix:** Remove the inline script and handle all user display within the `DOMContentLoaded` block in `auth.js`, using `user.firstName` and `user.lastName`.

---

### 13. Logout Redirects to `index.html` — No Return URL
**File:** `auth.js` — `logout()`

```js
window.location.href = 'index.html';
```

If a session expires while on a protected page (e.g., `account.html`), the user is silently redirected with no explanation. If they were mid-checkout, context is lost entirely.

**Fix:** Store the intended destination in `sessionStorage` before redirecting to login, then redirect back after successful auth.

---

## 🟠 HIGH — Shopify Data & Product Logic Bugs

### 14. `fetchAll()` Doesn't Paginate — Will Miss Products Over 250
**File:** `main.js` — `fetchShopifyProducts()`

`shopifyClient.product.fetchAll()` from the JS Buy SDK v2 fetches a maximum of 250 products by default. If the store grows beyond 250 products, they will silently not appear.

**Fix:**
```js
// Use pagination
let allProducts = [];
let pageProducts = await shopifyClient.product.fetchAll(250);
allProducts = allProducts.concat(pageProducts);
while (pageProducts.nextPageQueryAndPath()) {
  pageProducts = await shopifyClient.fetchNextPage(pageProducts);
  allProducts = allProducts.concat(pageProducts);
}
```

---

### 15. Collection Page Renders Nothing Until `fetchShopifyProducts()` Completes Twice
**File:** `main.js`

`loadCollectionPage()` is called both from `init()` (before products are fetched) and again inside `fetchShopifyProducts()` after data loads. The first call renders with an empty `products` array (showing nothing or "No products found"). The skeleton loaders are then replaced with empty content before real data arrives.

**Fix:** Only call `loadCollectionPage()` from inside `fetchShopifyProducts()` after products are confirmed loaded. Remove the call in `init()`.

---

### 16. `isProductInCategory()` — "Others" Logic Is Inverted
**File:** `main.js`

```js
if (cat === 'others') {
  const isMen = /\b(men's|mens|men)\b/.test(searchString);
  const isWomen = /\b(women's|womens|women)\b/.test(searchString);
  const isUnisex = /\bunisex\b/.test(searchString);
  if ((!isMen && !isWomen) || isUnisex) return true;
```

A product tagged `unisex` will match "others" even if it is also tagged "men" or "women", meaning it will appear in three categories at once. Unisex products should be intentionally categorized; they should not bleed into "Others" by default.

**Fix:** Define explicit Shopify collections or tags for "Others" category rather than relying on absence of gender tags.

---

### 17. `renderProducts()` Appends Event Listeners on Each Call
**File:** `main.js`

```js
const addButtons = document.querySelectorAll('.add-to-cart-btn');
addButtons.forEach(btn => {
  btn.addEventListener('click', (e) => { ... });
});
```

This uses `querySelectorAll` on the entire document, not just the newly rendered grid. Every time `renderProducts()` is called (e.g., after filter change), *all* buttons on the page get an additional event listener, meaning clicking "Add to Cart" after two filter changes adds the item to cart three times.

**Fix:** Use event delegation on the grid container instead:
```js
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart-btn');
  if (btn) addToCart(btn.dataset.id);
});
```

---

### 18. Hero Slideshow `initHeroSlideshow()` Called Multiple Times
**File:** `main.js`

`initHeroSlideshow()` is called in `init()` and again inside `fetchShopifyProducts()`. Each call creates a new `setInterval` without clearing the old one (the `if (slideshowInterval) clearInterval(slideshowInterval)` guard is inside the function, but since `let slideshowInterval` is module-scoped, the second call correctly clears the first — however, if `fetchShopifyProducts()` throws before the second call, the original interval runs forever on stale DOM nodes).

**Fix:** Only call `initHeroSlideshow()` once, after Shopify images are injected.

---

## 🟡 MEDIUM — UX & Functionality Issues

### 19. "Add to Cart" on Collection Page Adds Default Variant Only
**File:** `main.js` — `renderProducts()`

The "Add to Cart" button on collection/index pages calls `addToCart(productId)` without a `variantId`. This always adds the first variant regardless of size or color. The user has never selected a variant at this point.

**Fix:** The "Add to Cart" on grid cards should navigate to the PDP, or open a quick-add modal with variant selection.

---

### 20. PDP Loads Blank If `products` Array Is Empty (Direct URL Access)
**File:** `main.js` — `loadProductDetail()`

If a user navigates directly to `product.html?id=XYZ` (e.g., from a shared link or Google), `loadProductDetail()` is called from `fetchShopifyProducts()` only after products load. But there's no loading state shown during this period — the user sees a blank PDP with "Loading..." for an indeterminate time. If Shopify API fails, they just see "Product not found" with no retry option.

**Fix:** Show a skeleton loader on the PDP while products are being fetched.

---

### 21. Review "Verified Buyer" Check Is Easily Gameable
**File:** `main.js` — `userHasPurchased()`

```js
return order.lineItems.edges.some(({ node: item }) =>
  item.title && item.title.toLowerCase().includes(productTitleLower)
);
```

This checks if any order contains an item whose title *includes* the product title string. A product named "T-Shirt" would match any order with any T-shirt variant. A bad actor could buy a cheap item with a similar name and leave a "Verified Buyer" review on any product.

**Fix:** Match on Shopify Product/Variant ID, not title string.

---

### 22. Mobile Navigation Is Hidden With No Hamburger Menu
**File:** `style.css`

```css
@media (max-width: 768px) {
  .nav-links {
    display: none; /* simple mobile menu hiding for now */
  }
}
```

The comment "for now" suggests this is a known placeholder. On mobile, there is no hamburger menu, no drawer, and no way to navigate to Men/Women/Others/About pages. This is a critical UX failure for mobile users.

**Fix:** Implement a proper mobile nav drawer.

---

### 23. `contact.html` Form Only Saves to `localStorage` — Data Is Never Sent
**File:** `contact.html`

Support tickets are stored only in `localStorage`. The support team has no way to see these messages. There is no email, webhook, or backend integration.

**Fix:** Integrate with a service like Formspree, EmailJS, or a serverless function to actually deliver messages.

---

### 24. `newsletter-form` Saves Only to `localStorage`
**File:** `main.js` — `initNewsletter()`

Same problem as the contact form. Newsletter subscriptions are stored locally per-browser and never reach Klaviyo, Mailchimp, or any email platform.

**Fix:** POST to a real email service API.

---

## 🟡 MEDIUM — Code Quality & Reliability

### 25. `initGSAPAnimations()` Called Before DOM Is Populated
**File:** `main.js` — `init()`

`initGSAPAnimations()` runs immediately on `DOMContentLoaded`, but `product-grid` is empty at that point (Shopify data hasn't loaded). The ScrollTrigger for `.product-card` elements finds no elements and registers no triggers. The `setTimeout` workaround in `fetchShopifyProducts()` is a band-aid.

**Fix:** Call `initGSAPAnimations()` only inside `fetchShopifyProducts()` after `renderProducts()` completes.

---

### 26. Firebase Initialized Even When Config Has Placeholder Values
**File:** `main.js`

```js
if (firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
  firebase.initializeApp(firebaseConfig);
}
```

The actual `projectId` is `"grit-store-37ece"` (not the placeholder), so Firebase always initializes. But the guard condition exists implying this was meant to be configurable. Any developer cloning this repo will immediately hit production Firebase.

**Fix:** Use environment-based configuration or a build step to inject these values.

---

### 27. `fuzzyMatch()` Character Loop Has a Logic Bug
**File:** `main.js`

```js
let i = 0;
for (let char of t) {
  if (char === adjusted[i]) i++;
  if (i === adjusted.length) return true;
}
```

This is a subsequence match, not a fuzzy match. "shr" would match "shirt" (s-h-r are in order), but would also match "shower" or "shrimp". For a search box, this produces irrelevant results for short queries.

**Fix:** Use a proper fuzzy matching library like `fuse.js`, or limit the subsequence match to strings longer than 5 characters.

---

### 28. `proceedToShopifyCheckout()` Has Dead Fallback Code Path
**File:** `main.js`

After the `auth.createCheckoutUrl` block, the flow always either redirects or throws. There is no path where `auth` is undefined that shows a helpful message — it just throws `"Auth service not initialized"` into an `alert()`.

**Fix:** Show an inline non-blocking error in the cart drawer.

---

### 29. `account.html` — `user-name-display-full` ID Never Populated by `auth.js`
**File:** `auth.js`, `account.html`

`auth.js` updates `user-name-display` (the header welcome text) but never updates `user-name-display-full` (the profile pane). The inline script in `account.html` tries to do this with `u.name` which doesn't exist in the Shopify customer schema. The profile pane will always show "Loading...".

**Fix:** In `auth.js` account handler, add:
```js
const fullNameEl = document.getElementById('user-name-display-full');
if (fullNameEl) fullNameEl.textContent = displayName;
```

---

### 30. Sort "Newest Arrivals" Uses String Comparison on Shopify GID
**File:** `main.js` — `applyFiltersAndSort()`

```js
} else if (sortValue === 'newest') {
  filtered.sort((a, b) => b.id.localeCompare(a.id));
}
```

Shopify product IDs are GID strings like `gid://shopify/Product/7819283`. Sorting these lexicographically does not produce creation order (string sort of `"7819283"` vs `"782"` will be wrong). It may appear to work for small stores but will break as IDs grow.

**Fix:** Request products from Shopify sorted by `CREATED_AT` descending, or store a `createdAt` field on the mapped product object.

---

## 🟡 MEDIUM — Performance

### 31. Interactive Background Dot Grid Has No Performance Guard
**File:** `main.js` — `initInteractiveBackground()`

At 1920×1080 with `dotSpacing = 30`, this creates **~2,304 dot objects**, each computed and redrawn on every `requestAnimationFrame` (60fps). On mobile or low-end devices, this will cause severe frame drops and battery drain. There is also no check for `prefers-reduced-motion`.

**Fix:**
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
if (window.innerWidth < 768) return; // skip on mobile
```
Also increase `dotSpacing` to 40–50 and reduce canvas resolution on mobile.

---

### 32. All Products Fetched and Stored in Memory With Full Image Sets
**File:** `main.js`

Every product's full image array (including all variant images and size charts) is stored in the `products` array in memory. For a store with 500 products averaging 5 images each, this is a large in-memory footprint in the browser.

**Fix:** For collection pages, only fetch product thumbnails (first image). Load full image sets only on the PDP via a dedicated single-product fetch.

---

## 🟢 LOW — Minor Issues

### 33. `style.css` `.footer-content` Grid Has Only 3 Columns But 5 Children
```css
grid-template-columns: 2fr 1fr 1fr;
```
But there are 5 footer sections (Brand, Shop, Support, Company, Follow Us). The last two wrap to a second row irregularly.

**Fix:** `grid-template-columns: 2fr 1fr 1fr 1fr 1fr;`

---

### 34. `about.html` and `contact.html` Do Not Call `main.js`
`about.html` loads `main.js` correctly. `contact.html` does **not** load `main.js`, so `initInteractiveBackground()` and `initCustomCursor()` are absent — inconsistent visual experience.

---

### 35. `product.html` Loads Firebase SDKs on Every Page — Including Non-PDP Pages
Firebase app/firestore SDKs are loaded in `product.html`'s `<script>` tags. These are ~80KB of JS loaded even before it's determined whether the product exists or reviews exist. Move to dynamic import.

---

### 36. `main.js` Is Loaded on `about.html` and `contact.html` But `fetchShopifyProducts()` Runs Anyway
On pages where no product grid exists, `fetchShopifyProducts()` still fires, making 2 unnecessary Shopify API calls (products + collections) on every page load.

**Fix:** Guard at the top:
```js
if (!window.location.pathname.includes('collection') && 
    !window.location.pathname.includes('product') && 
    !window.location.pathname.includes('index')) return;
```

---

### 37. No `rel="noopener noreferrer"` on Some External Links
Some `<a target="_blank">` links only have `rel="noopener"`. Best practice is `rel="noopener noreferrer"` to prevent the destination page from accessing `window.opener` and leaking referrer info.

---

### 38. `robots.txt` and `sitemap.xml` Are Missing
No SEO infrastructure is present. A production e-commerce store needs both.

---

### 39. No `Content-Security-Policy` Header
Without a CSP header, the site is vulnerable to XSS injection of external scripts. This is especially critical given the unsanitized `innerHTML` usage noted above.

---

### 40. HTTP `og:` Meta Tags Missing
`index.html` and all other pages are missing Open Graph and Twitter Card meta tags, meaning links shared to WhatsApp, Instagram, or X/Twitter will render with no image or description preview — a significant issue for a fashion brand.

---

## Summary Table

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 10 | Security + Payment |
| 🟠 High | 8 | Auth + Data bugs |
| 🟡 Medium | 12 | UX, Code quality, Performance |
| 🟢 Low | 8 | Minor polish |
| **Total** | **38** | |

---

## Recommended Fix Priority

1. **Immediately:** Delete `test_*.js` files, sanitize all `innerHTML`, fix Firebase security rules, fix cart-clear-before-payment bug.
2. **Before launch:** Fix mobile nav, wire up contact/newsletter to real services, replace placeholder GA4 ID, fix event listener accumulation bug, add CSP headers.
3. **Post-launch / iterative:** Pagination, performance guards, OG tags, sitemap.
