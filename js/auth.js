/**
 * auth.js - Authentication & Account Management for GRIT
 * Uses Shopify Storefront API for real user persistence and order history.
 */

const API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`;

const AUTH_TOKEN_KEY = 'grit_shopify_access_token';
const AUTH_USER_KEY = 'grit_shopify_user';

class AuthService {
    constructor() {
        this.token = JSON.parse(localStorage.getItem(AUTH_TOKEN_KEY)) || null;
        this.currentUser = JSON.parse(localStorage.getItem(AUTH_USER_KEY)) || null;
    }

    async graphqlRequest(query, variables = {}) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN
            },
            body: JSON.stringify({ query, variables })
        });
        const json = await response.json();
        if (json.errors) {
            throw new Error(json.errors[0].message);
        }
        return json.data;
    }

    // Sign up a new user
    async signup(firstName, lastName, email, password) {
        const mutation = `
            mutation customerCreate($input: CustomerCreateInput!) {
                customerCreate(input: $input) {
                    customer { id }
                    customerUserErrors { message }
                }
            }
        `;
        const data = await this.graphqlRequest(mutation, {
            input: { firstName, lastName, email, password }
        });

        if (data.customerCreate.customerUserErrors.length > 0) {
            throw new Error(data.customerCreate.customerUserErrors[0].message);
        }

        // Auto-login after signup
        return await this.login(email, password);
    }

    // Login an existing user
    async login(email, password) {
        const mutation = `
            mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
                customerAccessTokenCreate(input: $input) {
                    customerAccessToken { accessToken expiresAt }
                    customerUserErrors { message }
                }
            }
        `;
        const data = await this.graphqlRequest(mutation, {
            input: { email, password }
        });

        if (data.customerAccessTokenCreate.customerUserErrors.length > 0) {
            throw new Error(data.customerAccessTokenCreate.customerUserErrors[0].message);
        }

        this.token = data.customerAccessTokenCreate.customerAccessToken;
        localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(this.token));
        
        await this.fetchUser();
        return this.currentUser;
    }

    // Fetch user details and orders
    async fetchUser() {
        if (!this.token) return null;

        const query = `
            query getCustomer($customerAccessToken: String!) {
                customer(customerAccessToken: $customerAccessToken) {
                    id
                    firstName
                    lastName
                    email
                    orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
                        edges {
                            node {
                                orderNumber
                                processedAt
                                financialStatus
                                fulfillmentStatus
                                totalPrice { amount }
                                lineItems(first: 20) {
                                    edges {
                                        node {
                                            title
                                            quantity
                                            variant {
                                                price { amount }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        try {
            const data = await this.graphqlRequest(query, {
                customerAccessToken: this.token.accessToken
            });

            if (!data.customer) {
                this.logout();
                throw new Error("Session expired. Please log in again.");
            }

            this.currentUser = data.customer;
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(this.currentUser));
            return this.currentUser;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    }

    // Logout
    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        window.location.href = 'index.html';
    }

    // Check if user is logged in
    isLoggedIn() {
        if (!this.token) return false;
        if (new Date(this.token.expiresAt) < new Date()) {
            // Token expired — clean up silently without redirecting
            this.token = null;
            this.currentUser = null;
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            return false;
        }
        return true;
    }

    // Mock save order since orders are fetched from Shopify now
    saveOrder(orderData) {
        // We no longer need to save orders locally. They are fetched from Shopify directly!
        console.log("Order placed natively on Shopify. History will update dynamically.");
    }

    // Get current user details
    getUser() {
        return this.currentUser;
    }

    // Create a native Storefront API checkout (Cart API)
    async createCheckoutUrl(items) {
        const lines = items.map(item => {
            return {
                merchandiseId: item.variantId,
                quantity: parseInt(item.quantity, 10)
            };
        });

        const mutation = `
            mutation cartCreate($input: CartInput!) {
                cartCreate(input: $input) {
                    cart { checkoutUrl }
                    userErrors { message }
                }
            }
        `;
        
        const data = await this.graphqlRequest(mutation, {
            input: { lines }
        });

        if (data.cartCreate.userErrors.length > 0) {
            throw new Error(data.cartCreate.userErrors[0].message);
        }

        return data.cartCreate.cart.checkoutUrl;
    }
}

// Global instance
const auth = new AuthService();

// Shared logic for the Login Page UI
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                
                tabs.forEach(t => t.classList.remove('active'));
                forms.forEach(f => f.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(target + '-form').classList.add('active');
            });
        });

        // Handle Signup
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = signupForm.querySelector('#signup-name').value;
                const email = signupForm.querySelector('#signup-email').value;
                const password = signupForm.querySelector('#signup-password').value;
                const errorEl = signupForm.querySelector('.auth-error');
                const btn = signupForm.querySelector('button[type="submit"]');

                try {
                    btn.disabled = true;
                    btn.textContent = 'Creating Account...';
                    errorEl.style.display = 'none';
                    
                    const nameParts = name.trim().split(' ');
                    const firstName = nameParts[0];
                    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
                    
                    await auth.signup(firstName, lastName, email, password);
                    window.location.href = 'account.html';
                } catch (err) {
                    errorEl.textContent = err.message;
                    errorEl.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Create Account';
                }
            });
        }

        // Handle Login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = loginForm.querySelector('#login-email').value;
                const password = loginForm.querySelector('#login-password').value;
                const errorEl = loginForm.querySelector('.auth-error');
                const btn = loginForm.querySelector('button[type="submit"]');

                try {
                    btn.disabled = true;
                    btn.textContent = 'Logging in...';
                    errorEl.style.display = 'none';
                    
                    await auth.login(email, password);
                    window.location.href = 'account.html';
                } catch (err) {
                    errorEl.textContent = err.message;
                    errorEl.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Sign In';
                }
            });
        }
    });
}

