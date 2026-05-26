function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showInlineError(message, containerClass) {
    let container = document.querySelector('.' + containerClass);
    if (!container) return;
    let errorEl = container.querySelector('.inline-error-msg');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'inline-error-msg';
        errorEl.style.cssText = 'color: #ff4d4d; font-size: 0.85rem; margin-top: 1rem; padding: 0.5rem; background: rgba(255,0,0,0.1); border-radius: 4px;';
        container.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => errorEl.style.display = 'none', 5000);
}

function showToastNotification(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 2rem; right: 2rem; z-index: 10000; display: flex; flex-direction: column; gap: 0.5rem; pointer-events: none;';
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: rgba(30, 30, 30, 0.95);
        color: #fdfbf9;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border-left: 4px solid ${type === 'error' ? '#a83f3f' : '#c49f70'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);
        font-family: 'Outfit', sans-serif;
        font-size: 0.9rem;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
    `;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
