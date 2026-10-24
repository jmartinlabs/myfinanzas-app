import { join, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const source = resolve(process.argv[2]);
const chrome = process.argv[3];
const output = resolve(process.argv[4]);
const { chromium, expect } = await import(join(source, "node_modules/@playwright/test/index.js"));
const scratch = mkdtempSync(join(tmpdir(), "mf-focus-regression-"));
const entry = join(scratch, "entry.js");
await Bun.write(entry, `
import React from ${JSON.stringify(join(source, "apps/web/node_modules/react/index.js"))};
import {createRoot} from ${JSON.stringify(join(source, "apps/web/node_modules/react-dom/client.js"))};
import {CycleOperationForm} from ${JSON.stringify(join(source, "apps/web/src/Ciclos.tsx"))};
createRoot(document.getElementById('root')).render(React.createElement(CycleOperationForm, {go:()=>{}}));
`);
const built = await Bun.build({
  entrypoints: [entry], target: "browser", format: "esm",
  define: {"process.env.NODE_ENV": '"development"'},
  plugins: [{name: "export-private-component-for-regression", setup(build) {
    build.onLoad({filter: /Ciclos\.tsx$/}, async args => ({
      contents: await Bun.file(args.path).text() + '\nexport { CycleOperationForm };\n',
      loader: "tsx",
    }));
  }}],
});
if (!built.success) throw Error(JSON.stringify(built.logs));
const bundle = await built.outputs[0].text();
const cycle = {id: "nuevo", inicio: "2026-02-01", mesFinanciado: "2026-03-01", saldoInicialComida: "0.00", fin: null, estadoTemporal: "Abierto", corte: null, estadoCorte: "sin_referencia", revision: 1};
const context = {actual: null, motivo: "Sin referencia", ultimoInicio: null, revision: "fixture", referencia: {fecha:null, estado:"sin_hechos", coverage:[]}};
function preview(page: number) {
  return {operation:"omitido",id:null,before:null,after:cycle,contextRevision:"fixture",impactRevision:"fixture",ciclos:[{antes:null,despues:cycle}],
    movimientos:Array.from({length:page===1?100:1},(_,i)=>({id:String((page-1)*100+i+1),fecha:"2026-02-02",tipo:"Ingreso",vigencia:"Vigente",antes:null,despues:cycle})),
    totalMovimientos:101,page,contextoAntes:context,contextoDespues:context};
}
const server = Bun.serve({hostname:"127.0.0.1",port:0,fetch(req) {
  return new URL(req.url).pathname.endsWith('.js')
    ? new Response(bundle,{headers:{'content-type':'text/javascript'}})
    : new Response('<!doctype html><html><body><div id="root"></div><script type="module" src="/component.js"></script></body></html>',{headers:{'content-type':'text/html'}});
}});
const browser = await chromium.launch({executablePath:chrome,headless:true});
const browserVersion = browser.version();
const results: any[] = [];
let failure: string | undefined;
try {
  for (const hold of [false,true].filter(value=>process.argv[5]!=='--controlled-only'||value)) {
    const page = await browser.newPage({viewport:{width:390,height:844},locale:'es-ES'});
    const errors: string[] = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      const w=window as any;
      w.__events=[];w.__hold=false;w.__observe=false;w.__held=[];
      w.__log=(type:string,extra={})=>w.__events.push({type,region:!!document.querySelector('.cycle-impact'),active:document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName,...extra});
      const Native=window.MessageChannel;
      window.MessageChannel=class extends Native {
        constructor(){super();const port=this.port1;const descriptor=Object.getOwnPropertyDescriptor(MessagePort.prototype,'onmessage')!;
          Object.defineProperty(port,'onmessage',{get:()=>descriptor.get!.call(port),set:(handler:any)=>descriptor.set!.call(port,(event:any)=>{
            if(w.__hold){w.__log('scheduler-held');w.__held.push(()=>handler.call(port,event));}else handler.call(port,event);
          })});
        }
      };
      w.__release=()=>{w.__hold=false;w.__log('scheduler-released');for(const callback of w.__held.splice(0))setTimeout(callback,0);};
      w.__nativeRAF=window.requestAnimationFrame.bind(window);
      const focus=HTMLElement.prototype.focus;
      HTMLElement.prototype.focus=function(...args:any[]){if(w.__observe)w.__log('focus-call',{target:this.getAttribute('aria-label')??this.tagName});return focus.apply(this,args as any);};
    });
    type Gate={response:Promise<void>;release:()=>void;requested:Promise<void>;markRequested:()=>void};
    let gate:Gate;
    const makeGate=():Gate=>{let release!:()=>void,markRequested!:()=>void;return{response:new Promise<void>(r=>release=r),release:()=>release(),requested:new Promise<void>(r=>markRequested=r),markRequested:()=>markRequested()};};
    await page.route('**/api/ciclos/omitido/preview*',async route=>{
      const current=gate;current.markRequested();await current.response;
      await route.fulfill({status:200,json:preview(Number(new URL(route.request().url()).searchParams.get('page')??1))});
    });
    await page.goto(`http://127.0.0.1:${server.port}/`);
    await page.getByLabel('Inicio ciclo *',{exact:true}).fill('2026-02-01');
    await page.getByLabel('Saldo inicial comida (€) *',{exact:true}).fill('0');
    const motivo=page.getByLabel('Motivo *',{exact:true});
    await motivo.fill('Regresión ficticia de foco');
    const region=page.getByRole('region',{name:'Revisión de impacto de Ciclos'});
    const steps:string[]=[];
    const countRegionFocus=()=>page.evaluate(()=>(window as any).__events.filter((e:any)=>e.type==='focus-call'&&e.target==='Revisión de impacto de Ciclos').length);
    const frames=()=>page.evaluate(()=>new Promise<void>(done=>{const w=window as any;w.__nativeRAF(()=>w.__nativeRAF(()=>done()));}));
    async function review(button:string,expectedPage:number,label:string) {
      gate=makeGate();
      const before=await countRegionFocus();
      await page.getByRole('button',{name:button,exact:true}).click();
      let timer:ReturnType<typeof setTimeout>;
      try{await Promise.race([gate.requested,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Preview request not observed')),5000);})]);}finally{clearTimeout(timer!);}
      await page.evaluate(({hold,label})=>{const w=window as any;w.__observe=true;w.__hold=hold;w.__log('response-release',{step:label});},{hold,label});
      // Busy/render updates without a new impact must not steal focus.
      if(await countRegionFocus()!==before)throw Error('Focus moved before the new preview response');
      gate.release();
      if(hold){
        await page.waitForFunction(()=>(window as any).__held.length>0,undefined,{timeout:5000});
        await frames();
        await page.evaluate(()=>(window as any).__release());
      }
      await expect(region).toBeVisible();
      await expect(region).toContainText('Página '+expectedPage);
      await expect(region).toBeFocused();
      if(await countRegionFocus()!==before+1)throw Error('Expected one focus assignment for the new impact');
      steps.push(label);
    }
    try {
      await review('Revisar impacto',1,'initial-review');
      await review('Siguiente detalle',2,'pagination');
      await page.getByRole('button',{name:'Volver al borrador',exact:true}).click();
      await expect(region).toHaveCount(0);
      await motivo.focus();
      const before=await countRegionFocus();
      await frames();
      await expect(motivo).toBeFocused();
      if(await countRegionFocus()!==before)throw Error('Review stole focus after returning to draft');
      steps.push('return-to-draft');
      await motivo.fill('Nueva revisión ficticia');
      await frames();
      await expect(motivo).toBeFocused();
      if(await countRegionFocus()!==before)throw Error('Review stole focus while editing draft');
      steps.push('draft-edit-keeps-focus');
      await review('Revisar impacto',1,'new-review');
      if(errors.length)throw Error('Browser error: '+errors.join('; '));
      results.push({hold,passed:true,steps,events:await page.evaluate(()=>(window as any).__events)});
    } catch(error) {
      results.push({hold,passed:false,steps,events:await page.evaluate(()=>(window as any).__events)});
      throw error;
    } finally {await page.close();}
  }
} catch(error) {failure=error instanceof Error?error.message:String(error);}
finally {await browser.close();server.stop(true);}
await Bun.write(output,JSON.stringify({mode:'current-component-regression',browser:browserVersion,passed:!failure,cases:results,...(failure?{error:failure}:{})},null,2));
console.log(JSON.stringify(results.map(({events,...r})=>r)));
if(failure)throw Error(failure);
