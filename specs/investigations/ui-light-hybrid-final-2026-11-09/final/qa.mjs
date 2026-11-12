import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const report = { themes: {}, layout: [], fonts: [], interactions: [] };
const pairs = [
  ["text/surface","--text","--surface"],["text/bg","--text","--bg"],
  ["muted/surface","--muted","--surface"],["accent-ink/surface","--accent-ink","--surface"],
  ["on-orange/orange","--on-orange","--orange"],["positive/surface","--positive","--surface"],
  ["negative/surface","--negative","--surface"],["warning/surface","--warning","--surface"],
  ["sidebar-text/sidebar","--sidebar-text","--sidebar"],
  ["sidebar-muted/sidebar","--sidebar-muted","--sidebar"],
  ["sidebar-active-text/active","--sidebar-active-text","--sidebar-active-solid"],
  ["hero-text/hero","--hero-text","--hero-bg-solid"],
  ["hero-muted/hero","--hero-muted","--hero-bg-solid"],
  ["hero-positive/hero","--hero-positive","--hero-bg-solid"],
  ["hero-plan/hero","--hero-plan","--hero-bg-solid"],
  ["muted/table-head","--muted","--table-head"],
  ["text/input","--text","--input-bg"],
  ["positive/positive-soft","--positive","--positive-soft"],
  ["warning/warning-soft","--warning","--warning-soft"]
];
function parse(c){if(!c)return null;if(c.startsWith('#')){let h=c.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');const n=parseInt(h.slice(0,6),16);const a=h.length===8?parseInt(h.slice(6,8),16)/255:1;return{r:(n>>16)&255,g:(n>>8)&255,b:n&255,a};}const m=c.match(/rgba?\(([^)]+)\)/i);if(!m)return null;const p=m[1].split(',').map(x=>Number(x.trim()));return{r:p[0],g:p[1],b:p[2],a:p[3]??1};}
function blend(f,b){const a=f.a??1;return{r:f.r*a+b.r*(1-a),g:f.g*a+b.g*(1-a),b:f.b*a+b.b*(1-a),a:1};}
function lum(c){const v=[c.r,c.g,c.b].map(x=>{const y=x/255;return y<=0.03928?y/12.92:Math.pow((y+0.055)/1.055,2.4)});return .2126*v[0]+.7152*v[1]+.0722*v[2];}
function ratio(a,b){const x=parse(a),y=parse(b);if(!x||!y)return null;const l1=lum(x),l2=lum(y);return Number(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2));}

for (const [file,key] of [["inicio-light.html","light"],["inicio-hybrid.html","hybrid"],["movimientos-light.html","movimientos-light"],["movimientos-hybrid.html","movimientos-hybrid"]]) {
  const page = await browser.newPage({ viewport:{width:1440,height:1000} });
  const errors=[]; page.on("console",m=>{if(m.type()==="error")errors.push(m.text())}); page.on("pageerror",e=>errors.push(e.message));
  await page.goto("file://" + join(here,file), {waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(120);
  const data = await page.evaluate((pairs)=>{
    const s=getComputedStyle(document.documentElement), v=n=>s.getPropertyValue(n).trim();
    const out={tokens:{},fonts:[],layout:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,scrollHeight:document.documentElement.scrollHeight},theme:document.documentElement.dataset.theme};
    for(const [name,fg,bg] of pairs) out.tokens[name]=[v(fg),v(bg)];
    const plan=document.querySelector('.c-plan-cell');
    const planBg=plan?getComputedStyle(plan).getPropertyValue('--plan-bg-solid').trim():'';
    const planText=document.querySelector('.c-plan-cell .c-plan-amount strong');
    const objective=document.querySelector('.b-objective-value strong');
    const attention=document.querySelector('.b-attn-title');
    const detail=document.querySelector('.detail-concept');
    out.local={};
    if(plan&&planText) out.local.plan={fg:getComputedStyle(planText).color,bg:planBg};
    if(objective) out.local.objective={fg:getComputedStyle(objective).color,bg:v('--hero-bg-solid')};
    if(attention) out.local.attention={fg:getComputedStyle(attention).color,bg:v('--surface')};
    if(detail) out.local.detail={fg:getComputedStyle(detail).color,bg:v('--surface')};
    for(const el of document.querySelectorAll('body *')){
      const own=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).join(' ').trim(); if(!own)continue;
      const st=getComputedStyle(el); if(st.display==='none'||st.visibility==='hidden')continue;
      if(parseFloat(st.fontSize)<12&&!el.classList.contains('brand-sub')) out.fonts.push({size:parseFloat(st.fontSize),cls:String(el.className).slice(0,40),text:own.slice(0,40)});
    }
    out.fonts=out.fonts.slice(0,20);
    return out;
  }, pairs);
  const ratios={};
  for(const [name,[fg,bg]] of Object.entries(data.tokens)){const r=ratio(fg,bg);if(r!==null)ratios[name]=r;}
  const localKeys = key === 'light' ? ['plan','objective'] : key === 'hybrid' ? ['attention'] : ['detail'];
  for(const name of localKeys){const item=data.local[name];if(!item)continue;const r=ratio(item.fg,item.bg);if(r!==null)ratios[`local-${name}`]=r;}
  report.themes[key]={ratios,layout:data.layout,errors};
  report.layout.push({file,...data.layout,errors});
  if(data.fonts.length) report.fonts.push({file,elements:data.fonts});
  if(key==='movimientos-light'||key==='movimientos-hybrid'){
    const before=await page.locator('[data-field="concepto"]').first().textContent();
    await page.locator("tr[data-movement='318']").click();
    await page.waitForTimeout(60);
    const after=await page.locator('[data-field="concepto"]').first().textContent();
    report.interactions.push({test:`seleccion-${key}`,before,after,ok:after?.includes('Nómina')});
  }
  if(key==='light'){
    await page.selectOption('.theme-control .theme-select','dark-s');
    const dark=await page.evaluate(()=>document.documentElement.dataset.theme);
    await page.selectOption('.theme-control .theme-select','hybrid-s');
    const hybrid=await page.evaluate(()=>document.documentElement.dataset.theme);
    report.interactions.push({test:'selector-tema-light-final',dark,hybrid,ok:dark==='dark-s'&&hybrid==='hybrid-s'});
  }
  await page.close();
}
writeFileSync(join(here,'qa-report.json'),JSON.stringify(report,null,2));
await browser.close();
const failures=Object.entries(report.themes).flatMap(([theme,d])=>Object.entries(d.ratios).filter(([,r])=>r<4.5).map(([name,r])=>({theme,name,r})));
console.log('failures',failures);
console.log('layout',report.layout);
console.log('fonts',report.fonts);
console.log('interactions',report.interactions);
