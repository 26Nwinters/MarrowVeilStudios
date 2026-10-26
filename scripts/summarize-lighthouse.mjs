import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const files=readdirSync('.lighthouseci').filter(x=>x.endsWith('.report.json'));
if(!files.length)throw Error('No Lighthouse reports generated');
const summary=files.map(f=>{
 const x=JSON.parse(readFileSync('.lighthouseci/'+f,'utf8'));
 const cat=x.categories||{},aud=x.audits||{};
 return {url:x.finalDisplayedUrl||x.finalUrl,performance:Math.round((cat.performance?.score||0)*100),accessibility:Math.round((cat.accessibility?.score||0)*100),seo:Math.round((cat.seo?.score||0)*100),bestPractices:Math.round((cat['best-practices']?.score||0)*100),lcpMs:aud['largest-contentful-paint']?.numericValue??null,cls:aud['cumulative-layout-shift']?.numericValue??null,ttiMs:aud.interactive?.numericValue??null};
});
console.log(JSON.stringify(summary,null,2));
writeFileSync('.lighthouseci/summary.json',JSON.stringify(summary,null,2)+'\n');
