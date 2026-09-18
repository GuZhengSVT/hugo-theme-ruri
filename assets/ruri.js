(()=>{'use strict';
const $=s=>document.querySelector(s);const tr=key=>{try{return JSON.parse(document.querySelector('#ruri-i18n').textContent)[key]||key}catch{return key}};let waline=null,pageVersion=0;
function syncDark(){const mode=document.documentElement.dataset.theme;document.documentElement.classList.toggle('waline-dark',mode==='dark'||(mode!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))}
syncDark();matchMedia('(prefers-color-scheme:dark)').addEventListener('change',syncDark);
let archiveObserver=null,tocObserver=null;
function initArchive(){
  archiveObserver?.disconnect();archiveObserver=null;
  const tree=$('.archive-tree');if(!tree)return;
  const years=[...tree.querySelectorAll(':scope > .archive-year')];
  if(years.length<2)return;
  const labels={
    'zh-cn':['加载更早年份','已显示全部年份'],
    'zh-tw':['載入更早年份','已顯示全部年份'],
    en:['Load earlier years','All years displayed'],
    ja:['以前の年を読み込む','すべての年を表示しました']
  };
  const [more,done]=labels[document.documentElement.lang.toLowerCase()]||labels.en;
  years.slice(1).forEach(year=>year.hidden=true);
  let shown=1;
  const footer=document.createElement('div');footer.className='archive-load';
  const button=document.createElement('button');button.type='button';
  const status=document.createElement('p');status.setAttribute('role','status');
  footer.append(button,status);tree.after(footer);
  const update=()=>{button.textContent=more+' · '+years[shown]?.dataset.year};update();
  const load=()=>{
    if(shown>=years.length||!tree.isConnected)return;
    years[shown++].hidden=false;
    if(shown===years.length){button.hidden=true;status.textContent=done;archiveObserver?.disconnect()}
    else update();
  };
  button.addEventListener('click',load);
  if('IntersectionObserver' in window){
    archiveObserver=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))load();
    },{rootMargin:'0px 0px 160px 0px'});
    archiveObserver.observe(footer);
  }
}
function localizePlayer(){
 document.querySelectorAll('[data-ruri-label]').forEach(el=>{const label=tr(el.dataset.ruriLabel);el.setAttribute('aria-label',label);if(el.hasAttribute('title'))el.title=label});
 updateOrder();syncVolume();syncPlayback();if(songs.length)$('#music-count').textContent=songs.length+tr('tracks');
}
function initPage(){tocObserver?.disconnect();localizePlayer();
initArchive();window.RuriFeatures.init();
$('#theme-toggle')?.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme==='dark'||(document.documentElement.dataset.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);const mode=dark?'light':'dark';document.documentElement.dataset.theme=mode;try{localStorage.setItem('ruri-theme',mode)}catch{}syncDark()});