// Shared logic for Account Page UI
if (window.location.pathname.includes('account.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        if (!auth.isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }

        // Fetch fresh user data from Shopify
        await auth.fetchUser();
        const user = auth.getUser();
        
        // Update Profile Info
        const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email;
        document.getElementById('user-name-display').textContent = displayName;
        document.getElementById('user-email-display').textContent = user.email;
        
        // Update sidebar active state
        const navBtns = document.querySelectorAll('.account-nav-btn');
        const panes = document.querySelectorAll('.account-pane');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.pane;
                
                navBtns.forEach(b => b.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById('pane-' + target).classList.add('active');
            });
        });

        // Render Orders
        const orderList = document.getElementById('order-list');
        if (orderList) {
            const orders = user.orders?.edges || [];
            if (orders.length === 0) {
                orderList.innerHTML = '<p class="empty-cart-msg">You have no orders yet.</p>';
            } else {
                orderList.innerHTML = orders.map(({node: order}) => {
                    const date = new Date(order.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
                    const statusText = order.fulfillmentStatus === 'FULFILLED' ? '✓ Fulfilled' : '✓ Confirmed';
                    
                    return `
                    <div class="order-card">
                        <div class="order-header">
                            <span class="order-id">#${escapeHTML(order.orderNumber)}</span>
                            <span class="order-date">${escapeHTML(date)}</span>
                            <span class="order-status confirmed">${escapeHTML(statusText)}</span>
                        </div>
                        <div class="order-items">
                            ${order.lineItems.edges.map(({node: item}) => `
                                <div class="order-item">
                                    <span>${escapeHTML(item.title)} x ${item.quantity}</span>
                                    <span>₹${parseFloat(item.variant?.price?.amount || 0).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-total">Total: ₹${parseFloat(order.totalPrice.amount).toFixed(2)}</div>
                    </div>
                    `;
                }).join('');
            }
        }

        // Handle Logout
        const logoutBtn = document.getElementById('account-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => auth.logout());
        }
    });
}

