(() => {
  const host=document.getElementById("article-content");
  const config=window.MARROWVEIL_SUPABASE_URL&&window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY&&window.supabase;
  if(!host||!config){if(host)host.textContent="This article is temporarily unavailable.";return;}
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const client=window.supabase.createClient(window.MARROWVEIL_SUPABASE_URL,window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY);
  function renderBlock(b){
    const t=esc(b.text||"").replace(/\n/g,"<br>");
    if(b.type==="heading")return (Number(b.level)===3?"<h3>":"<h2>")+t+(Number(b.level)===3?"</h3>":"</h2>");
    if(b.type==="text")return "<p>"+t+"</p>";
    if(b.type==="quote")return "<blockquote><p>"+t+"</p>"+(b.attribution?"<cite>"+esc(b.attribution)+"</cite>":"")+"</blockquote>";
    if(b.type==="image"&&/^https?:\/\//i.test(b.url||""))return '<figure><img loading="lazy" src="'+esc(b.url)+'" alt="'+esc(b.alt||"")+'"><figcaption>'+esc(b.caption||"")+"</figcaption></figure>";
    if(b.type==="video"){const m=String(b.url||"").match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);return m?'<div class="article-video"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/'+m[1]+'" title="'+esc(b.caption||"YouTube video")+'" allow="accelerometer; encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>':"";}
    if(b.type==="link"&&/^https?:\/\//i.test(b.url||""))return '<p><a href="'+esc(b.url)+'" rel="noopener noreferrer">'+esc(b.label||"Read more")+"</a></p>";
    return "";
  }
  (async()=>{
    const slug=new URLSearchParams(location.search).get("slug");
    if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){host.textContent="Article not found.";return;}
    const {data:p,error}=await client.from("cms_posts").select("title,slug,excerpt,category,cover_image,cover_alt,blocks,published_at,seo_title,seo_description").eq("slug",slug).eq("status","published").maybeSingle();
    if(error||!p){host.textContent="This article could not be found or is no longer published.";return;}
    document.title=(p.seo_title||p.title)+" | MarrowVeil Studios";
    const desc=p.seo_description||p.excerpt;
    document.querySelector('meta[name="description"]')?.setAttribute("content",desc);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content",p.seo_title||p.title);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content",location.href);
    const canonical=document.querySelector('link[rel="canonical"]'); if(canonical)canonical.href=location.href;
    document.querySelector('meta[property="og:description"]')?.setAttribute("content",desc);
    if(p.cover_image)document.querySelector('meta[property="og:image"]')?.setAttribute("content",p.cover_image);
    host.className="article-content";
    host.innerHTML='<p class="article-kicker">'+esc(p.category)+'</p><h1 class="article-title">'+esc(p.title)+'</h1><p class="article-excerpt">'+esc(p.excerpt)+'</p><p class="article-date">'+esc(p.published_at?new Date(p.published_at).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}):"")+'</p>'+(p.cover_image?'<img class="article-cover" src="'+esc(p.cover_image)+'" alt="'+esc(p.cover_alt||"")+'">':"")+(Array.isArray(p.blocks)?p.blocks.map(renderBlock).join(""):"");
  })();
})();