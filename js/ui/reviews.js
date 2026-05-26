// ============ REVIEWS (FIREBASE FIRESTORE) ============

// Initialize Firebase if SDK is present
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

function starsHTML(rating, size = '1.1rem') {
    return Array.from({ length: 5 }, (_, i) =>
        `<span style="color:${i < rating ? 'var(--color-primary)' : '#444'};font-size:${size};">★</span>`
    ).join('');
}

async function renderReviews(productId) {
    const listEl = document.getElementById('reviews-list');
    const avgEl = document.getElementById('reviews-avg');
    const starsEl = document.getElementById('reviews-stars');
    const countEl = document.getElementById('reviews-count');
    if (!listEl) return;

    let reviews = [];
    if (db && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
        try {
            const snapshot = await db.collection('reviews').where('productId', '==', String(productId)).orderBy('timestamp', 'desc').get();
            reviews = snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error("Error fetching reviews from Firebase:", error);
            listEl.innerHTML = '<p style="color:var(--color-text-light);">Unable to load reviews.</p>';
            return;
        }
    } else {
        const all = JSON.parse(localStorage.getItem('grit_product_reviews')) || {};
        reviews = all[productId] || [];
    }

    if (reviews.length === 0) {
        listEl.innerHTML = '<p style="color:var(--color-text-light);">No reviews yet. Be the first!</p>';
        if (avgEl) avgEl.textContent = '—';
        if (starsEl) starsEl.innerHTML = starsHTML(0);
        if (countEl) countEl.textContent = 'No reviews yet';
        return;
    }

    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    if (avgEl) avgEl.textContent = (Math.round(avg * 10) / 10).toFixed(1);
    if (starsEl) starsEl.innerHTML = starsHTML(Math.round(avg));
    if (countEl) countEl.textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`;

    listEl.innerHTML = reviews.map(r => `
        <div class="review-item">
            <div>${starsHTML(r.rating)}</div>
            <h4>${escapeHTML(r.title)}</h4>
            <p class="review-author">${escapeHTML(r.userName)} ${r.verified ? '<span class="verified">✓ Verified Buyer</span>' : ''} <span style="color:var(--color-text-light);font-size:0.8rem;margin-left:0.5rem;">${escapeHTML(r.date)}</span></p>
            <p>${escapeHTML(r.body)}</p>
        </div>
    `).join('');
}

async function saveReview(productId, review) {
    if (db && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
        review.productId = String(productId);
        review.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('reviews').add(review);
    } else {
        const all = JSON.parse(localStorage.getItem('grit_product_reviews')) || {};
        if (!all[productId]) all[productId] = [];
        all[productId].unshift(review);
        localStorage.setItem('grit_product_reviews', JSON.stringify(all));
    }
}

function initReviews(product) {
    const productId = product.id;
    renderReviews(productId);

    const modal = document.getElementById('review-modal');
    const openBtn = document.getElementById('open-review-modal');
    const closeBtn = document.getElementById('close-review-modal');
    const loginPrompt = document.getElementById('review-login-prompt');
    const reviewForm = document.getElementById('review-form');
    const successMsg = document.getElementById('review-success');
    const errorEl = document.getElementById('review-form-error');
    if (!modal || !openBtn) return;

    const productNameEl = document.getElementById('review-modal-product-name');
    if (productNameEl) productNameEl.textContent = product.title;

    function userHasPurchased() {
        if (typeof auth === 'undefined' || !auth.isLoggedIn()) return false;
        const user = auth.getUser();
        if (!user || !user.orders || !user.orders.edges) return false;
        const titleLower = product.title.toLowerCase();
        return user.orders.edges.some(({ node: order }) => order.lineItems && order.lineItems.edges && order.lineItems.edges.some(({ node: item }) => item.title && item.title.toLowerCase().includes(titleLower)));
    }

    function updateWriteReviewBtn() {
        if (typeof auth === 'undefined' || !auth.isLoggedIn()) { openBtn.style.display=''; openBtn.title='Log in to write a review'; }
        else if (!userHasPurchased()) {
            openBtn.style.display = 'none';
            if (!document.getElementById('no-purchase-note')) {
                const note = document.createElement('p');
                note.id = 'no-purchase-note';
                note.style.cssText = 'font-size:0.82rem;color:var(--color-text-light);margin-top:1rem;line-height:1.4;';
                note.textContent = 'Only customers who have purchased this product can leave a review.';
                openBtn.parentElement.appendChild(note);
            }
        } else { openBtn.style.display=''; document.getElementById('no-purchase-note')?.remove(); }
    }
    updateWriteReviewBtn();

    openBtn.addEventListener('click', () => {
        reviewForm.style.display='none'; loginPrompt.style.display='none'; successMsg.style.display='none'; errorEl.style.display='none';
        document.getElementById('review-not-purchased').style.display='none';
        if (typeof auth === 'undefined' || !auth.isLoggedIn()) loginPrompt.style.display='block';
        else if (!userHasPurchased()) document.getElementById('review-not-purchased').style.display='block';
        else { reviewForm.style.display='flex'; reviewForm.style.flexDirection='column'; }
        modal.classList.add('active'); document.body.style.overflow='hidden';
    });

    const closeModal = () => { modal.classList.remove('active'); document.body.style.overflow=''; };
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if(e.target===modal) closeModal(); });

    let selectedRating = 0;
    const starSpans = document.querySelectorAll('#star-picker span');
    const ratingInput = document.getElementById('review-rating');
    const highlightStars = count => starSpans.forEach(s => s.style.color = parseInt(s.dataset.value) <= count ? 'var(--color-primary)' : '#555');
    starSpans.forEach(span => {
        span.addEventListener('mouseover', () => highlightStars(parseInt(span.dataset.value)));
        span.addEventListener('mouseout', () => highlightStars(selectedRating));
        span.addEventListener('click', () => { selectedRating=parseInt(span.dataset.value); ratingInput.value=selectedRating; highlightStars(selectedRating); });
    });
    highlightStars(0);

    reviewForm.addEventListener('submit', async e => {
        e.preventDefault();
        const rating = parseInt(ratingInput.value);
        const title = document.getElementById('review-title').value.trim();
        const body = document.getElementById('review-body').value.trim();
        const submitBtn = document.getElementById('review-submit-btn');
        if (rating === 0) { errorEl.textContent='Please select a star rating.'; errorEl.style.display='block'; return; }
        if (!title || !body) { errorEl.textContent='Please fill in all fields.'; errorEl.style.display='block'; return; }
        errorEl.style.display='none';
        const user = auth.getUser();
        const review = { rating, title, body, userName: user.firstName ? `${user.firstName} ${user.lastName||''}`.trim() : user.email, verified: userHasPurchased(), date: new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'}), userId: user.id };
        try {
            if (submitBtn) { submitBtn.disabled=true; submitBtn.textContent='Submitting...'; }
            await saveReview(productId, review);
            await renderReviews(productId);
            reviewForm.style.display='none'; successMsg.style.display='block';
        } catch (err) { errorEl.textContent='Failed to submit review. Please try again.'; errorEl.style.display='block'; }
        finally { if(submitBtn){submitBtn.disabled=false; submitBtn.textContent='Submit Review';} }
        reviewForm.reset(); selectedRating=0; ratingInput.value=0; highlightStars(0);
        setTimeout(closeModal, 2500);
    });
}
