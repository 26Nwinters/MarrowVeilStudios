// ── Mobile menu ─────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });
}
function closeMobile() {
  if (hamburger) hamburger.classList.remove('open');
  if (mobileMenu) mobileMenu.classList.remove('open');
}
// ── Nav scroll effect ────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });
// ── Parallax hero ────────────────────────────────────────────
const heroBg = document.getElementById('hero-bg');
if (heroBg) {
  window.addEventListener('scroll', () => {
    heroBg.style.transform = `translateY(${window.scrollY * 0.4}px)`;
  }, { passive: true });
}
// ── Scroll reveal ────────────────────────────────────────────
function initReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', initReveals);
// ── Mark active nav link ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href && path.includes(href.replace('.html', ''))) {
      link.classList.add('active');
    }
    if ((path === 'index.html' || path === '') && href === 'index.html') {
      link.classList.add('active');
    }
  });
});
// ── Nav dropdown init ────────────────────────────────────────
function initNavDropdown() {
  const gamesDropdown = document.getElementById('gamesDropdown');
  if (!gamesDropdown) return;
  const trigger = gamesDropdown.querySelector('.nav-dropdown-trigger');
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = gamesDropdown.classList.contains('open');
    document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    if (!isOpen) gamesDropdown.classList.add('open');
    trigger.setAttribute('aria-expanded', String(!isOpen));
  });
  document.addEventListener('click', () => {
    gamesDropdown.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.nav-mobile-group-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.nav-mobile-group');
      const isOpen = group.classList.contains('open');
      group.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });
}
// ── Fetch and inject nav/footer ──────────────────────────────
async function loadIncludes() {
  const navHolder = document.getElementById('nav-placeholder');
  const footerHolder = document.getElementById('footer-placeholder');
  if (navHolder) {
    try {
      const res = await fetch('includes/nav.html');
      const html = await res.text();
      navHolder.outerHTML = html;
      // Re-run active link detection after nav is loaded
      const path = window.location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href && path.includes(href.replace('.html', ''))) {
          link.classList.add('active');
        }
        if ((path === 'index.html' || path === '') && href === 'index.html') {
          link.classList.add('active');
        }
      });
      initNavDropdown();
    } catch(e) { console.warn('Nav include failed', e); }
  }
  if (footerHolder) {
    try {
      const res = await fetch('includes/footer.html');
      const html = await res.text();
      footerHolder.outerHTML = html;
    } catch(e) { console.warn('Footer include failed', e); }
  }
}
loadIncludes();
