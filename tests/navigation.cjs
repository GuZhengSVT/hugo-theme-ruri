const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/ruri.js'),'utf8');
const code=source.slice(source.indexOf('let navigationController;'),source.indexOf("document.addEventListener('click',e=>",source.indexOf('let navigationController;')));
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};

function fixture(){
  const state={requests:[],loads:[],assignments:[],history:[],scrolls:[],math:[],timers:new Map(),classes:new Set(),docs:new Map()};
  const status={hidden:true,textContent:''};
  function shell(scripts=[]){return{scripts,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},replaceWith(next){state.shell=next},querySelectorAll(){return this.scripts},querySelector(){return{prose:true}}}}
  state.shell=shell();
  const document={documentElement:{classList:{toggle(k,on){on?state.classes.add(k):state.classes.delete(k)}}},head:{append(){}},
    querySelector(selector){return selector==='#page-shell'?state.shell:selector==='#navigation-status'?status:null},querySelectorAll(){return[]},
    getElementById(id){return id==='section'?{scrollIntoView(options){state.scrolls.push({id,options})}}:null},
    createElement(){return{setAttribute(k,v){this[k]=v}}}};
  const context=vm.createContext({document,window:{RuriFeatures:{destroy(){}},scrollTo(options){state.scrolls.push(options)}},
    history:{pushState(...args){state.history.push(args)}},location:{assign(url){state.assignments.push(url)}},
    AbortController,URL,Promise,Map,waline:null,pageVersion:0,initPage(){},tr:()=> 'Loading page…',
    $:selector=>document.querySelector(selector),
    DOMParser:class{parseFromString(html){return state.docs.get(html)}},
    setTimeout(fn){const id=Symbol();state.timers.set(id,fn);return id},clearTimeout(id){state.timers.delete(id)},
    fetch(url,{signal}){return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason));state.requests.push({url,resolve})})}});
  vm.runInContext(code,context);
  state.status=status;state.context=context;
  state.respond=(index,key,scripts=[],ok=true)=>{
    const next=shell(scripts);state.docs.set(key,{title:key,documentElement:{lang:'en'},querySelector:()=>next,querySelectorAll:()=>[]});
    state.requests[index].resolve({ok,url:state.requests[index].url,headers:{get:()=> 'text/html'},text:async()=>key});return next;
  };
  state.script=(library)=>({src:'https://cdn.example/'+library+'.js',dataset:{pageLibrary:library},attributes:[{name:'src',value:'https://cdn.example/'+library+'.js'}],remove(){},replaceWith(script){state.loads.push(script)}});
  return state;
}

(async()=>{
  let s=fixture(),old=s.shell;
  let nav=s.context.navigate('https://site.example/one/');
  assert.equal(s.status.hidden,false);assert.equal(s.shell.attrs['aria-busy'],'true');assert.equal(s.shell,old);
  s.respond(0,'one');await nav;
  assert.notEqual(s.shell,old);assert.equal(s.status.hidden,true);assert.equal(s.shell.attrs['aria-busy'],undefined);
  assert.equal(s.scrolls[0].behavior,'instant');assert.equal(s.timers.size,0);

  s=fixture();nav=s.context.navigate('https://site.example/math/');
  s.respond(0,'math',[s.script('katex'),s.script('renderMathInElement')]);await flush();
  assert.equal(s.status.hidden,true);assert.equal(s.loads.length,1);assert.equal(s.scrolls.length,1);
  s.context.window.katex={};s.loads[0].onload();await flush();
  assert.equal(s.loads.length,2);
  s.context.window.renderMathInElement=prose=>s.math.push(prose);s.loads[1].onload();await nav;
  assert.equal(s.math.length,1);
  nav=s.context.navigate('https://site.example/math-two/#section');
  s.respond(1,'math-two',[s.script('katex'),s.script('renderMathInElement')]);await nav;
  assert.equal(s.loads.length,2);assert.equal(s.math.length,2);assert.equal(s.scrolls.at(-1).id,'section');

  s=fixture();const first=s.context.navigate('https://site.example/first/');
  const second=s.context.navigate('https://site.example/second/');await first;
  assert.equal(s.status.hidden,false);assert.equal(s.assignments.length,0);
  s.respond(1,'second');await second;assert.equal(s.status.hidden,true);

  s=fixture();nav=s.context.navigate('https://site.example/timeout/');
  [...s.timers.values()][0]();await nav;
  assert.equal(s.assignments[0],'https://site.example/timeout/');assert.equal(s.status.hidden,true);

  s=fixture();nav=s.context.navigate('https://site.example/error/');s.respond(0,'error',[],false);await nav;
  assert.equal(s.assignments[0],'https://site.example/error/');

  s=fixture();nav=s.context.navigate('https://site.example/back/',false);s.respond(0,'back');await nav;
  assert.equal(s.history.length,0);

  s=fixture();nav=s.context.navigate('https://site.example/fail-script/');s.respond(0,'fail-script',[s.script('katex')]);await flush();
  s.loads[0].onerror();await nav;assert.equal(s.assignments.length,0);
  nav=s.context.navigate('https://site.example/retry-script/');s.respond(1,'retry-script',[s.script('katex')]);await flush();
  assert.equal(s.loads.length,2);s.context.window.katex={};s.loads[1].onload();await nav;
  console.log('PASS navigation feedback, immediate scrolling, library reuse, superseded requests, timeout/error fallback, history and script retry');
})().catch(error=>{console.error(error);process.exitCode=1});
