// ============ ANIMATIONS ============

function initMagneticButtons(container = document) {
    container.querySelectorAll('.magnetic').forEach(btn => {
        if (btn.dataset.magneticInit) return;
        btn.dataset.magneticInit = 'true';
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
            const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
            btn.style.transform = `translate(${x}px, ${y}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0px, 0px)';
        });
    });
}

function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let cursorX = mouseX, cursorY = mouseY;
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    // Note: product-card specific cursor/magnetic listeners are handled in renderProducts()
    // to avoid duplication. Only attach to static elements here.
    document.querySelectorAll('a, button, input').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
    initMagneticButtons();
    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.2;
        cursorY += (mouseY - cursorY) * 0.2;
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animateCursor);
    }
    if (window.innerWidth > 768) animateCursor();
}

let slideshowInterval;
function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length <= 1) return;
    if (slideshowInterval) clearInterval(slideshowInterval);
    let currentSlide = 0;
    slideshowInterval = setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 3000);
}

function initGSAPAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        // Fallback: immediately reveal all reveal elements if GSAP is not loaded
        document.querySelectorAll('.reveal').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        return;
    }

    // Kill any existing ScrollTriggers to prevent duplicate/conflicting animations
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    gsap.registerPlugin(ScrollTrigger);

    const heroImageContainer = document.querySelector('.hero-image-container');
    const heroContent = document.querySelector('.hero-content');
    if (heroImageContainer && heroContent) {
        gsap.to(heroImageContainer, { yPercent: 25, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
        gsap.to(heroContent, { yPercent: -40, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    }

    // Loop through each product grid and animate only its respective children
    gsap.utils.toArray('.product-grid').forEach(grid => {
        const cards = gsap.utils.toArray(grid.querySelectorAll('.product-card'));
        if (cards.length > 0) {
            gsap.to(cards, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: grid, start: "top 80%", toggleActions: "play reverse play reverse" } });
        }
    });

    gsap.utils.toArray('.reveal:not(.product-card)').forEach(reveal => {
        gsap.to(reveal, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: reveal, start: "top 85%", toggleActions: "play reverse play reverse" } });
    });

    // About page specific animations
    if (window.location.pathname.includes('about')) {
        const sections = [
            '.about-hero-content',
            '.about-story',
            '.about-stats-bar',
            '.about-values .section-header',
            '.values-grid',
            '.about-cta'
        ];
        sections.forEach(sel => {
            const el = document.querySelector(sel);
            if (!el) return;
            gsap.set(el, { clearProps: "y,opacity" });
            gsap.fromTo(el, 
                { y: 40, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.9,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' }
                }
            );
        });

        const stats = document.querySelectorAll('.about-stat');
        if (stats.length > 0) {
            gsap.set(stats, { clearProps: "y,opacity" });
            gsap.fromTo(stats,
                { y: 30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    stagger: 0.15,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: '.about-stats-bar', start: 'top 85%' }
                }
            );
        }

        const valueCards = document.querySelectorAll('.value-card');
        if (valueCards.length > 0) {
            gsap.set(valueCards, { clearProps: "y,opacity" });
            gsap.fromTo(valueCards,
                { y: 30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    stagger: 0.15,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: '.values-grid', start: 'top 85%' }
                }
            );
        }
    }
}

function initInteractiveBackground() {
    const canvas = document.getElementById('interactive-bg');
    if (!canvas) return;
    // Skip heavy canvas animation on mobile devices to save battery and CPU
    if (window.innerWidth <= 768) {
        canvas.style.display = 'none';
        return;
    }
    const ctx = canvas.getContext('2d');
    let width, height, dots = [];
    const dotSpacing = 20, dotRadius = 1.2, dotColor = 'rgba(253, 251, 249, 0.12)', repelRadius = 120, repelForce = 2.0, returnForce = 0.05, friction = 0.85;
    let mouse = { x: -1000, y: -1000 };

    function resize() {
        width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight;
        dots = [];
        const offsetX = (width % dotSpacing) / 2, offsetY = (height % dotSpacing) / 2;
        const cols = Math.floor(width / dotSpacing) + 1, rows = Math.floor(height / dotSpacing) + 1;
        for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
            const x = i * dotSpacing + offsetX, y = j * dotSpacing + offsetY;
            dots.push({ baseX: x, baseY: y, x, y, vx: 0, vy: 0 });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Batch normal dots to reduce draw calls from 5000+ to 2
        ctx.beginPath();
        ctx.fillStyle = dotColor;
        const nearDots = [];

        dots.forEach(dot => {
            const dx = mouse.x - dot.x;
            const dy = mouse.y - dot.y;
            const distSq = dx * dx + dy * dy;
            const repelRadiusSq = repelRadius * repelRadius;
            let isNear = false;

            if (distSq < repelRadiusSq) {
                const dist = Math.sqrt(distSq);
                isNear = true;
                if (dist > 0.1) {
                    const force = (repelRadius - dist) / repelRadius;
                    dot.vx -= (dx / dist) * force * repelForce;
                    dot.vy -= (dy / dist) * force * repelForce;
                }
            }
            dot.vx += (dot.baseX - dot.x) * returnForce;
            dot.vy += (dot.baseY - dot.y) * returnForce;
            dot.vx *= friction;
            dot.vy *= friction;
            dot.x += dot.vx;
            dot.y += dot.vy;

            if (isNear) {
                nearDots.push(dot);
            } else {
                ctx.moveTo(dot.x + dotRadius, dot.y);
                ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
            }
        });

        ctx.fill();

        // Draw active repelled dots (red)
        if (nearDots.length > 0) {
            ctx.beginPath();
            ctx.fillStyle = '#a83f3f';
            nearDots.forEach(dot => {
                ctx.moveTo(dot.x + dotRadius, dot.y);
                ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
            });
            ctx.fill();
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('touchmove', e => { if (e.touches.length > 0) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; } });
    window.addEventListener('mouseout', () => { mouse.x = -1000; mouse.y = -1000; });
    resize(); animate();
}

// ============ SMOOTH SCROLLING (LENIS) ============
let lenisInstance = null;

function initSmoothScroll() {
    // If Lenis is already defined, setup directly
    if (typeof Lenis !== 'undefined') {
        setupLenis();
        return;
    }

    // Otherwise, load from jsDelivr CDN dynamically
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
        setupLenis();
    };
    script.onerror = () => {
        console.warn("Lenis smooth scroll failed to load from CDN. Using standard fallback smooth scroll.");
    };
    document.head.appendChild(script);
}

function setupLenis() {
    if (typeof Lenis === 'undefined') return;

    // Initialize Lenis
    lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        smoothTouch: false,
        infinite: false,
    });

    // Update ScrollTrigger on scroll
    if (typeof ScrollTrigger !== 'undefined' && typeof gsap !== 'undefined') {
        lenisInstance.on('scroll', ScrollTrigger.update);
        
        gsap.ticker.add((time) => {
            lenisInstance.raf(time * 1000);
        });
        
        gsap.ticker.lagSmoothing(0);
    } else {
        // Fallback animation frame loop
        function raf(time) {
            lenisInstance.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    // Attach smooth scroll to all anchor links
    document.addEventListener('click', function(e) {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
            e.preventDefault();
            lenisInstance.scrollTo(targetEl, {
                offset: -80, // Offset to avoid overlapping navbar
                duration: 1.4,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
            });
        }
    });
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmoothScroll);
} else {
    initSmoothScroll();
}

