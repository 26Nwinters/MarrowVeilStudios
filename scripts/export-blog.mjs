#!/usr/bin/env node
/**
 * Export published Supabase Content Studio posts as crawlable static pages.
 * No privileged database keys are used. Public posts only, exact published filter.
 * Run: node scripts/export-blog.mjs
 */
import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';

const origin='https://marrowveilstudios.com';
const read=async path=>readFile(path,'utf8');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const safeUrl=s=>typeof s==='string'&&/^https?:\/\/[a-z0-9]/i.test(s);
const safeSlug=s=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
function renderBlock(block){
  const t=esc(block.text||'').replace(/\r?\n/g,'<br>');
  if(block.type==='heading')return Number(block.level)===3?'<h3>'+t+'</h3>':'<h2>'+t+'</h2>';
  if(block.type==='text')return '<p>'+t+'</p>';
  if(block.type==='quote')return '<blockquote><p>'+t+'</p>'+(block.attribution?'<cite>'+esc(block.attribution)+'</cite>':'')+'</blockquote>';
  if(block.type==='image'&&safeUrl(block.url))return '<figure><img loading="lazy" decoding="async" src="'+esc(block.url)+'" alt="'+esc(block.alt||block.caption||'Development image')+'"><figcaption>'+esc(block.caption||'')+'</figcaption></figure>';
  if(block.type==='link'&&safeUrl(block.url))return '<p><a href="'+esc(block.url)+'" rel="noopener noreferrer">'+esc(block.label||'Read more')+'</a></p>';
  if(block.type==='video'){
    const match=String(block.url||'').match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    return match?'<div class="article-video"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/'+match[1]+'" title="'+esc(block.caption||'YouTube video')+'" allowfullscreen></iframe></div>':'';
  }
  return '';
}
const updateAttr=(html,regex,value)=>html.replace(regex,(_full,before,after)=>before+esc(value)+after);
function buildArticle(template,p){
  const url=origin+'/articles/'+p.slug+'/';
  const title=p.seo_title||p.title,description=p.seo_description||p.excerpt;
  const cover=p.cover_image||origin+'/assets/home/Featured_Image_01.png';
  const date=(p.published_at||'').slice(0,10);
  let html=template.replace('<head>','<head>\n  <base href="/" />');
  html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>'+esc(title)+' | MarrowVeil Studios</title>');
  for(const [key,value] of [
    ['name="description"',description],
    ['property="og:title"',title],
    ['property="og:description"',description],
    ['property="og:url"',url],
    ['property="og:image"',cover],
    ['name="twitter:title"',title],
    ['name="twitter:description"',description],
    ['name="twitter:image"',cover]
  ]){
    const meta=new RegExp('(<meta '+key+' content=")[^"]*(")');
    html=updateAttr(html,meta,value);
  }
  html=updateAttr(html,/(<link rel="canonical" href=")[^"]*(")/,url);
  const json={'@context':'https://schema.org','@type':'BlogPosting',mainEntityOfPage:url,headline:p.title,description,datePublished:date,image:cover,author:{'@id':origin+'/#organization'},publisher:{'@id':origin+'/#organization'}};
  html=html.replace('</head>','<meta property="article:published_time" content="'+esc(p.published_at)+'">\n<script type="application/ld+json">'+JSON.stringify(json)+'</script>\n</head>');
  const blocks=Array.isArray(p.blocks)?p.blocks.map(renderBlock).join('\n'):'';
  const body='<article id="article-content" class="article-content">'+
    '<p class="article-kicker">'+esc(p.category)+'</p>'+
    '<h1 class="article-title">'+esc(p.title)+'</h1>'+
    '<p class="article-excerpt">'+esc(p.excerpt)+'</p>'+
    '<p class="article-date"><time datetime="'+esc(date)+'">'+esc(date)+'</time></p>'+
    (p.cover_image?'<img class="article-cover" loading="lazy" decoding="async" src="'+esc(p.cover_image)+'" alt="'+esc(p.cover_alt||p.title+' cover art')+'">':'')+
    blocks+'</article>';
  html=html.replace('<article id="article-content" class="article-state" aria-live="polite">Loading article…</article>',body);
  html=html.replace(/\s*<script src="employee\/config.js"><\/script>\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\s*<script src="article.js"><\/script>/,'');
  if(html.includes('Loading article…')||!html.includes('"@type":"BlogPosting"'))throw Error('Article template not rendered '+p.slug);
  return html;
}
async function main(){
  const config=await read('employee/config.js');
  const project=config.match(/MARROWVEIL_SUPABASE_URL\s*=\s*"(https:\/\/[^"]+)"/)?.[1];
  const key=config.match(/MARROWVEIL_SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
  if(!project||!key||!key.startsWith('sb_publishable_'))throw Error('No valid public Supabase configuration');
  const query='?select=slug,title,excerpt,category,published_at,seo_title,seo_description,cover_image,cover_alt,blocks&status=eq.published&order=published_at.desc&limit=1000';
  const response=await fetch(project+'/rest/v1/cms_posts'+query,{headers:{apikey:key}});
  if(!response.ok)throw Error('Published post API returned '+response.status);
  const posts=await response.json();
  if(!Array.isArray(posts))throw Error('Invalid published post list');
  if(posts.some(p=>!safeSlug(p.slug)))throw Error('Invalid published slug: refusing export');
  const template=await read('article.html');
  await mkdir('articles',{recursive:true});
  for(const p of posts){
    const dest=join('articles',p.slug);
    await mkdir(dest,{recursive:true});
    await writeFile(join(dest,'index.html'),buildArticle(template,p));
  }
  const slugs=posts.map(p=>p.slug);
  // Remove snapshots of unpublished posts only after the API returned a valid list.
  for(const name of await readdir('articles',{withFileTypes:true})){
    if(name.isDirectory()&&safeSlug(name.name)&&!slugs.includes(name.name))await rm(join('articles',name.name),{recursive:true,force:true});
  }
  await writeFile('articles/manifest.json',JSON.stringify(slugs,null,2)+'\n');
  let sitemap=await read('sitemap.xml');
  sitemap=sitemap.replace(/\s*<url>\s*<loc>https:\/\/marrowveilstudios\.com\/articles\/[^<]+<\/loc>\s*<\/url>/g,'');
  const links=posts.map(p=>'  <url><loc>'+origin+'/articles/'+p.slug+'/</loc></url>').join('\n');
  sitemap=sitemap.replace('</urlset>',links+'\n</urlset>');
  await writeFile('sitemap.xml',sitemap);
  const feed='<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>MarrowVeil Studios Devlog</title><link>'+origin+'/blog</link><description>News, studio updates, and development dispatches.</description>'+
    posts.map(p=>'<item><title>'+xml(p.title)+'</title><link>'+origin+'/articles/'+p.slug+'/</link><guid isPermaLink="true">'+origin+'/articles/'+p.slug+'/</guid><description>'+xml(p.excerpt)+'</description><pubDate>'+new Date(p.published_at).toUTCString()+'</pubDate></item>').join('')+
    '</channel></rss>\n';
  await writeFile('feed.xml',feed);
  // The blog's static fallback is also visible to non-JavaScript crawlers.
  for(const path of ['blog.html','blog/index.html']){
    let html=await read(path);
    const head=posts[0];
    const fallback=head?'<article class="blog-card"><div class="blog-card-body"><div><span class="blog-tag">'+esc(head.category)+'</span></div><h2 class="blog-card-title"><a href="/articles/'+head.slug+'/">'+esc(head.title)+'</a></h2><p class="blog-card-excerpt">'+esc(head.excerpt)+'</p></div></article>':'';
    const marker=/<div class="blog-grid">[\s\S]*?<\/article><\/div>|<div class="blog-grid"><\/div>/;
    if(!marker.test(html))throw Error('Unexpected blog page markup: '+path);
    html=html.replace(marker,'<div class="blog-grid">'+fallback+'</div>');
    html=html.replace(/<span class="blog-count"><span>\d+<\/span> (?:Post|Posts)<\/span>/,'<span class="blog-count"><span>'+posts.length+'</span> '+(posts.length===1?'Post':'Posts')+'</span>');
    await writeFile(path,html);
  }
  console.log('Exported '+posts.length+' publicly published post(s).');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
