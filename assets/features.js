/* Reading tools. Each init is scoped to the current page; destroy runs before navigation. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const messages={
 'zh-cn':['复制','已复制','复制失败，请手动选择','收起','展开','分享二维码','关闭','加载更多','搜索中…','条结果','加载失败，请重试','扫一扫在微信中打开','图片'],
 'zh-tw':['複製','已複製','複製失敗，請手動選取','收起','展開','分享二維碼','關閉','載入更多','搜尋中…','筆結果','載入失敗，請重試','掃描以在微信中開啟','圖片'],
 en:['Copy','Copied','Copy failed; select manually','Collapse','Expand','Share QR code','Close','Load more','Searching…','results','Failed to load; retry','Scan to open in WeChat','Image'],
 ja:['コピー','コピーしました','コピー失敗：手動で選択してください','折りたたむ','展開','共有QRコード','閉じる','もっと見る','検索中…','件','読み込み失敗：再試行してください','WeChatでスキャンしてください','画像']
};
const label=i=>(messages[document.documentElement.lang.toLowerCase()]||messages.en)[i];
let controller,lightbox,qrPromise,searchModules=new Map(),epoch=0;
const vendor=()=>document.body.dataset.vendor;
function bindDialog(dialog){
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
 dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());
}
function modal(title){
 const d=document.createElement('dialog');d.className='media-dialog';d.dataset.featureDialog='';
 const head=document.createElement('header'),h=document.createElement('strong'),close=document.createElement('button');
 h.id='media-dialog-title';h.textContent=title;d.setAttribute('aria-labelledby',h.id);close.type='button';close.textContent='×';close.setAttribute('aria-label',label(6));close.dataset.close='';head.append(h,close);d.append(head);$('#page-shell').append(d);bindDialog(d);d.addEventListener('close',()=>d.remove());return d;
}
function qrLibrary(){
 if(window.QRCode)return Promise.resolve(window.QRCode);
 return qrPromise??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=vendor()+'qrcode.js';s.onload=()=>resolve(window.QRCode);s.onerror=()=>{s.remove();qrPromise=null;reject(Error('QR library'))};document.head.append(s)});
}
function initQR(){
 document.querySelectorAll('[data-personal-qr]').forEach(a=>a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey)return;e.preventDefault();const d=modal(a.dataset.personalQr==='qq'?'QQ':'WeChat'),img=document.createElement('img');img.src=a.href;img.alt=a.dataset.personalQr;d.append(img);d.showModal()}));
 document.querySelectorAll('.share-weixin').forEach(button=>button.addEventListener('click',async()=>{
  const d=modal(label(5)),title=document.createElement('p'),canvas=document.createElement('canvas'),status=document.createElement('p'),link=document.createElement('a');
  title.textContent=button.dataset.title;link.href=button.dataset.url;link.textContent=button.dataset.url;status.textContent=label(11);d.append(title,canvas,status,link);d.showModal();
  try{const qr=await qrLibrary();if(!d.isConnected)return;await qr.toCanvas(canvas,button.dataset.url,{width:280,margin:4,errorCorrectionLevel:'M'});canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label(5))}catch{status.textContent=label(10)}
 }));
}
function initCode(){
 document.querySelectorAll('.prose pre').forEach((pre,i)=>{
  const code=pre.querySelector('code');if(!code||pre.closest('.mermaid')||code.classList.contains('language-mermaid'))return;
  // Chroma line-number tables have a second, non-source pre element.
  if(pre.closest('.lntd')&&!code.dataset.lang&&!code.querySelector('.cl'))return;
  const root=pre.closest('.highlight')||pre;if(root.dataset.codeTools)return;root.dataset.codeTools='';
  const box=document.createElement('section');box.className='code-box';root.before(box);
  const toolbar=document.createElement('div');toolbar.className='code-toolbar';
  const language=document.createElement('span'),copy=document.createElement('button'),fold=document.createElement('button'),body=document.createElement('div');
  language.textContent=code.dataset.lang||[...code.classList].find(x=>x.startsWith('language-'))?.slice(9)||'text';
  body.className='code-body';body.id='code-body-'+i;copy.type=fold.type='button';copy.textContent=label(0);fold.textContent=label(3);fold.setAttribute('aria-controls',body.id);fold.setAttribute('aria-expanded','true');
  copy.addEventListener('click',async()=>{const clean=code.cloneNode(true);clean.querySelectorAll('.ln,.lnt,.lnlinks').forEach(x=>x.remove());try{await navigator.clipboard.writeText(clean.textContent);copy.textContent=label(1)}catch{copy.textContent=label(2)}});
  fold.addEventListener('click',()=>{body.hidden=!body.hidden;fold.textContent=label(body.hidden?4:3);fold.setAttribute('aria-expanded',String(!body.hidden))});
  toolbar.append(language,copy,fold);body.append(root);box.append(toolbar,body);
 });
}
async function initLightbox(version){
 const images=[...document.querySelectorAll('.prose img:not(.no-lightbox),.article-cover')].filter(img=>!img.closest('a,button,.no-lightbox'));
 if(!images.length)return;
 if(!$('#photoswipe-css')){const css=document.createElement('link');css.id='photoswipe-css';css.rel='stylesheet';css.href=vendor()+'photoswipe.css';document.head.append(css)}
 try{
  const {default:Lightbox}=await import(vendor()+'photoswipe-lightbox.esm.min.js');if(version!==epoch)return;
  lightbox=new Lightbox({pswpModule:()=>import(vendor()+'photoswipe.esm.min.js')});lightbox.init();
  images.forEach(img=>{
   const a=document.createElement('a');a.className='lightbox-link';a.href=img.currentSrc||img.src;a.setAttribute('aria-label',img.alt||label(12));img.before(a);a.append(img);
   a.addEventListener('click',async e=>{if(e.ctrlKey||e.metaKey||e.shiftKey)return;e.preventDefault();try{await img.decode()}catch{}if(version!==epoch)return;
    const data=images.map(x=>({src:x.currentSrc||x.src,width:x.naturalWidth||1600,height:x.naturalHeight||900,alt:x.alt}));lightbox.loadAndOpen(images.indexOf(img),data);
   });
  });
 }catch{/* Images remain readable without the optional viewer. */}
}
function initSearch(){
 const dialog=$('#search-dialog'),input=$('#search-input'),results=$('#search-results'),status=$('#search-status');if(!dialog)return;
 const signal=controller.signal;bindDialog(dialog);$('#search-open')?.addEventListener('click',()=>{dialog.showModal();input.focus()});
 let sequence=0,timer;
 input.addEventListener('input',()=>{clearTimeout(timer);const token=++sequence;timer=setTimeout(async()=>{
  const q=input.value.trim();results.replaceChildren();status.textContent=q?label(8):'';if(!q)return;
  try{
   const lang=document.documentElement.lang.toLowerCase(),key=dialog.dataset.index+'?lang='+encodeURIComponent(lang);
   if(!searchModules.has(key))searchModules.set(key,import(key).then(async m=>{await m.options({language:lang});return m}).catch(e=>{searchModules.delete(key);throw e}));
   const pagefind=await searchModules.get(key),found=await pagefind.search(q);if(signal.aborted||token!==sequence)return;
   status.textContent=found.results.length+' '+label(9);let shown=0;
   const more=document.createElement('button');more.type='button';more.textContent=label(7);
   async function next(){more.disabled=true;try{
    const batch=await Promise.all(found.results.slice(shown,shown+10).map(r=>r.data()));if(signal.aborted||token!==sequence)return;
    for(const item of batch){const a=document.createElement('a'),title=document.createElement('strong'),excerpt=document.createElement('small');a.href=item.url;title.textContent=item.meta.title||item.url;
     // Allow only Pagefind's mark highlighting, never arbitrary indexed HTML.
     const doc=new DOMParser().parseFromString(item.excerpt||'','text/html');function append(node,parent){for(const child of node.childNodes){if(child.nodeType===3)parent.append(document.createTextNode(child.textContent));else if(child.nodeType===1){if(child.tagName==='MARK'){const mark=document.createElement('mark');append(child,mark);parent.append(mark)}else append(child,parent)}}}append(doc.body,excerpt);
     a.append(title,excerpt);results.append(a);
    }shown+=batch.length;more.remove();if(shown<found.results.length)results.append(more);
   }catch{status.textContent=label(10)}finally{more.disabled=false}}
   more.addEventListener('click',next);await next();
  }catch{if(!signal.aborted&&token===sequence)status.textContent=label(10)}
 },180)});
 signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});
}
window.RuriFeatures={init(){controller=new AbortController();const version=++epoch;initSearch();initCode();initQR();initLightbox(version)},destroy(){epoch++;controller?.abort();lightbox?.destroy();lightbox=null;document.querySelectorAll('[data-feature-dialog]').forEach(d=>{d.close();d.remove()})}};
})();
