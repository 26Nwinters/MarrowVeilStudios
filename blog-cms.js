// Published cards are present in the HTML for search engines and visitors.
// Enhance that listing without replacing or moving any existing card.
(() => {
  const grid = document.querySelector(".blog-grid");
  const count = document.querySelector(".blog-count");
  if (!grid) return;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const date = value => value ? new Date(value).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric"
  }) : "";
  const slugFromCard = card => {
    const href = card.querySelector("a[href]")?.getAttribute("href") || "";
    const match = href.match(/\/articles\/([a-z0-9-]+)\/?(?:[?#].*)?$/);
    if (match) return match[1];
    try { return new URL(href, location.href).searchParams.get("slug"); }
    catch { return null; }
  };
  const categoryOf = card => (card.dataset.category ||
    card.querySelector(".blog-tag")?.textContent || "").trim().toLowerCase();
  const cards = () => [...grid.querySelectorAll(".blog-card")];

  // Keep an accurate count without depending on any CMS response.
  function updateCount() {
    const total = cards().length;
    if (count) count.innerHTML = "<span>" + total + "</span> " +
      (total === 1 ? "Post" : "Posts");
  }

  const filters = [...document.querySelectorAll(".blog-filter-btn")];
  function applyFilter() {
    const active = filters.find(button => button.classList.contains("active"));
    const category = (active?.textContent || "All").trim().toLowerCase();
    cards().forEach(card => {
      card.hidden = category !== "all" && categoryOf(card) !== category;
    });
  }
  filters.forEach(button => button.addEventListener("click", () => {
    filters.forEach(other => other.classList.toggle("active", other === button));
    applyFilter();
  }));

  const existing = new Set();
  cards().forEach(card => {
    card.dataset.category = categoryOf(card);
    const slug = slugFromCard(card);
    if (slug) existing.add(slug);
  });
  updateCount();
  applyFilter();

  if (!window.supabase || !window.MARROWVEIL_SUPABASE_URL ||
      !window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY) return;

  const client = window.supabase.createClient(
    window.MARROWVEIL_SUPABASE_URL,
    window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY
  );
  const articleHref = slug => "/article.html?slug=" + encodeURIComponent(slug);
  function buildCard(post) {
    const href = articleHref(post.slug);
    return '<article class="blog-card" data-category="' + esc(post.category) + '">' +
      '<a class="blog-card-thumb" href="' + href + '">' +
      (post.cover_image
        ? '<img loading="lazy" src="' + esc(post.cover_image) + '" alt="' +
          esc(post.cover_alt || post.title + " cover art") + '">'
        : '<div class="thumb-placeholder"><span class="thumb-symbol">◈</span></div>') +
      '</a><div class="blog-card-body"><div><span class="blog-tag">' +
      esc(post.category) + '</span></div><h2 class="blog-card-title"><a href="' +
      href + '">' + esc(post.title) + '</a></h2><p class="blog-card-excerpt">' +
      esc(post.excerpt) + '</p><div class="blog-card-footer"><span class="blog-card-date">' +
      esc(date(post.published_at)) + '</span><a class="blog-card-read" href="' +
      href + '">Read ↗</a></div></div></article>';
  }

  // Supabase supplies newly published posts. It must never erase the static listing.
  async function enhance() {
    try {
      const { data, error } = await client.from("cms_posts")
        .select("id,title,slug,excerpt,category,cover_image,cover_alt,published_at")
        .eq("status", "published").order("published_at", { ascending: false });
      if (error) throw error;
      const additions = (data || []).filter(post =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) && !existing.has(post.slug)
      );
      if (additions.length) {
        grid.insertAdjacentHTML("beforeend", additions.map(buildCard).join(""));
        updateCount();
        applyFilter();
      }
    } catch (error) {
      console.warn("Blog live updates unavailable; published articles remain visible.", error);
    }
  }
  enhance();
})();
