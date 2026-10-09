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

// ── Development notice (entry popup) ─────────────────────────

(function () {
  var STORAGE_KEY = 'mv_dev_notice_dismissed_v1';

  var alreadyDismissed = false;
  try {
    alreadyDismissed = !!localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    // localStorage unavailable (private browsing, etc.) — show the notice anyway
  }
  if (alreadyDismissed) return;

  var noticeHTML =
    '<div class="notice-overlay" id="notice-overlay">' +
      '<div class="notice-modal" id="notice-modal" role="dialog" aria-modal="true" aria-labelledby="notice-heading" aria-describedby="notice-desc-1">' +
        '<button class="notice-close" id="notice-close" type="button" aria-label="Continue to website">&times;</button>' +
        '<div class="section-header" style="margin-bottom:0;">' +
          '<span class="label-gold">Development Notice</span>' +
          '<div class="rule-gold"></div>' +
        '</div>' +
        '<h2 class="notice-heading" id="notice-heading">Development Temporarily Paused</h2>' +
        '<div class="notice-body">' +
          '<p id="notice-desc-1">Due to current funding limitations, MarrowVeil Studios has made the difficult decision to temporarily postpone development of HourGlass: Missing Time, MEK: Archives, and all other currently planned game projects until further notice.</p>' +
        '</div>' +
        '<div class="notice-emphasis">THIS IS NOT A CANCELLATION.</div>' +
        '<div class="notice-body">' +
          '<p>Development will remain paused until we are in a position to properly support these projects and give them the time, resources, and attention they deserve.</p>' +
          '<p>We sincerely appreciate everyone who has followed our work, supported our projects, and believed in what we are building. Your continued support means more than we can express.</p>' +
        '</div>' +
        '<div class="notice-stats">' +
          '<div class="notice-stat">' +
            '<span class="notice-stat-label"><span class="status-dot"></span> Status</span>' +
            '<span class="notice-stat-value">Temporarily Paused</span>' +
          '</div>' +
          '<div class="notice-stat">' +
            '<span class="notice-stat-label">Return</span>' +
            '<span class="notice-stat-value">Until Further Notice</span>' +
          '</div>' +
        '</div>' +
        '<button class="btn-gold notice-continue" id="notice-continue" type="button">Continue to Website</button>' +
      '</div>' +
    '</div>';

  function initNotice() {
    document.body.insertAdjacentHTML('beforeend', noticeHTML);

    var overlay = document.getElementById('notice-overlay');
    var modal = document.getElementById('notice-modal');
    var closeBtn = document.getElementById('notice-close');
    var continueBtn = document.getElementById('notice-continue');
    var lastFocused = document.activeElement;
    var dismissed = false;

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
      window.setTimeout(function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 500);
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function trapFocus(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        dismiss();
        return;
      }
      if (e.key !== 'Tab') return;
      var focusables = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    closeBtn.addEventListener('click', dismiss);
    continueBtn.addEventListener('click', dismiss);
    modal.addEventListener('keydown', trapFocus);

    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      continueBtn.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotice);
  } else {
    initNotice();
  }
})();
