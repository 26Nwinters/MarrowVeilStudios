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
