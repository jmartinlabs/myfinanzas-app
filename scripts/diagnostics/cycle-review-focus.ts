import { join, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const source = resolve(process.argv[2]);
const chrome = process.argv[3];
const output = resolve(process.argv[4]);
const { chromium, expect } = await import(join(source, "node_modules/@playwright/test/index.js"));
const scratch = mkdtempSync(join(tmpdir(), "mf-focus-probe-"));
const entry = join(scratch, "entry.js");
await Bun.write(entry, `
import React from ${JSON.stringify(join(source, "apps/web/node_modules/react/index.js"))};
import {createRoot} from ${JSON.stringify(join(source, "apps/web/node_modules/react-dom/client.js"))};
import {CycleOperationForm} from ${JSON.stringify(join(source, "apps/web/src/Ciclos.tsx"))};
const root = createRoot(document.getElementById('root'));
root.render(React.createElement(CycleOperationForm, {go:()=>{}}));
`);
const bundles: Record<string, string> = {};
for (const variant of ["baseline", "layout-effect"]) {
  const built = await Bun.build({
    entrypoints: [entry], target: "browser", format: "esm",
    define: {"process.env.NODE_ENV": '"development"'},
    plugins: [{name: "diagnostic-only-component-export", setup(build) {
      build.onLoad({filter: /Ciclos\.tsx$/}, async args => {
        let contents = await Bun.file(args.path).text();
        if (variant === "layout-effect") {
          const original = '      requestAnimationFrame(() => reviewRef.current?.focus());';
          if (!contents.includes(original)) throw Error("Unexpected source: review RAF missing");
          contents = contents.replace('useEffect, useRef, useState', 'useEffect, useLayoutEffect, useRef, useState')
            .replace(original, '')
            .replace('  const endpoint = id ?', '  useLayoutEffect(() => { if (impact) reviewRef.current?.focus(); }, [impact]);\n  const endpoint = id ?');
        } else {
          contents = contents.replace('      requestAnimationFrame(() => reviewRef.current?.focus());',
            '      requestAnimationFrame(() => { (window as any).__log("review-focus-frame", {refPresent: Boolean(reviewRef.current)}); reviewRef.current?.focus(); });');
        }
        return {contents: contents + '\nexport { CycleOperationForm };\n', loader: "tsx"};
      });
    }}],
  });
  if (!built.success) throw Error(JSON.stringify(built.logs));
  bundles[variant] = await built.outputs[0].text();
}
const cycle = {id: "nuevo", inicio: "2026-02-01", mesFinanciado: "2026-03-01", saldoInicialComida: "0.00", fin: null, estadoTemporal: "Abierto", corte: null, estadoCorte: "sin_referencia", revision: 1};
const context = {actual: null, motivo: "Sin referencia", ultimoInicio: null, revision: "fixture", referencia: {fecha:null, estado:"sin_hechos", coverage:[]}};
const impact = {operation:"omitido",id:null,before:null,after:cycle,contextRevision:"fixture",impactRevision:"fixture",ciclos:[{antes:null,despues:cycle}],movimientos:[],totalMovimientos:0,page:1,contextoAntes:context,contextoDespues:context};
const server = Bun.serve({hostname:"127.0.0.1",port:0,fetch(req) {
  const path = new URL(req.url).pathname;
  if (path.endsWith('.js')) return new Response(bundles[path.includes('layout-effect') ? 'layout-effect' : 'baseline'], {headers:{'content-type':'text/javascript'}});
  return new Response('<!doctype html><html><body><div id="root"></div><script type="module" src="' + path.slice(1) + '.js"></script></body></html>', {headers:{'content-type':'text/html'}});
}});
const browser = await chromium.launch({executablePath:chrome,headless:true});
const results: any[] = [];
try {
  for (const scenario of [{variant:'baseline',hold:false},{variant:'baseline',hold:true},{variant:'layout-effect',hold:true}].filter(s=>process.argv[5]!=='--controlled-only'||s.hold)) {
    const page = await browser.newPage({viewport:{width:390,height:844},locale:'es-ES'});
    const errors: string[] = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.addInitScript(() => {
      const w = window as any;
      w.__events=[]; w.__hold=false; w.__observe=false; w.__held=[];
      w.__log=(type:string,extra={})=>w.__events.push({type,region:!!document.querySelector('.cycle-impact'),active:document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName,...extra});
      const Native = window.MessageChannel;
      window.MessageChannel = class extends Native {
        constructor(){super(); const port=this.port1; const descriptor=Object.getOwnPropertyDescriptor(MessagePort.prototype,'onmessage')!;
          Object.defineProperty(port,'onmessage',{get:()=>descriptor.get!.call(port),set:(handler:any)=>descriptor.set!.call(port,(event:any)=>{
            if(w.__hold){w.__log('scheduler-held'); w.__held.push(()=>handler.call(port,event));}
            else handler.call(port,event);
          })});
        }
      };
      w.__release=()=>{w.__hold=false;w.__log('scheduler-released');for(const callback of w.__held.splice(0))setTimeout(callback,0);};
      const raf=window.requestAnimationFrame.bind(window); w.__nativeRAF=raf;
      const focus=HTMLElement.prototype.focus;
      HTMLElement.prototype.focus=function(...args:any[]){if(w.__observe)w.__log('focus-call',{target:this.getAttribute('aria-label')??this.tagName});return focus.apply(this,args as any);};
      new MutationObserver(()=>{if(w.__observe && document.querySelector('.cycle-impact')&&!w.__mounted){w.__mounted=true;w.__log('region-committed');}}).observe(document,{childList:true,subtree:true});
    });
    let release!: ()=>void;
    const gate=new Promise<void>(r=>release=r);
    await page.route('**/api/ciclos/omitido/preview*',async route=>{await gate;await route.fulfill({status:200,json:impact});});
    await page.goto(`http://127.0.0.1:${server.port}/${scenario.variant}`);
    await page.getByLabel('Inicio ciclo *',{exact:true}).fill('2026-02-01');
    await page.getByLabel('Saldo inicial comida (€) *',{exact:true}).fill('0');
    await page.getByLabel('Motivo *',{exact:true}).fill('Diagnóstico ficticio de foco');
    await page.getByRole('button',{name:'Revisar impacto',exact:true}).click();
    await expect(page.getByRole('button',{name:'Revisando…',exact:true})).toBeDisabled();
    await page.evaluate(hold=>{const w=window as any;w.__observe=true;w.__hold=hold;w.__log('response-release');},scenario.hold);
    release();
    if(scenario.hold){
      await page.waitForFunction(()=>(window as any).__held.length>0, undefined, {timeout:5000});
      await page.evaluate(()=>new Promise<void>(done=>{const w=window as any;w.__nativeRAF(()=>w.__nativeRAF(()=>done()));}));
      await page.evaluate(()=>(window as any).__release());
    }
    const region=page.getByRole('region',{name:'Revisión de impacto de Ciclos'});
    await expect(region).toBeVisible();
    let focused=true;
    try{await expect(region).toBeFocused();}catch(e){focused=false;}
    const events=await page.evaluate(()=>(window as any).__events);
    const expectedFocus = !(scenario.variant==='baseline'&&scenario.hold);
    if(errors.length)throw Error('Browser error: '+errors.join('; '));
    if(focused!==expectedFocus)throw Error('Unexpected outcome: '+JSON.stringify({scenario,focused,events}));
    results.push({...scenario,focused,events});
    await page.close();
  }
} finally { await browser.close();server.stop(true); }
await Bun.write(output,JSON.stringify({sourceVariant:'main product source; export only in diagnostic bundle',react:'19.3.1',browser:'Chrome headless',cases:results},null,2));
console.log(JSON.stringify(results.map(({events,...r})=>r)));
