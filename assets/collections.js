/* Request only the active collection category, shelf and page; render only its covers. */
export function init(root,{signal}){
  const labels=JSON.parse(root.dataset.labels),panel=root.querySelector('[data-collection-category]');
  if(!panel?.querySelector('.bangumi-grid')||!root.dataset.collectionSrc)return;
  const category=panel.dataset.collectionCategory,grid=panel.querySelector('.bangumi-grid');
  const status=panel.querySelector('.bangumi-status'),pagination=panel.querySelector('.bangumi-pagination');
  let shelf='all',page=1,request;
  signal.addEventListener('abort',()=>request?.abort(),{once:true});
  function text(tag,className,value){const node=document.createElement(tag);node.className=className;node.textContent=value;return node}
  function card(item){
    const article=text('article','bangumi-card',''),link=document.createElement('a');
    link.className='bangumi-cover';link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',item.title);
    if(item.cover){const img=document.createElement('img');img.src=item.cover;img.alt='';img.loading='lazy';img.width=200;img.height=280;img.referrerPolicy='no-referrer';link.append(img)}
    else link.append(text('span','bangumi-cover-placeholder',item.title));
    const body=text('div','bangumi-card-body',''),heading=text('h3','bangumi-title',''),title=link.cloneNode(false);
    title.className='';title.textContent=item.title;title.removeAttribute('aria-label');heading.append(title);body.append(heading);
    if(item.subtitle&&item.subtitle!==item.title)body.append(text('p','bangumi-original',item.subtitle));
    const itemStatus=panel.querySelector('[data-shelf="'+item.status+'"]')?.textContent;
    if(itemStatus)body.append(text('p','culture-item-status',itemStatus));
    if(item.community_rating!=null)body.append(text('p','bangumi-meta',(panel.dataset.source||'')+' '+Number(item.community_rating).toFixed(1)));
    if(item.rating!=null)body.append(text('p','bangumi-rating',labels.rating+' '+item.rating+' / 10'));
    if(item.progress){const watched=Number(item.progress.watched)||0,total=Number(item.progress.total)||0;body.append(text('p','bangumi-progress-label',labels.progress+' '+watched+' / '+(total||labels.unknown)));if(total>0){const progress=document.createElement('progress');progress.max=total;progress.value=Math.min(watched,total);progress.setAttribute('aria-label',labels.progress);body.append(progress)}}
    if(item.comment)body.append(text('p','bangumi-comment',item.comment));
    article.append(link,body);return article;
  }
  async function load(){
    request?.abort();const current=new AbortController();request=current;
    status.textContent=labels.loading;grid.replaceChildren();grid.setAttribute('aria-busy','true');pagination.hidden=true;
    panel.querySelectorAll('[data-shelf]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.shelf===shelf)));
    const timeout=setTimeout(()=>current.abort(),15000);
    try{
      const base=new URL(root.dataset.collectionSrc,location.origin);
      const response=await fetch(new URL(category+'/'+shelf+'/'+page+'.json',base),{signal:current.signal});
      if(!response.ok)throw Error('Collection page '+response.status);
      const data=await response.json();
      if(!Array.isArray(data.items)||!Number.isFinite(data.total)||!Number.isInteger(data.pages))throw Error('Invalid collection page');
      if(signal.aborted||request!==current)return;
      if(data.unavailable){status.textContent=labels.unavailable;return}
      panel.dataset.source=data.source||'';
      grid.replaceChildren(...data.items.map(card));
      status.textContent=data.total?labels.total.replace('{total}',data.total):labels.empty;
      const date=new Date(data.updated_at);
      panel.querySelector('.culture-updated').textContent=Number.isNaN(date.getTime())?'':labels.updated+' '+date.toLocaleDateString(document.documentElement.lang);
      pagination.hidden=data.pages<=1;
      panel.querySelector('[data-collection-page]').textContent=page+' / '+data.pages;
      panel.querySelector('[data-collection-prev]').disabled=page===1;
      panel.querySelector('[data-collection-next]').disabled=page>=data.pages;
    }catch{if(!signal.aborted&&request===current)status.textContent=labels.error}
    finally{clearTimeout(timeout);if(!signal.aborted&&request===current)grid.setAttribute('aria-busy','false')}
  }
  panel.querySelectorAll('[data-shelf]').forEach(button=>button.addEventListener('click',()=>{shelf=button.dataset.shelf;page=1;load()},{signal}));
  panel.querySelector('[data-collection-prev]').addEventListener('click',()=>{page--;load()},{signal});
  panel.querySelector('[data-collection-next]').addEventListener('click',()=>{page++;load()},{signal});
  load();
}
