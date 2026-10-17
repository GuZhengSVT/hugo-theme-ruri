/* Public Bangumi collections, loaded only on the collection page. */
const cache=new Map();
const pageSize=24;

export function init(root,{signal}){
  const labels=JSON.parse(root.dataset.labels),user=root.dataset.bangumiUser;
  const grid=root.querySelector('.bangumi-grid'),status=root.querySelector('.bangumi-status');
  const pagination=root.querySelector('.bangumi-pagination'),pageLabel=root.querySelector('[data-bangumi-page]');
  const previous=root.querySelector('[data-bangumi-prev]'),next=root.querySelector('[data-bangumi-next]');
  const refresh=root.querySelector('[data-bangumi-refresh]'),filters=[...root.querySelectorAll('[data-bangumi-type]')];
  let type=3,page=0,request;
  signal.addEventListener('abort',()=>request?.abort(),{once:true});

  function text(tag,className,value){const node=document.createElement(tag);node.className=className;node.textContent=value;return node}
  function card(item){
    const subject=item.subject||{},title=subject.name_cn||subject.name||String(item.subject_id);
    const article=document.createElement('article');article.className='bangumi-card';
    const link=document.createElement('a');link.className='bangumi-cover';link.href='https://bgm.tv/subject/'+Number(item.subject_id);link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',title);
    const cover=subject.images?.common||subject.images?.medium;
    if(cover){const img=document.createElement('img');img.src=cover;img.alt='';img.loading='lazy';img.width=200;img.height=280;img.referrerPolicy='no-referrer';link.append(img)}
    else link.append(text('span','bangumi-cover-placeholder',title));
    const body=text('div','bangumi-card-body',''),heading=text('h3','bangumi-title','');
    const titleLink=link.cloneNode(false);titleLink.className='';titleLink.removeAttribute('aria-label');titleLink.textContent=title;heading.append(titleLink);body.append(heading);
    if(subject.name&&subject.name!==title)body.append(text('p','bangumi-original',subject.name));
    const meta=[];
    if(subject.date)meta.push(subject.date);
    if(subject.score>0)meta.push(labels.score+' '+subject.score.toFixed(1));
    body.append(text('p','bangumi-meta',meta.join(' · ')));
    const watched=Math.max(0,Number(item.ep_status)||0),total=Number(subject.eps)||0;
    if(type===3){
      body.append(text('p','bangumi-progress-label',labels.progress+' '+watched+' / '+(total>0?total:labels.unknown)));
      if(total>0){const progress=document.createElement('progress');progress.max=total;progress.value=Math.min(watched,total);progress.setAttribute('aria-label',labels.progress);body.append(progress)}
    }else if(total>0)body.append(text('p','bangumi-meta',total+' '+labels.episodes));
    if(item.rate>0)body.append(text('p','bangumi-rating',labels.rating+' '+item.rate+' / 10'));
    if(item.comment)body.append(text('p','bangumi-comment',item.comment));
    article.append(link,body);return article;
  }

  async function load(force=false){
    request?.abort();const current=new AbortController();request=current;
    const key=user+':'+type+':'+page;
    const offset=page*pageSize;
    status.textContent=labels.loading;grid.setAttribute('aria-busy','true');grid.replaceChildren();pagination.hidden=true;refresh.disabled=true;
    filters.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.bangumiType)===type)));
    const timeout=setTimeout(()=>current.abort(),15000);
    try{
      const saved=cache.get(key);let result;
      if(!force&&saved&&Date.now()-saved.time<600000)result=saved.result;
      else{
        const url=new URL('https://api.bgm.tv/v0/users/'+encodeURIComponent(user)+'/collections');
        url.search=new URLSearchParams({subject_type:2,type,limit:pageSize,offset});
        const response=await fetch(url,{signal:current.signal,credentials:'omit'});
        if(!response.ok)throw Error('Bangumi '+response.status);
        result=await response.json();
        if(!Array.isArray(result.data)||!Number.isFinite(result.total))throw Error('Invalid collection response');
        cache.set(key,{time:Date.now(),result});
      }
      if(signal.aborted||request!==current)return;
      grid.replaceChildren(...result.data.filter(item=>!item.private).map(card));
      status.textContent=result.total?labels.total.replace('{total}',result.total):labels.empty;
      const pages=Math.max(1,Math.ceil(result.total/pageSize));
      pagination.hidden=pages<=1;pageLabel.textContent=(page+1)+' / '+pages;previous.disabled=page===0;next.disabled=page+1>=pages;
    }catch{
      if(!signal.aborted&&request===current)status.textContent=labels.error;
    }finally{
      clearTimeout(timeout);
      if(!signal.aborted&&request===current){grid.setAttribute('aria-busy','false');refresh.disabled=false}
    }
  }
  filters.forEach(button=>button.addEventListener('click',()=>{type=Number(button.dataset.bangumiType);page=0;load()},{signal}));
  previous.addEventListener('click',()=>{page--;load()},{signal});
  next.addEventListener('click',()=>{page++;load()},{signal});
  refresh.addEventListener('click',()=>load(true),{signal});
  load();
}
