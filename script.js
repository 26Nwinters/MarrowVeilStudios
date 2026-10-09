// Navigation is injected asynchronously, so bind controls only after it exists.
function closeMobile() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger) {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  if (mobileMenu) mobileMenu.classList.remove('open');
}

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const nav = document.getElementById('nav');
  if (hamburger && mobileMenu && !hamburger.dataset.initialized) {
    hamburger.dataset.initialized = 'true';
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.addEventListener('click', () => {
      const open = !mobileMenu.classList.contains('open');
      hamburger.classList.toggle('open', open);
      mobileMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });
  }
  if (nav && !nav.dataset.scrollInitialized) {
    nav.dataset.scrollInitialized = 'true';
    const update = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }
  const dropdown = document.getElementById('gamesDropdown');
  if (dropdown && !dropdown.dataset.initialized) {
    dropdown.dataset.initialized = 'true';
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    if (trigger) trigger.addEventListener('click', event => {
      event.stopPropagation();
      const open = !dropdown.classList.contains('open');
      document.querySelectorAll('.nav-dropdown').forEach(item => item.classList.remove('open'));
      dropdown.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', event => {
      if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  document.querySelectorAll('.nav-mobile-group-trigger').forEach(button => {
    if (button.dataset.initialized) return;
    button.dataset.initialized = 'true';
    button.addEventListener('click', () => {
      const group = button.closest('.nav-mobile-group');
      if (!group) return;
      const open = !group.classList.contains('open');
      group.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href && href.endsWith('.html') && path === href) link.classList.add('active');
    if ((path === 'index.html' || path === '') && href === 'index.html') link.classList.add('active');
  });
}

function initReveals() {
  if (!('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

function initHeroParallax() {
  const hero = document.getElementById('hero-bg');
  if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('scroll', () => {
    hero.style.transform = `translateY(${window.scrollY * 0.4}px)`;
  }, { passive: true });
}

async function loadIncludes() {
  const navHolder = document.getElementById('nav-placeholder');
  const footerHolder = document.getElementById('footer-placeholder');
  if (navHolder) {
    try {
      const response = await fetch('includes/nav.html');
      if (!response.ok) throw new Error('Navigation request failed: ' + response.status);
      navHolder.outerHTML = await response.text();
      initNav();
    } catch (error) {
      console.warn('Navigation include failed', error);
    }
  }
  if (footerHolder) {
    try {
      const response = await fetch('includes/footer.html');
      if (!response.ok) throw new Error('Footer request failed: ' + response.status);
      footerHolder.outerHTML = await response.text();
    } catch (error) {
      console.warn('Footer include failed', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initReveals();
  initHeroParallax();
  loadIncludes();
});
