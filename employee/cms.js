(() => {
  const ready = Boolean(window.MARROWVEIL_SUPABASE_URL && window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY && window.supabase);
  const message = document.getElementById("cms-message");
  if (!ready) { if (message) message.textContent = "Portal setup is incomplete. Contact the studio administrator."; return; }
  const client = window.supabase.createClient(window.MARROWVEIL_SUPABASE_URL, window.MARROWVEIL_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const $ = id => document.getElementById(id);
  const form = $("post-form"), list = $("post-list"), blocksHost = $("block-list");
  let user = null, posts = [], blocks = [], selectedId = null;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeUrl = value => { try { const u = new URL(value, location.origin); return ["https:","http:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };
  const slugify = value => String(value || "").normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,180);
  function say(text, target = message) { target.textContent = text || ""; }
  function snapshot() { return { title:$("post-title").value.trim(), slug:$("post-slug").value.trim(), excerpt:$("post-excerpt").value.trim(), category:$("post-category").value, seo_title:$("post-seo-title").value.trim(), seo_description:$("post-seo-description").value.trim(), cover_image:safeUrl($("post-cover").value), cover_alt:$("post-cover-alt").value.trim(), blocks:JSON.parse(JSON.stringify(blocks)) }; }
  function clearForm() {
    selectedId = null; form.reset(); $("post-slug").dataset.touched = "false"; $("post-id").value = ""; blocks = [];
    $("editor-title").textContent = "New article"; $("editor-status").textContent = "UNSAVED"; $("post-preview").hidden = true;
    $("editor-message").textContent = ""; renderBlocks(); renderPosts();
  }
  function addBlock(type) {
    const defaults = { heading:{type,text:"Section heading",level:2}, text:{type,text:""}, quote:{type,text:"A thought worth keeping.",attribution:""}, image:{type,url:"",alt:"",caption:""}, video:{type,url:"",caption:""}, link:{type,label:"Read more",url:""} };
    blocks.push(defaults[type] || defaults.text); renderBlocks();
  }
  function blockFields(block,index) {
    const textarea = (field,label,placeholder) => '<label>'+label+'</label><textarea rows="3" data-index="'+index+'" data-field="'+field+'" placeholder="'+placeholder+'">'+escapeHtml(block[field]||"")+'</textarea>';
    const input = (field,label,placeholder,type="text") => '<label>'+label+'</label><input type="'+type+'" data-index="'+index+'" data-field="'+field+'" value="'+escapeHtml(block[field]||"")+'" placeholder="'+placeholder+'">';
    if (block.type === "heading") return textarea("text","Heading text","Section heading")+'<label>Heading size</label><select data-index="'+index+'" data-field="level"><option value="2" '+(Number(block.level)===2?"selected":"")+'>Large heading</option><option value="3" '+(Number(block.level)===3?"selected":"")+'>Small heading</option></select>';
    if (block.type === "text") return textarea("text","Paragraph text","Write your paragraph here…");
    if (block.type === "quote") return textarea("text","Quote","Quote text")+input("attribution","Attribution","Name or source");
    if (block.type === "image") return input("url","Image URL","https://…","url")+input("alt","Alternative text","Describe the image")+input("caption","Caption","Optional caption");
    if (block.type === "video") return input("url","YouTube URL","https://www.youtube.com/watch?v=…","url")+input("caption","Caption","Optional caption");
    return input("label","Link label","Read more")+input("url","Destination URL","https://…","url");
  }
  function renderBlocks() {
    if (!blocks.length) { blocksHost.innerHTML = '<div class="empty-state"><h3>No content blocks</h3><p>Add a heading or text block to start writing.</p></div>'; return; }
    blocksHost.innerHTML = blocks.map((block,i) => '<section class="cms-block"><div class="cms-block-top"><strong>'+escapeHtml(block.type)+' · '+(i+1)+'</strong><div class="cms-block-tools"><button type="button" data-move="-1" data-index="'+i+'" aria-label="Move block up" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-move="1" data-index="'+i+'" aria-label="Move block down" '+(i===blocks.length-1?'disabled':'')+'>↓</button><button type="button" data-remove="'+i+'">Remove</button></div></div>'+blockFields(block,i)+'</section>').join("");
    blocksHost.querySelectorAll("[data-index][data-field]").forEach(el => el.addEventListener("input", () => {
      const i=Number(el.dataset.index), field=el.dataset.field; if(!blocks[i]) return;
      blocks[i][field]=field==="level"?Number(el.value):el.value;
    }));
    blocksHost.querySelectorAll("[data-move]").forEach(btn => btn.addEventListener("click", () => {
      const i=Number(btn.dataset.index), j=i+Number(btn.dataset.move); if(j<0||j>=blocks.length)return;
      [blocks[i],blocks[j]]=[blocks[j],blocks[i]]; renderBlocks();
    }));
    blocksHost.querySelectorAll("[data-remove]").forEach(btn => btn.addEventListener("click", () => { blocks.splice(Number(btn.dataset.remove),1); renderBlocks(); }));
  }
  function renderPosts() {
    const query=$("post-search").value.trim().toLowerCase(), status=$("post-filter").value;
    const shown=posts.filter(p=>(status==="all"||p.status===status)&&((p.title+" "+p.slug+" "+p.category).toLowerCase().includes(query)));
    $("post-total").textContent=posts.length+" POSTS";
    if(!shown.length){list.innerHTML='<div class="cms-empty-note">No articles match this filter.</div>';return;}
    list.innerHTML=shown.map(p=>'<article class="cms-post-item '+(p.id===selectedId?'active':'')+'"><span class="cms-status">'+escapeHtml(p.status)+'</span><h3>'+escapeHtml(p.title||"Untitled article")+'</h3><p>'+escapeHtml(p.category)+' · Updated '+new Date(p.updated_at).toLocaleDateString()+'</p><div class="cms-post-item-actions"><button class="button button-ghost" type="button" data-edit="'+escapeHtml(p.id)+'">Edit</button>'+(p.status==="published"?'<a class="button button-ghost" href="../article.html?slug='+encodeURIComponent(p.slug)+'" target="_blank" rel="noopener">View</a>':'')+'<button class="button button-ghost" type="button" data-archive="'+escapeHtml(p.id)+'">'+(p.status==="archived"?"Restore":"Archive")+'</button><button class="button button-danger" type="button" data-delete="'+escapeHtml(p.id)+'">Delete</button></div></article>').join("");
    list.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>loadPost(btn.dataset.edit)));
    list.querySelectorAll("[data-archive]").forEach(btn=>btn.addEventListener("click",()=>archivePost(btn.dataset.archive)));
    list.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>deletePost(btn.dataset.delete)));
  }
  async function loadPosts() {
    const {data,error}=await client.from("cms_posts").select("*").order("updated_at",{ascending:false});
    if(error){say("CMS tables are not ready or your admin permissions could not be verified. Apply the CMS SQL migration and try again.");list.innerHTML='<div class="empty-state"><h3>Could not load content</h3><p>Apply the CMS migration from the repository SQL folder, then refresh.</p></div>';return;}
    posts=data||[];renderPosts();
  }
  async function loadPost(id) {
    const p=posts.find(x=>x.id===id); if(!p)return;
    selectedId=p.id; $("post-id").value=p.id; $("post-title").value=p.title||""; $("post-slug").value=p.slug||""; $("post-excerpt").value=p.excerpt||"";
    $("post-category").value=p.category||"Devlog"; $("post-seo-title").value=p.seo_title||""; $("post-seo-description").value=p.seo_description||"";
    $("post-cover").value=p.cover_image||""; $("post-cover-alt").value=p.cover_alt||""; blocks=Array.isArray(p.blocks)?JSON.parse(JSON.stringify(p.blocks)):[];
    $("editor-title").textContent="Edit article"; $("editor-status").textContent=p.status.toUpperCase(); $("post-preview").hidden=true; $("editor-message").textContent="";
    renderBlocks();renderPosts();window.scrollTo({top:0,behavior:"smooth"});
  }
  async function save(status) {
    say("",$("editor-message"));
    if(!form.reportValidity())return;
    const values=snapshot();
    if(!values.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)){say("Use a URL slug containing only lowercase letters, numbers, and hyphens.",$("editor-message"));return;}
    if(status==="published"&&(!values.title||!values.excerpt||!values.blocks.length)){say("Add a title, excerpt, and at least one content block before publishing.",$("editor-message"));return;}
    const prior=posts.find(p=>p.id===selectedId);
    const duplicate=posts.find(p=>p.slug===values.slug&&p.id!==selectedId);
    if(duplicate){say("That URL slug is already in use. Choose another.",$("editor-message"));return;}
    const btn=status==="published"?$("publish-post"):$("save-draft"), original=btn.textContent;
    btn.disabled=true;btn.textContent=status==="published"?"Publishing…":"Saving…";
    try {
      if(prior) {
        const {error:versionError}=await client.from("cms_post_versions").insert({post_id:prior.id,version_number:Date.now(),snapshot:prior});
        if(versionError) throw versionError;
      }
      const payload={...values,status,updated_at:new Date().toISOString(),published_at:status==="published"?(prior?.published_at||new Date().toISOString()):prior?.published_at||null};
      let result;
      if(selectedId) result=await client.from("cms_posts").update(payload).eq("id",selectedId).select("*").single();
      else result=await client.from("cms_posts").insert({...payload,author_id:user.id}).select("*").single();
      if(result.error)throw result.error;
      const action=prior?"updated":"created";
      await client.from("cms_audit_log").insert({actor_id:user.id,action:status==="published"?"published":"saved_"+status,entity_type:"post",entity_id:result.data.id,details:{title:values.title,previous_status:prior?.status||null}});
      selectedId=result.data.id;$("post-id").value=selectedId;
      say(status==="published"?"Article published. It should now appear on the public blog.":"Draft saved.",$("editor-message"));
      await loadPosts();const updated=posts.find(p=>p.id===selectedId);if(updated){$("editor-status").textContent=updated.status.toUpperCase();}
    } catch(error) { console.error("CMS save failed",error);say("Couldn't save this article. Check the database migration, permissions, and required fields.",$("editor-message")); }
    finally {btn.disabled=false;btn.textContent=original;}
  }
  async function archivePost(id) {
    const p=posts.find(x=>x.id===id);if(!p)return;
    const next=p.status==="archived"?"draft":"archived";
    const {error}=await client.from("cms_posts").update({status:next,updated_at:new Date().toISOString()}).eq("id",id);
    if(error){say("Couldn't update article status.");return;}
    await client.from("cms_audit_log").insert({actor_id:user.id,action:next,entity_type:"post",entity_id:id,details:{title:p.title}});
    if(selectedId===id) $("editor-status").textContent=next.toUpperCase();
    await loadPosts();
  }
  async function deletePost(id) {
    const p=posts.find(x=>x.id===id);if(!p||!confirm('Permanently delete "'+(p.title||"Untitled article")+'" and its version history?'))return;
    const {error}=await client.from("cms_posts").delete().eq("id",id);
    if(error){say("Couldn't delete this article.");return;}
    await client.from("cms_audit_log").insert({actor_id:user.id,action:"deleted",entity_type:"post",entity_id:id,details:{title:p.title}});
    if(selectedId===id)clearForm();await loadPosts();say("Article deleted.");
  }
  function renderPreview() {
    const p=snapshot(), host=$("post-preview");
    const body=p.blocks.map(block=>{
      const txt=escapeHtml(block.text||"").replace(/\n/g,"<br>");
      if(block.type==="heading")return (Number(block.level)===3?"<h3>":"<h2>")+txt+(Number(block.level)===3?"</h3>":"</h2>");
      if(block.type==="text")return "<p>"+txt+"</p>";
      if(block.type==="quote")return "<blockquote><p>"+txt+"</p>"+(block.attribution?"<cite>"+escapeHtml(block.attribution)+"</cite>":"")+"</blockquote>";
      if(block.type==="image"){const url=safeUrl(block.url);return url?'<figure><img src="'+escapeHtml(url)+'" alt="'+escapeHtml(block.alt||"")+'"><figcaption>'+escapeHtml(block.caption||"")+"</figcaption></figure>":"";}
      if(block.type==="video"){const m=String(block.url||"").match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);return m?'<p><a href="https://www.youtube.com/watch?v='+m[1]+'" rel="noopener noreferrer" target="_blank">Watch video on YouTube</a></p>':"";}
      if(block.type==="link"){const url=safeUrl(block.url);return url?'<p><a href="'+escapeHtml(url)+'" rel="noopener noreferrer">'+escapeHtml(block.label||"Read more")+"</a></p>":"";}
      return "";
    }).join("");
    host.innerHTML='<article><p class="eyebrow">'+escapeHtml(p.category)+'</p><h1>'+escapeHtml(p.title||"Untitled article")+'</h1><p>'+escapeHtml(p.excerpt)+'</p>'+(p.cover_image?'<img src="'+escapeHtml(p.cover_image)+'" alt="'+escapeHtml(p.cover_alt)+'">':"")+body+"</article>";
    host.hidden=false;
  }
  $("post-title").addEventListener("input",()=>{if(!$("post-id").value||$("post-slug").dataset.touched!=="true")$("post-slug").value=slugify($("post-title").value);});
  $("post-slug").addEventListener("input",()=>{$("post-slug").dataset.touched="true";});
  $("add-block").addEventListener("click",()=>addBlock($("block-type").value));
  $("new-post").addEventListener("click",clearForm);
  $("save-draft").addEventListener("click",()=>save("draft"));
  $("publish-post").addEventListener("click",()=>save("published"));
  $("preview-post").addEventListener("click",renderPreview);
  $("post-search").addEventListener("input",renderPosts);$("post-filter").addEventListener("change",renderPosts);
  $("signout-button").addEventListener("click",async()=>{await client.auth.signOut();location.replace("index.html");});
  (async()=>{
    const {data,error}=await client.auth.getSession();
    if(error||!data.session){location.replace("index.html");return;}
    user=data.session.user;
    const {data:profile,error:profileError}=await client.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profileError||profile?.role!=="admin"){document.querySelector(".cms-layout").hidden=true;say("This area is restricted to studio administrators.");return;}
    await loadPosts();
  })();
})();