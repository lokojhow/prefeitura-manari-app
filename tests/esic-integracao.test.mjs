import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('cartões e menus abrem Ouvidoria e e-SIC nas aplicações separadas',async()=>{
 const source=await read('www/app.js');
 const match=source.match(/const OFFICIAL_LINKS\s*=\s*({[\s\S]*?});/);assert(match);
 const links=vm.runInNewContext('('+match[1]+')');
 assert.equal(links.Ouvidoria,'./ouvidoria/');assert.equal(links['E-SIC'],'./esic/');
 const routing=(await read('www/sidebar-menu.js')).split('// ESIC_ROUTING_BEGIN')[1].split('// ESIC_ROUTING_END')[0];
 for(const base of ['https://portal.example/#ouvidoria','https://portal.example/www/index.html#ouvidoria']) {
  const destinations=[];let handler;
  const window={location:{href:base,assign:url=>destinations.push(url)}};
  vm.runInNewContext(routing,{window,URL,document:{addEventListener:(type,fn)=>handler=fn}});
  const click=(label,nav=null)=>{
   let prevented=false;
   const target={getAttribute:key=>key==='data-service'?label:key==='data-nav'?nav:null,querySelector:()=>null};
   handler({target:{closest:()=>target},preventDefault(){prevented=true;},stopImmediatePropagation(){}});
   return prevented;
  };
  assert.equal(click('E-SIC'),true);assert.equal(click('e-SIC / Acesso à Informação'),true);
  assert.equal(click('Ouvidoria'),true);assert.equal(click('Ouvidoria Municipal'),true);
  assert.equal(click('Ícone', 'ouvidoria'),true);assert.equal(click('Ícone','esic'),true);
  assert.equal(click('Carta de Serviços'),false);assert.equal(click('Portal da Transparência'),false);
  assert.deepEqual(destinations.map(url=>url.replace(new URL('./',base).href,'')),['esic/','esic/','ouvidoria/','ouvidoria/','ouvidoria/','esic/']);
 }
});

test('portal interno encaminha Ouvidoria e e-SIC sem abrir o formulário legado',async()=>{
 const source=await read('www/portal-internal.js');
 const destinations=[];
 const window={location:{href:'https://portal.example/#ouvidoria',assign:url=>destinations.push(url)}};
 const context={window,URL,document:{readyState:'loading',addEventListener(){}}};
 vm.runInNewContext(source,context);
 for(const title of ['e-SIC','e-SIC / Pedido de Informação','e-SIC / Acesso à Informação','LAI / e-SIC'])await window.ManariPortalInternal.open(title);
 await window.ManariPortalInternal.open('Título alternativo','esic');
 assert.equal(destinations.length,5);
 assert(destinations.every(url=>url==='https://portal.example/esic/'));
 for(const title of ['Ouvidoria','Ouvidoria Municipal'])await window.ManariPortalInternal.open(title);
 await window.ManariPortalInternal.open('Título alternativo','ouvidoria');
 assert.deepEqual(destinations.slice(5),Array(3).fill('https://portal.example/ouvidoria/'));
 assert.equal(window.ManariPortalInternal.moduleFor('Ouvidoria Municipal'),'ouvidoria');
});

test('rota antiga #ouvidoria também abre a aplicação nova antes de renderizar o portal',async()=>{
 const source=await read('www/app.js');
 const match=source.match(/async function render\(route, push=true, preservedScroll=null\)\{([\s\S]*?)currentRoute=route;/);assert(match);
 for(const base of ['https://portal.example/#ouvidoria','https://portal.example/www/index.html#ouvidoria']){
  const destinations=[];
  const window={location:{href:base,assign:url=>destinations.push(url)}};
  await vm.runInNewContext('(async function(route){'+match[1]+"throw new Error('render legado acessado')})('ouvidoria')",{window,URL});
  assert.deepEqual(destinations,[new URL('./ouvidoria/',base).href]);
 }
});

async function serviceWorker(scope='https://portal.example/') {
 const listeners={};
 const context={URL,Headers,Response,Request,console,
  self:{registration:{scope},location:{origin:new URL(scope).origin},addEventListener:(type,fn)=>listeners[type]=fn},
  caches:{open:async()=>({put:async()=>{}}),match:async()=>undefined},
  fetch:async()=>new Response('<html><head></head><body><main>Portal</main></body></html>',{headers:{'Content-Type':'text/html'}})
 };
 vm.createContext(context);vm.runInContext(await read('www/service-worker.js'),context);
 return {context,listeners};
}

test('cache do portal não intercepta nem reescreve páginas e arquivos do e-SIC',async()=>{
 const {context,listeners}=await serviceWorker();
 const html='<html data-esic-runtime="supabase"><head></head><body><main>e-SIC</main></body></html>';
 for(const path of ['/esic','/esic/','/esic/index.html','/esic/app.mjs','/esic/styles.css','/ouvidoria','/ouvidoria/','/ouvidoria/app.mjs']) {
  let intercepted=false;
  listeners.fetch({request:{method:'GET',url:'https://portal.example'+path,mode:'navigate'},respondWith(){intercepted=true;}});
  assert.equal(intercepted,false,path);
  const response=new Response(html,{headers:{'Content-Type':'text/html'}});
  const prepared=await context.prepareResponse({url:'https://portal.example'+path,mode:'navigate'},response);
  assert.equal(prepared,response,'resposta deve ser preservada');assert.equal(await prepared.text(),html);
 }
});

test('isolamento de cache também funciona quando o portal é hospedado em subpasta',async()=>{
 const {listeners}=await serviceWorker('https://portal.example/prefeitura/www/');
 let intercepted=false;
 listeners.fetch({request:{method:'GET',url:'https://portal.example/prefeitura/www/esic/',mode:'navigate'},respondWith(){intercepted=true;}});
 assert.equal(intercepted,false);
});

test('comportamento anterior da página inicial permanece no service worker',async()=>{
 const {context,listeners}=await serviceWorker();
 const response=new Response('<html><head></head><body><main>Portal</main></body></html>',{headers:{'Content-Type':'text/html'}});
 const prepared=await context.prepareResponse({url:'https://portal.example/',mode:'navigate'},response);
 const html=await prepared.text();assert.match(html,/manari-first-paint-gate/);assert.match(html,/sidebar-menu\.js/);
 let pending;
 listeners.fetch({request:{method:'GET',url:'https://portal.example/',mode:'navigate'},respondWith:promise=>pending=promise});
 assert(pending);assert.equal((await pending).status,200);
});