initTabs();initComments();document.querySelectorAll('.toc ul ul').forEach(ul=>{const li=ul.parentElement;if(!li||li.querySelector(':scope > details'))return;const link=li.querySelector(':scope > a'),d=document.createElement('details'),summary=document.createElement('summary');d.open=false;if(link){summary.innerHTML=link.outerHTML;link.remove()}d.append(summary,ul);li.append(d)});loadMusic();const toc=document.querySelector('.toc');if(toc){const links=[...toc.querySelectorAll('a[href^=\"#\"]')],heads=[...document.querySelectorAll('.prose h2,.prose h3,.prose h4,.prose h5,.prose h6')];const reveal=id=>{toc.querySelectorAll('details').forEach(d=>d.open=false);const a=links.find(x=>x.getAttribute('href')==='#'+id);if(a){let d=a.closest('details');while(d){d.open=true;d=d.parentElement.closest('details')}}};const observer=new IntersectionObserver(es=>{const hit=es.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(hit)reveal(hit.target.id)},{rootMargin:'-18% 0px -68% 0px',threshold:0});tocObserver=observer;heads.forEach(h=>observer.observe(h))}document.querySelectorAll('.copy-link').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.url);b.textContent=tr('copied')}catch{b.textContent=b.dataset.url}}));
}
const audio=$('#music-audio'),tracks=$('#music-tracks'),player=$('#floating-player');
const titleText=$('#music-title'),seek=$('#music-seek'),lyricOverlay=$('#music-lyrics');
let songs=[],current=0,loading=false,lyrics=[],lyricController=null,lyricVersion=0;
let order='sequence',lyricsEnabled=true,hovering=false,listOpen=false,focusInside=false,volumeOpen=false;
try{order=localStorage.getItem('ruri-play-order')||order;lyricsEnabled=localStorage.getItem('ruri-lyrics')!=='off'}catch{}
if(!['sequence','single','shuffle'].includes(order))order='sequence';
const feedback=message=>{$('#music-feedback').textContent=message};
const saveMusicSetting=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
function showVolume(open){volumeOpen=open;$('#music-volume-panel').hidden=!open;$('#music-volume-toggle').setAttribute('aria-expanded',String(open));updatePlayer()}
$('#music-volume-toggle').addEventListener('click',()=>showVolume(!volumeOpen));
function syncVolume(){
  const level=Math.round(audio.volume*100),muted=audio.muted||level===0;
  $('#music-volume').value=level;
  $('#music-volume').style.setProperty('--volume',level+'%');
  $('#music-volume-value').textContent=muted?'0%':level+'%';
  $('#music-volume').setAttribute('aria-valuetext',level+'%');
  $('#music-mute').setAttribute('aria-pressed',String(audio.muted));
  $('#music-mute').setAttribute('aria-label',audio.muted?tr('unmute'):tr('mute'));
  $('#music-mute').title=audio.muted?tr('unmute'):tr('mute');
  player.classList.toggle('is-muted',muted);
  saveMusicSetting('ruri-volume',String(audio.volume));saveMusicSetting('ruri-muted',String(audio.muted));
}
try{const saved=localStorage.getItem('ruri-volume');if(saved!==null&&Number.isFinite(Number(saved)))audio.volume=Math.max(0,Math.min(1,Number(saved)));audio.muted=localStorage.getItem('ruri-muted')==='true'}catch{}
audio.addEventListener('volumechange',syncVolume);
$('#music-volume').addEventListener('input',()=>{audio.volume=Number($('#music-volume').value)/100;audio.muted=false;syncVolume()});
$('#music-mute').addEventListener('click',()=>{audio.muted=!audio.muted;syncVolume()});
syncVolume();
function musicTime(value){if(!Number.isFinite(value)||value<0)return '0:00';return Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0')}
function updateTitleScroll(){
  const delta=titleText.scrollWidth-titleText.parentElement.clientWidth;
  titleText.classList.toggle('is-scrolling',delta>4);
  titleText.style.setProperty('--title-shift',Math.min(0,-delta)+'px');
  titleText.style.setProperty('--title-duration',Math.max(9,delta/24+5)+'s');
}
if(window.ResizeObserver)new ResizeObserver(updateTitleScroll).observe(titleText.parentElement);
function updatePlayer(){player.classList.toggle('expanded',hovering||listOpen||volumeOpen||focusInside);requestAnimationFrame(updateTitleScroll)}
function showPlaylist(open){listOpen=open;$('#music-playlist').hidden=!open;$('#music-list-toggle').setAttribute('aria-expanded',String(open));updatePlayer()}
player.addEventListener('mouseenter',()=>{hovering=true;updatePlayer()});
player.addEventListener('mouseleave',()=>{hovering=false;updatePlayer()});
player.addEventListener('focusin',e=>{focusInside=e.target!==$('#player-toggle');updatePlayer()});
player.addEventListener('focusout',()=>{queueMicrotask(()=>{focusInside=player.contains(document.activeElement)&&document.activeElement!==$('#player-toggle');updatePlayer()})});
player.addEventListener('keydown',e=>{if(e.key==='Escape'){showVolume(false);showPlaylist(false);$('#player-toggle').focus()}});
$('#music-list-toggle').addEventListener('click',()=>showPlaylist(!listOpen));
$('#music-list-close').addEventListener('click',()=>{showPlaylist(false);$('#music-list-toggle').focus()});
document.addEventListener('pointerdown',e=>{if(!player.contains(e.target)){showVolume(false);showPlaylist(false);focusInside=false;hovering=false;updatePlayer()}});
// Touch users can reveal controls without a hover-capable pointer.
$('#player-toggle').addEventListener('click',()=>{if(matchMedia('(hover: none)').matches()){focusInside=true;updatePlayer()}toggleMusic()});
function updateOrder(){const label={sequence:tr('sequence'),single:tr('single'),shuffle:tr('shuffle')}[order];$('#music-order').dataset.order=order;$('#music-order').setAttribute('aria-label',label+tr('order_hint'));$('#music-order').title=label+tr('order_hint')}
updateOrder();
$('#music-order').addEventListener('click',()=>{const modes=['sequence','single','shuffle'];order=modes[(modes.indexOf(order)+1)%3];saveMusicSetting('ruri-play-order',order);updateOrder()});
function renderLyric(){
  let currentLine=null;
  if(lyricsEnabled&&!audio.paused&&!audio.ended&&!audio.error){
    for(const line of lyrics){if(line.time>audio.currentTime)break;currentLine=line}
  }
  const original=lyricOverlay.querySelector('.lyric-original'),translation=lyricOverlay.querySelector('.lyric-translation');
  original.textContent=currentLine?.text||'';
  translation.textContent=currentLine?.translation||'';
  translation.hidden=!translation.textContent;
  lyricOverlay.hidden=!original.textContent;
}
$('#music-lyrics-toggle').setAttribute('aria-pressed',String(lyricsEnabled));
$('#music-lyrics-toggle').addEventListener('click',()=>{lyricsEnabled=!lyricsEnabled;saveMusicSetting('ruri-lyrics',lyricsEnabled?'on':'off');$('#music-lyrics-toggle').setAttribute('aria-pressed',String(lyricsEnabled));renderLyric()});
function parseMusicLrc(text){
  const result=[],offset=Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0)/1000;
  for(const row of text.split(String.fromCharCode(10))){
    const tags=[...row.matchAll(/\[(\d+):(\d{1,2}(?:\.\d+)?)\]/g)];
    if(!tags.length)continue;
    const words=row.replace(/\[[^\]]*\]/g,'').trim();
    for(const tag of tags)result.push({time:Math.max(0,Number(tag[1])*60+Number(tag[2])+offset),text:words});
  }
  result.sort((a,b)=>a.time-b.time);
  return result;
}
function combineMusicLyrics(original,translated=[]){
  const grouped=[];
  for(const line of original){
    let group=grouped[grouped.length-1];
    if(!group||Math.abs(group.time-line.time)>.001){group={time:line.time,text:line.text,translation:''};grouped.push(group)}
    else if(line.text&&line.text!==group.text){group.translation=[group.translation,line.text].filter(Boolean).join(' / ')}
  }
  for(const group of grouped){
    const matches=translated.filter(line=>Math.abs(line.time-group.time)<.15&&line.text&&line.text!==group.text);
    if(matches.length)group.translation=[...new Set(matches.map(line=>line.text))].join(' / ');
  }
  return grouped;
}
async function loadLyrics(song){
  lyricController?.abort();lyricController=new AbortController();
  const controller=lyricController,version=++lyricVersion;lyrics=[];renderLyric();
  async function readSource(source){
    if(source&&typeof source==='object')return source;
    if(typeof source!=='string'||!source.trim())return '';
    if(parseMusicLrc(source).length)return source;
    const url=new URL(source,location.href);if(!['http:','https:'].includes(url.protocol))return '';
    const response=await fetch(url,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
    if(!response.ok)throw Error('lyrics');
    const text=await response.text();try{return JSON.parse(text)}catch{return text}
  }
  const lyricText=value=>typeof value==='string'?value:(value?.lyric||'');
  try{
    const payload=await readSource(song.lrc||song.lyric||'');
    const data=typeof payload==='object'?(payload.data||payload):null;
    const original=typeof payload==='string'?payload:lyricText(data?.lrc||data?.lyric);
    const translationSource=data?.tlyric||data?.translation||song.tlyric||song.translation||song.translatedLyric;
    let translated='';
    // Translation failures must not hide otherwise playable original lyrics.
    try{const result=await readSource(translationSource);translated=lyricText(result?.tlyric||result?.lrc||result)}catch{}
    if(version!==lyricVersion)return;
    lyrics=combineMusicLyrics(parseMusicLrc(original),parseMusicLrc(translated));renderLyric();
  }catch{if(version===lyricVersion){lyrics=[];renderLyric()}}
}
async function playMusic(){try{await audio.play();feedback('')}catch{feedback(tr('play_error'))}}
function toggleMusic(){if(!songs.length)return;if(audio.paused)playMusic();else audio.pause()}
$('#music-play').addEventListener('click',toggleMusic);
$('#cover-state').addEventListener('click',e=>{e.stopPropagation();toggleMusic()});
function syncPlayback(){
  const playing=!audio.paused&&!audio.ended;


  $('#cover-state').setAttribute('aria-label',playing?tr('pause_music'):tr('play_music'));$('#cover-state').setAttribute('aria-pressed',String(playing));$('#cover-state').title=playing?tr('pause_music'):tr('play_music');
  $('#music-play').setAttribute('aria-label',playing?tr('pause'):tr('play'));
  $('#music-play').title=playing?tr('pause'):tr('play');
  $('#player-toggle').setAttribute('aria-label',playing?tr('pause_music'):tr('play_music'));
  $('#player-toggle').setAttribute('aria-pressed',String(playing));
  player.classList.toggle('is-playing',playing);renderLyric();
}
function syncProgress(){
  const duration=audio.duration,valid=Number.isFinite(duration)&&duration>0;
  seek.disabled=!valid;seek.value=valid?Math.round(audio.currentTime/duration*1000):0;
  seek.style.setProperty('--progress',Number(seek.value)/10+'%');
  $('#music-elapsed').textContent=musicTime(audio.currentTime);$('#music-duration').textContent=musicTime(duration);
  seek.setAttribute('aria-valuetext',musicTime(audio.currentTime)+' / '+musicTime(duration));renderLyric();
}
seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=Number(seek.value)/1000*audio.duration;syncProgress()}});
for(const event of ['timeupdate','durationchange','loadedmetadata','emptied','seeked'])audio.addEventListener(event,syncProgress);
for(const event of ['play','pause','ended'])audio.addEventListener(event,syncPlayback);
function selectTrack(n,play=false){
  if(!songs.length)return;current=(n+songs.length)%songs.length;
  const song=songs[current];audio.src=song.url;
  const title=song.name+' · '+(Array.isArray(song.artist)?song.artist.join(' / '):(song.artist||''));
  titleText.textContent=title;titleText.parentElement.title=title;requestAnimationFrame(updateTitleScroll);
  tracks.querySelectorAll('button').forEach((button,i)=>{button.setAttribute('aria-current',String(i===current))});
  const cover=$('#music-cover');cover.src=song.pic||song.cover||player.dataset.fallback;cover.onerror=()=>{cover.onerror=null;cover.src=player.dataset.fallback};
  feedback('');syncProgress();syncPlayback();loadLyrics(song);if(play)playMusic();
}
function nextIndex(direction=1){if(order==='shuffle'&&songs.length>1)return(current+1+Math.floor(Math.random()*(songs.length-1)))%songs.length;return current+direction}
$('#music-prev').addEventListener('click',()=>selectTrack(nextIndex(-1),true));
$('#music-next').addEventListener('click',()=>selectTrack(nextIndex(),true));
audio.addEventListener('ended',()=>{if(order==='single'){audio.currentTime=0;playMusic()}else selectTrack(nextIndex(),true)});
audio.addEventListener('error',()=>{feedback(tr('audio_error'));renderLyric()});
async function loadMusic(){
  if(!player||player.dataset.enabled==='false')return;if(songs.length){player.hidden=false;return}if(loading)return;if(!player.dataset.api&&(!player.dataset.audio||player.dataset.audio==='null'))return;loading=true;
  try{
    songs=JSON.parse(player.dataset.audio||'[]');
    if(!Array.isArray(songs))songs=[];
    if(!songs.length&&!player.dataset.api)return;if(!songs.length){const url=player.dataset.api.replace(':server',encodeURIComponent(player.dataset.server)).replace(':type',encodeURIComponent(player.dataset.type)).replace(':id',encodeURIComponent(player.dataset.id)).replace(':r',String(Math.random()));const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();songs=await response.json()}
    songs=songs.filter(song=>song.url&&/^https?:\/\//.test(song.url));if(!songs.length)throw Error();
    tracks.replaceChildren();songs.forEach((song,i)=>{const li=document.createElement('li'),button=document.createElement('button'),name=document.createElement('strong'),artist=document.createElement('small');button.type='button';name.textContent=song.name;artist.textContent=Array.isArray(song.artist)?song.artist.join(' / '):(song.artist||'');button.append(name,artist);button.addEventListener('click',()=>selectTrack(i,true));li.append(button);tracks.append(li)});
    $('#music-count').textContent=songs.length+tr('tracks');player.hidden=false;selectTrack(0);
  }catch{songs=[]}finally{loading=false}
}
let walineModule;
async function initComments(){const button=$('#comments-load');if(!button)return;const version=pageVersion;button.disabled=true;button.textContent=tr('comments_loading');try{if(!$('#waline-css')){const css=document.createElement('link');css.id='waline-css';css.rel='stylesheet';css.href='https://cdn.jsdelivr.net/npm/@waline/client@3/dist/waline.css';document.head.append(css)}walineModule??=import('https://cdn.jsdelivr.net/npm/@waline/client@3/dist/waline.js').catch(e=>{walineModule=null;throw e});const {init}=await walineModule;if(version!==pageVersion||!button.isConnected)return;waline=init({...JSON.parse(button.dataset.options),el:'#waline',serverURL:button.dataset.server,lang:button.dataset.lang,path:location.pathname,comment:true,dark:'html.waline-dark'});button.hidden=true}catch{if(!button.isConnected)return;button.disabled=false;button.textContent=tr('comments_error');button.onclick=initComments}}
function initTabs(){const widget=$('.post-tabs');if(!widget)return;const candidates=JSON.parse(widget.querySelector('.post-candidates').textContent);function render(list,items){list.replaceChildren();items.forEach(x=>{const li=document.createElement('li'),a=document.createElement('a');a.href=x.url;a.textContent=x.title+(x.count===undefined?'':' · '+x.count);li.append(a);list.append(li)})}const shuffled=[...candidates];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}render(widget.querySelector('[data-panel="random"] ol'),shuffled.slice(0,5));let popularLoaded=false;
widget.querySelectorAll('[role=tab]').forEach(button=>{button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=[...widget.querySelectorAll('[role=tab]')],i=tabs.indexOf(button);tabs[(i+(e.key==='ArrowRight'?1:2))%3].focus();tabs[(i+(e.key==='ArrowRight'?1:2))%3].click()});button.addEventListener('click',async()=>{widget.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));widget.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==button.dataset.tab);if(button.dataset.tab!=='popular'||popularLoaded)return;const status=widget.querySelector('.popular-status');status.textContent=tr('views_loading');try{const counts=[];for(let i=0;i<candidates.length;i+=20){const batch=candidates.slice(i,i+20),url=new URL(widget.dataset.server.replace(/\/$/,'')+'/api/article');url.searchParams.set('path',batch.map(x=>x.url).join(','));url.searchParams.set('type','time');const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const payload=await r.json();if(!Array.isArray(payload.data))throw Error();counts.push(...payload.data.map((item,j)=>({...item,url:batch[j]?.url})))}const mapped=candidates.map(x=>({...x,count:Number(counts.find(c=>decodeURI(c.url||c.path||'')===decodeURI(x.url))?.time||0)})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);render(widget.querySelector('[data-panel="popular"] ol'),mapped.slice(0,5));status.textContent=mapped.length?tr('views_sort'):tr('views_empty');popularLoaded=true}catch{status.textContent=tr('views_error')}})})}
let navigationController;
async function navigate(url,push=true){navigationController?.abort();const controller=new AbortController();navigationController=controller;try{const response=await fetch(url,{signal:controller.signal,headers:{'X-Ruri-Navigation':'1'}});if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error();const doc=new DOMParser().parseFromString(await response.text(),'text/html'),next=doc.querySelector('#page-shell');if(!next)throw Error();if(controller.signal.aborted)return;window.RuriFeatures.destroy();waline?.destroy();waline=null;pageVersion++;document.querySelectorAll('#ruri-page-extras').forEach(x=>x.remove());$('#page-shell').replaceWith(next);document.title=doc.title;document.documentElement.lang=doc.documentElement.lang;document.querySelectorAll('head link[rel=canonical],head link[rel=alternate],head meta[name=description],head meta[property^="og:"]').forEach(x=>x.remove());doc.querySelectorAll('head link[rel=canonical],head link[rel=alternate],head meta[name=description],head meta[property^="og:"]').forEach(x=>document.head.append(x.cloneNode(true)));if(push)history.pushState({},'',response.url+new URL(url).hash);initPage();for(const old of next.querySelectorAll('script[data-page-script]')){const script=document.createElement('script');for(const attr of old.attributes)script.setAttribute(attr.name,attr.value);script.textContent=old.textContent;if(script.src){await new Promise(resolve=>{script.onload=()=>{if(!controller.signal.aborted&&script.src.includes('auto-render')&&window.renderMathInElement)window.renderMathInElement($('.prose'),{delimiters:[{left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false}],throwOnError:false});resolve()};script.onerror=resolve;old.replaceWith(script)})}else old.replaceWith(script);if(controller.signal.aborted)return}const hash=new URL(url).hash;const target=hash?document.getElementById(decodeURIComponent(hash.slice(1))):null;if(target)target.scrollIntoView();else window.scrollTo(0,0)}catch(e){if(e.name!=='AbortError')location.assign(url)}}
document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download'))return;const u=new URL(a.href,location.href);if(u.origin!==location.origin||!/^https?:$/.test(u.protocol)||/\.[a-z0-9]+$/i.test(u.pathname))return;if(u.pathname===location.pathname&&u.search===location.search&&u.hash)return;e.preventDefault();navigate(u.href)});
window.addEventListener('popstate',()=>navigate(location.href,false));document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();$('#search-open')?.click()}});
initPage();
})();
