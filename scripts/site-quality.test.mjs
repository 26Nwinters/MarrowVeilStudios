import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const read = p => readFileSync(p, 'utf8');
const routes = ['about', 'blog', 'contact', 'games', 'hourglass', 'mekaiarchives', 'press', 'privacy', 'shop'];
const publicPages = ['index.html', 'article.html', ...routes.map(r => r + '.html'), ...routes.map(r => r + '/index.html')];
const canonical = r => 'https://marrowveilstudios.com/' + (r === 'index' ? '' : r);
const manifest = JSON.parse(read('articles/manifest.json'));
for (const slug of manifest) publicPages.push('articles/' + slug + '/index.html');

test('clean and .html routes contain identical content apart from base href', () => {
  for (const name of routes) {
    assert.equal(read(name + '/index.html').replace(/  <base href="\/" \/>\n?/, '').replace(name === 'privacy' ? /<head>\n(?=<meta charset="utf-8">)/ : /NEVER_MATCH_THIS/, '<head>'), read(name + '.html'), name);
  }
});

test('every public page has distinct indexing metadata and static navigation', () => {
  for (const page of publicPages) {
    const html = read(page);
    assert.match(html, /<html[^>]+lang="en"/i, page + ': language');
    assert.match(html, /<title>[^<]+<\/title>/i, page + ': title');
    assert.match(html, /<meta name="description" content="[^"]+"/i, page + ': description');
    assert.match(html, /<link rel="canonical" href="https:\/\/marrowveilstudios\.com[^"]*"/i, page + ': canonical');
    assert.match(html, /<meta property="og:image" content="https:\/\//i, page + ': social image');
    assert.match(html, /<nav id="nav">/i, page + ': static nav');
    assert.match(html, /<main[^>]*id="main-content"[^>]*>/i, page + ': main landmark');
    assert.match(html, /<a class="skip-link" href="#main-content">/i, page + ': skip link');
    assert.equal((html.match(/<main\b/gi) || []).length, (html.match(/<\/main>/gi) || []).length, page + ': main balance');
    if (page !== "article.html") assert.equal((html.match(/<h1\b/gi) || []).length, 1, page + ': exactly one H1');
    assert.doesNotMatch(html, /hero-forest\.jpg|href="#"/i, page + ': no missing image or dead link');
    for (const img of html.match(/<img\b[^>]*>/gi) || []) {
      assert.match(img, /\balt="[^"]*"/i, page + ': image must have alt');
    }
    for (const [, script] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
      assert.ok(JSON.parse(script)['@context'], page + ': JSON-LD parse and context');
    }
  }
});

test('sitemap includes public canonical paths and static articles', () => {
  const sitemap = read('sitemap.xml');
  for (const route of ['index',...routes]) {
    const url = canonical(route);
    assert.ok(sitemap.includes('<loc>' + url + '</loc>'), url);
  }
  for (const slug of manifest) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(sitemap.includes('/articles/' + slug + '/'));
    assert.ok(existsSync('articles/' + slug + '/index.html'));
  }
});

test('local social images, CSS, JS and image sources resolve', () => {
  for (const page of publicPages) {
    const html = read(page);
    for (const [, attribute, url] of html.matchAll(/\b(src|href|content)="([^"]+)"/g)) {
      if (attribute === 'content' && !url.startsWith('https://marrowveilstudios.com/assets/')) continue;
      let pathname = url;
      if (url.startsWith('https://marrowveilstudios.com/')) pathname = new URL(url).pathname;
      else if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(url)) continue;
      pathname = pathname.split(/[?#]/)[0];
      if (!pathname || pathname === '/') continue;
      const resolved = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      const valid = existsSync(resolved) || existsSync(resolved + '/index.html') || existsSync(resolved + '.html');
      assert.ok(valid, page + ': missing local ' + attribute + '=' + url);
    }
  }
});

test('the published static articles contain crawlable text and valid schema', () => {
  for (const slug of manifest) {
    const html = read('articles/' + slug + '/index.html');
    assert.match(html, /"@type":"BlogPosting"/);
    assert.match(html, new RegExp('href="https://marrowveilstudios\\.com/articles/' + slug + '/"'));
    assert.doesNotMatch(html, /Loading article…/);
  }
});

test('no secrets are present in public config and robots points to sitemap', () => {
  assert.match(read('employee/config.js'), /sb_publishable_/);
  assert.doesNotMatch(read('employee/config.js'), /sb_secret_/);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/marrowveilstudios\.com\/sitemap\.xml/);
});
