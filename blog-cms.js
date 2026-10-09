(() => {
  const grid=document.querySelector(".blog-grid"), count=document.querySelector(".blog-count"), featured=document.querySelector(".blog-featured");
  if(!grid||!window.supabase||!window.MARROWVEIL_SUPABASE_URL||!window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY)return;
  const client=window.supabase.createClient(window.MARROWVEIL_SUPABASE_URL,window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date=s=>s?new Date(s).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}):"";
  function blockHtml(b){
    const text=esc(b.text||"").replace(/\n/g,"<br>");
    if(b.type==="heading")return (Number(b.level)===3?"<h3>":"<h2>")+text+(Number(b.level)===3?"</h3>":"</h2>");
    if(b.type==="text")return "<p>"+text+"</p>";
    if(b.type==="quote")return "<blockquote><p>"+text+"</p>"+(b.attribution?"<cite>"+esc(b.attribution)+"</cite>":"")+"</blockquote>";
    if(b.type==="image"&&/^https?:\/\//i.test(b.url||""))return '<figure><img loading="lazy" src="'+esc(b.url)+'" alt="'+esc(b.alt||"")+'"><figcaption>'+esc(b.caption||"")+"</figcaption></figure>";
    if(b.type==="video"){const m=String(b.url||"").match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);return m?'<div class="blog-video"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/'+m[1]+'" title="'+esc(b.caption||"YouTube video")+'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>':"";}
    if(b.type==="link"&&/^https?:\/\//i.test(b.url||""))return '<p><a href="'+esc(b.url)+'" rel="noopener noreferrer">'+esc(b.label||"Read more")+"</a></p>";
    return "";
  }
  function card(p){return '<article class="blog-card reveal" data-category="'+esc(p.category)+'"><a class="blog-card-thumb" href="article.html?slug='+encodeURIComponent(p.slug)+'">'+(p.cover_image?'<img loading="lazy" src="'+esc(p.cover_image)+'" alt="'+esc(p.cover_alt||"")+'">':'<div class="thumb-placeholder"><span class="thumb-symbol">◈</span></div>')+'</a><div class="blog-card-body"><div><span class="blog-tag">'+esc(p.category)+'</span></div><h2 class="blog-card-title"><a href="article.html?slug='+encodeURIComponent(p.slug)+'">'+esc(p.title)+'</a></h2><p class="blog-card-excerpt">'+esc(p.excerpt)+'</p><div class="blog-card-footer"><span class="blog-card-date">'+esc(date(p.published_at))+'</span><a class="blog-card-read" href="article.html?slug='+encodeURIComponent(p.slug)+'">Read ↗</a></div></div></article>';}
  async function load(){
    const {data,error}=await client.from("cms_posts").select("id,title,slug,excerpt,category,cover_image,cover_alt,published_at").eq("status","published").order("published_at",{ascending:false});
    if(error){count.innerHTML='<span>0</span> Posts — Updates temporarily unavailable';return;}
    const posts=data||[];count.innerHTML='<span>'+posts.length+'</span> '+(posts.length===1?"Post":"Posts");
    const filters=document.querySelectorAll(".blog-filter-btn");
    filters.forEach(btn=>btn.addEventListener("click",()=>{
      filters.forEach(b=>b.classList.toggle("active",b===btn));
      const category=btn.textContent.trim().toLowerCase();
      grid.querySelectorAll(".blog-card").forEach(el=>el.hidden=category!=="all"&&el.dataset.category.toLowerCase()!==category);
      if(featured)featured.hidden=category!=="all"&&featured.dataset.category?.toLowerCase()!==category;
    }));
    if(!posts.length){grid.innerHTML='<div class="empty-state"><h2>No articles published yet</h2><p>New development updates will appear here when they are ready.</p></div>';if(featured)featured.hidden=true;return;}
    const first=posts[0];
    if(featured){
      featured.dataset.category=first.category;
      featured.innerHTML='<a class="blog-featured-thumb" href="article.html?slug='+encodeURIComponent(first.slug)+'">'+(first.cover_image?'<img src="'+esc(first.cover_image)+'" alt="'+esc(first.cover_alt||"")+'" style="width:100%;height:100%;object-fit:cover">':'<div class="thumb-placeholder"><span class="thumb-symbol">◈</span></div>')+'</a><div class="blog-featured-body"><div><div class="blog-featured-tag" style="margin-bottom:1.25rem"><span class="blog-tag">'+esc(first.category)+'</span><span class="blog-featured-label">Latest</span></div><h2 class="blog-card-title"><a href="article.html?slug='+encodeURIComponent(first.slug)+'">'+esc(first.title)+'</a></h2><p class="blog-card-excerpt">'+esc(first.excerpt)+'</p></div><div class="blog-card-footer"><span class="blog-card-date">'+esc(date(first.published_at))+'</span><a class="blog-card-read" href="article.html?slug='+encodeURIComponent(first.slug)+'">Read article ↗</a></div></div>';
    }
    grid.innerHTML=posts.slice(1).map(card).join("");
    if(!grid.querySelector(".blog-card")&&featured)count.innerHTML='<span>1</span> Post';
  }
  load();
})();