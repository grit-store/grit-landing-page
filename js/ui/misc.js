// ============ NEWSLETTER & ANALYTICS ============

function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Subscribe';

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletter-email');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subscribing...';
        }

        try {
            // Save to Firebase Firestore if initialized
            if (typeof db !== 'undefined' && db) {
                await db.collection('newsletter_subscribers').add({
                    email: email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    dateString: new Date().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    })
                });
            } else {
                // Fallback to LocalStorage
                const subs = JSON.parse(localStorage.getItem('grit_newsletter') || '[]');
                if (!subs.includes(email)) {
                    subs.push(email);
                    localStorage.setItem('grit_newsletter', JSON.stringify(subs));
                }
            }

            form.style.display = 'none';
            const successEl = document.getElementById('newsletter-success');
            if (successEl) successEl.style.display = 'block';
        } catch (error) {
            console.warn('Firebase newsletter signup failed, falling back to LocalStorage:', error);
            const subs = JSON.parse(localStorage.getItem('grit_newsletter') || '[]');
            if (!subs.includes(email)) {
                subs.push(email);
                localStorage.setItem('grit_newsletter', JSON.stringify(subs));
            }
            form.style.display = 'none';
            const successEl = document.getElementById('newsletter-success');
            if (successEl) successEl.style.display = 'block';
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

function initAnalytics() {
    if (!GA_ID || GA_ID === 'G-XXXXXXXXXX' || GA_ID.includes('XXXX')) {
        console.info('Google Analytics tracking not configured. Skipping initialization.');
        return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
}
