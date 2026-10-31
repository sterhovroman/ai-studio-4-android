const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let audioCtx=null, currentBuffer=null, source=null, mediaFiles=[], deferredPrompt=null;
function go(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===page));window.scrollTo(0,0)}
$$('.nav').forEach(n=>n.addEventListener('click',()=>go(n.dataset.page)));
$$('[data-go]').forEach(n=>n.addEventListener('click',()=>go(n.dataset.go)));
function setStatus(id,msg){$(id).textContent=msg}
function wave(){const w=$('#wave');w.innerHTML='';for(let i=0;i<90;i++){let s=document.createElement('span');s.style.height=(8+Math.random()*44)+'px';w.append(s)}}
function seededNoise(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
function makeTrack(){
 const duration=+$('#duration').value,bpm=+$('#tempo').value,genre=$('#genre').value,mood=$('#mood').value;
 const sr=22050, len=sr*duration, data=new Float32Array(len), rand=seededNoise((Date.now()+bpm*7)>>>0);
 const roots={ambient:110,electronic:130,cinematic:82,rock:98,lofi:146,dance:123}, root=roots[genre];
 const scale=mood==='dark'?[0,3,5,7,10]:mood==='happy'?[0,2,4,7,9]:[0,2,3,7,10];
 const beat=60/bpm, chord=[root,root*Math.pow(2,scale[2]/12),root*Math.pow(2,7/12)];
 for(let i=0;i<len;i++){let t=i/sr, beatPos=t%beat, bar=Math.floor(t/(beat*4)), note=scale[(Math.floor(t/(beat/2))+bar)%scale.length], f=root*Math.pow(2,note/12);
 let pad=0;for(let j=0;j<chord.length;j++)pad+=Math.sin(2*Math.PI*chord[j]*t)*.10;
 let lead=Math.sin(2*Math.PI*f*t)*(.04+.025*Math.sin(2*Math.PI*.25*t));
 let kick=Math.exp(-beatPos*17)*Math.sin(2*Math.PI*(48+beatPos*20)*t)*.24;
 let snare=(Math.floor(t/beat)%2===1&&beatPos<.12)?(rand()-.5)*Math.exp(-beatPos*24)*.18:0;
 let hat=(beatPos<.035)?(rand()-.5)*.035:0;
 let envelope=Math.min(1,t*4,(duration-t)*3);
 data[i]=Math.tanh((pad+lead+kick+snare+hat)*envelope)*.85;
 }
 currentBuffer={data,sr,duration};
 $('#nowPlaying').textContent=$('#trackName').value||'Без названия';
 $('#trackMeta').textContent=`${genre.toUpperCase()} • ${bpm} BPM • ${duration} сек • ${mood}`;
 $('#playMusic').disabled=false;$('#downloadWav').disabled=false;wave();
 setStatus('#musicStatus','Готово! Музыкальный набросок создан прямо на устройстве.');
}
function bufferToWav(samples,sr){const buffer=new ArrayBuffer(44+samples.length*2),v=new DataView(buffer);function str(o,s){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}str(0,'RIFF');v.setUint32(4,36+samples.length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);let o=44;for(let x of samples){v.setInt16(o,Math.max(-1,Math.min(1,x))*32767,true);o+=2}return new Blob([buffer],{type:'audio/wav'})}
$('#makeMusic').onclick=makeTrack;
$('#stopMusic').onclick=()=>{if(source){try{source.stop()}catch(e){}source=null}setStatus('#musicStatus','Воспроизведение остановлено.')};
$('#playMusic').onclick=async()=>{if(!currentBuffer)return;audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();await audioCtx.resume();if(source){try{source.stop()}catch(e){}}let b=audioCtx.createBuffer(1,currentBuffer.data.length,currentBuffer.sr);b.copyToChannel(currentBuffer.data,0);source=audioCtx.createBufferSource();source.buffer=b;source.connect(audioCtx.destination);source.start();setStatus('#musicStatus','Воспроизведение…')};
$('#downloadWav').onclick=()=>{if(!currentBuffer)return;let a=document.createElement('a');a.href=URL.createObjectURL(bufferToWav(currentBuffer.data,currentBuffer.sr));a.download=(($('#trackName').value||'ai-studio-track').replace(/[^\p{L}\p{N}_-]+/gu,'_'))+'.wav';a.click();URL.revokeObjectURL(a.href)};
function drawPreview(file){const c=$('#previewCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#12182a';ctx.fillRect(0,0,c.width,c.height);if(!file)return;let url=URL.createObjectURL(file);if(file.type.startsWith('image/')){let im=new Image();im.onload=()=>{ctx.fillStyle='#12182a';ctx.fillRect(0,0,c.width,c.height);let s=Math.min(c.width/im.width,c.height/im.height);ctx.drawImage(im,(c.width-im.width*s)/2,(c.height-im.height*s)/2,im.width*s,im.height*s);URL.revokeObjectURL(url)};im.src=url}else{let v=document.createElement('video');v.muted=true;v.onloadeddata=()=>{let s=Math.min(c.width/v.videoWidth,c.height/v.videoHeight);ctx.drawImage(v,(c.width-v.videoWidth*s)/2,(c.height-v.videoHeight*s)/2,v.videoWidth*s,v.videoHeight*s);URL.revokeObjectURL(url)};v.src=url}}
function addFiles(files){for(const f of files){if(f.type.startsWith('image/')||f.type.startsWith('video/'))mediaFiles.push(f)}renderMedia();drawPreview(mediaFiles[0]);setStatus('#videoStatus',`Добавлено файлов: ${mediaFiles.length}`)}
function renderMedia(){const box=$('#mediaList');box.innerHTML='';if(!mediaFiles.length){box.innerHTML='<span class="muted">Пока нет материалов</span>';return}mediaFiles.forEach((f,i)=>{let b=document.createElement('button');b.className='media-chip';b.textContent=(i+1)+'. '+f.name;b.onclick=()=>drawPreview(f);box.append(b)})}
$('#chooseMedia').onclick=()=>$('#mediaInput').click();$('#dropZone').onclick=e=>{if(e.target.tagName!=='BUTTON')$('#mediaInput').click()};$('#mediaInput').onchange=e=>addFiles(e.target.files);
$('#dropZone').addEventListener('dragover',e=>{e.preventDefault()});$('#dropZone').addEventListener('drop',e=>{e.preventDefault();addFiles(e.dataTransfer.files)});
$('#clearMedia').onclick=()=>{mediaFiles=[];renderMedia();drawPreview(null);setStatus('#videoStatus','Материалы очищены.')};
async function exportVideo(){
 if(!mediaFiles.length){setStatus('#videoStatus','Сначала добавь фото или видео.');return}
 if(!window.MediaRecorder||!$('#previewCanvas').captureStream){setStatus('#videoStatus','Этот браузер не поддерживает экспорт видео через MediaRecorder.');return}
 const c=$('#previewCanvas'),ctx=c.getContext('2d'),ratio=$('#videoRatio').value;
 c.width=ratio==='16:9'?1280:ratio==='1:1'?900:720;c.height=ratio==='16:9'?720:ratio==='1:1'?900:1280;
 const stream=c.captureStream(25);let chunks=[],rec;
 try{rec=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'})}catch(e){setStatus('#videoStatus','Не удалось запустить видеокодек на этом устройстве.');return}
 rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>{let blob=new Blob(chunks,{type:'video/webm'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ai-studio-video.webm';a.click();setStatus('#videoStatus','Видео готово и сохранено в формате WebM.');setTimeout(()=>URL.revokeObjectURL(url),30000)};
 const duration=+$('#photoDuration').value*mediaFiles.length;let index=0,start=performance.now(),last=-1;
 function paint(now){let elapsed=(now-start)/1000,idx=Math.min(mediaFiles.length-1,Math.floor(elapsed/(duration/mediaFiles.length)));if(idx!==last){last=idx;loadFrame(mediaFiles[idx],ctx,c)}if(elapsed<duration)requestAnimationFrame(paint);else rec.stop()}
 function loadFrame(file,ctx,c){ctx.fillStyle='#0b1020';ctx.fillRect(0,0,c.width,c.height);let url=URL.createObjectURL(file);if(file.type.startsWith('image/')){let im=new Image();im.onload=()=>{let s=Math.min(c.width/im.width,c.height/im.height);ctx.drawImage(im,(c.width-im.width*s)/2,(c.height-im.height*s)/2,im.width*s,im.height*s);URL.revokeObjectURL(url)};im.src=url}else{let v=document.createElement('video');v.muted=true;v.loop=true;v.onloadeddata=()=>{v.play();let s=Math.min(c.width/v.videoWidth,c.height/v.videoHeight);function draw(){if(!v.paused&&!v.ended){ctx.fillStyle='#0b1020';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(v,(c.width-v.videoWidth*s)/2,(c.height-v.videoHeight*s)/2,v.videoWidth*s,v.videoHeight*s);requestAnimationFrame(draw)}}draw()};v.src=url}}
 rec.start();setStatus('#videoStatus','Идёт сборка ролика… Не закрывай страницу.');requestAnimationFrame(paint);
}
$('#exportVideo').onclick=exportVideo;
function loadVoices(){let vs=speechSynthesis.getVoices();let sel=$('#voiceSelect');sel.innerHTML='<option value="">Автоматический</option>';vs.forEach((v,i)=>{let o=document.createElement('option');o.value=i;o.textContent=v.name+' ('+v.lang+')';sel.append(o)})}
if('speechSynthesis'in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
$('#speakBtn').onclick=()=>{let text=$('#speechText').value.trim();if(!text){setStatus('#voiceStatus','Введи текст для озвучивания.');return}if(!('speechSynthesis'in window)){setStatus('#voiceStatus','Озвучка не поддерживается этим браузером.');return}speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text),v=speechSynthesis.getVoices()[$('#voiceSelect').value];if(v)u.voice=v;u.rate=+$('#speechRate').value;u.onstart=()=>setStatus('#voiceStatus','Идёт озвучивание…');u.onend=()=>setStatus('#voiceStatus','Озвучивание завершено.');speechSynthesis.speak(u)};
$('#stopSpeak').onclick=()=>{speechSynthesis.cancel();setStatus('#voiceStatus','Озвучивание остановлено.')};
function getProjects(){try{return JSON.parse(localStorage.getItem('ais_projects')||'[]')}catch(e){return[]}}
function renderProjects(){let list=getProjects(),el=$('#projectList');el.innerHTML='';if(!list.length){el.innerHTML='<span class="muted">Пока нет сохранённых проектов.</span>';return}list.forEach(p=>{let d=document.createElement('div');d.className='project';d.textContent=p.name;let s=document.createElement('small');s.textContent=p.date+' • '+p.kind;d.append(s);el.append(d)})}
$('#saveProject').onclick=()=>{let p=getProjects();p.unshift({name:$('#trackName').value||$('#videoPrompt').value.slice(0,50)||'Новый проект',kind:'AI Studio project',date:new Date().toLocaleString('ru-RU')});localStorage.setItem('ais_projects',JSON.stringify(p.slice(0,50)));renderProjects()};
renderProjects();
$('#saveSettings').onclick=()=>{localStorage.setItem('ais_api',$('#apiUrl').value.trim().replace(/\/+$/,''));setStatus('#apiStatus','Адрес сохранён.')};
$('#apiUrl').value=localStorage.getItem('ais_api')||'';
$('#testApi').onclick=async()=>{let u=$('#apiUrl').value.trim().replace(/\/+$/,'');if(!u){setStatus('#apiStatus','Сначала укажи адрес сервера.');return}try{let r=await fetch(u+'/health');let j=await r.json();setStatus('#apiStatus',r.ok?'Сервер доступен: '+JSON.stringify(j):'Сервер ответил с ошибкой.')}catch(e){setStatus('#apiStatus','Нет соединения. Проверь адрес, сеть и CORS на сервере.')}};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});
$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}else alert('В Chrome: меню ⋮ → Установить приложение или Добавить на главный экран.')};


// PHOTO EDITOR — local canvas pipeline, no uploads to third-party services.
let photoImage=null, photoObjectUrl=null, photoRotation=0, photoFlip=false, photoFilter='none', photoStrokes=[];
const photoCanvas=$('#photoCanvas'), photoCtx=photoCanvas.getContext('2d');
const photoDefaults={brightness:100,contrast:100,saturate:100,hue:0,blur:0};
function photoValues(){return Object.fromEntries(Object.keys(photoDefaults).map(k=>[k,+$('#'+k).value]))}
function fitCrop(sw,sh,ratio){
 if(ratio==='original')return {sx:0,sy:0,sw,sh};
 let [rw,rh]=ratio.split(':').map(Number), target=rw/rh, current=sw/sh;
 if(current>target){let nw=sh*target;return {sx:(sw-nw)/2,sy:0,sw:nw,sh}}
 let nh=sw/target;return {sx:0,sy:(sh-nh)/2,sw,sh:nh}
}
function filterCss(v){
 let brightness=v.brightness,contrast=v.contrast,saturate=v.saturate,hue=v.hue,blur=v.blur;
 if(photoFilter==='mono')saturate=0;
 if(photoFilter==='warm'){brightness*=1.04;saturate*=1.16;hue+=-8}
 if(photoFilter==='vintage'){brightness*=1.08;contrast*=.82;saturate*=.72;hue+=12}
 if(photoFilter==='cool'){hue+=22;saturate*=1.08}
 if(photoFilter==='dramatic'){contrast*=1.38;saturate*=1.22}
 return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg) blur(${blur}px)`;
}
function drawPhoto(){
 const c=photoCanvas,ctx=photoCtx;
 ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#12182a';ctx.fillRect(0,0,c.width,c.height);
 if(!photoImage){ctx.fillStyle='#9aa6c1';ctx.font='28px sans-serif';ctx.textAlign='center';ctx.fillText('Открой фотографию',c.width/2,c.height/2);return}
 let crop=fitCrop(photoImage.naturalWidth,photoImage.naturalHeight,$('#photoCrop').value);
 let ratio=crop.sw/crop.sh, maxW=1200,maxH=1200;
 if($('#photoCrop').value!=='original'){let [w,h]=$('#photoCrop').value.split(':').map(Number);ratio=w/h}
 if(ratio>1){c.width=1200;c.height=Math.round(1200/ratio)}else{c.height=1200;c.width=Math.round(1200*ratio)}
 ctx.save();ctx.translate(c.width/2,c.height/2);ctx.rotate(photoRotation*Math.PI/180);
 let drawW=(photoRotation%180===0?c.width:c.height),drawH=(photoRotation%180===0?c.height:c.width);
 ctx.scale(photoFlip?-1:1,1);ctx.filter=filterCss(photoValues());
 ctx.drawImage(photoImage,crop.sx,crop.sy,crop.sw,crop.sh,-drawW/2,-drawH/2,drawW,drawH);ctx.restore();ctx.filter='none';
 photoStrokes.forEach(st=>{ctx.strokeStyle=st.color;ctx.lineWidth=st.size;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();st.points.forEach((p,i)=>i?ctx.lineTo(p.x*c.width,p.y*c.height):ctx.moveTo(p.x*c.width,p.y*c.height));ctx.stroke()});
 const txt=$('#photoText').value.trim();if(txt){let size=+$('#photoTextSize').value;ctx.fillStyle=$('#photoTextColor').value;ctx.font=`700 ${size}px system-ui`;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillText(txt,c.width/2,c.height*.88);ctx.shadowBlur=0}
}
function openPhoto(file){
 if(!file||!file.type.startsWith('image/'))return;
 if(photoObjectUrl)URL.revokeObjectURL(photoObjectUrl);
 photoObjectUrl=URL.createObjectURL(file);photoImage=new Image();
 photoImage.onload=()=>{photoRotation=0;photoFlip=false;photoStrokes=[];Object.entries(photoDefaults).forEach(([k,v])=>$('#'+k).value=v);photoFilter='none';$$('.filter-btn').forEach(b=>b.classList.toggle('selected',b.dataset.filter==='none'));$('#photoCrop').value='original';$('#photoText').value='';drawPhoto();setStatus('#photoStatus','Фото загружено. Все изменения применяются локально.')};
 photoImage.onerror=()=>setStatus('#photoStatus','Не удалось открыть это изображение.');
 photoImage.src=photoObjectUrl;
}
$('#photoChoose').onclick=()=>$('#photoInput').click();
$('#photoInput').onchange=e=>openPhoto(e.target.files[0]);
Object.keys(photoDefaults).forEach(k=>$('#'+k).addEventListener('input',()=>{let val=$('#'+k).value;$('#'+k+'Val').textContent=k==='hue'?val+'°':k==='blur'?val+'px':val+'%';drawPhoto()}));
$$('.filter-btn').forEach(b=>b.onclick=()=>{photoFilter=b.dataset.filter;$$('.filter-btn').forEach(x=>x.classList.toggle('selected',x===b));drawPhoto()});
['photoCrop','photoText','photoTextColor','photoTextSize'].forEach(id=>$('#'+id).addEventListener('input',drawPhoto));
$('#photoRotate').onclick=()=>{photoRotation=(photoRotation+90)%360;drawPhoto()};
$('#photoFlip').onclick=()=>{photoFlip=!photoFlip;drawPhoto()};
$('#photoReset').onclick=()=>{photoRotation=0;photoFlip=false;photoStrokes=[];Object.entries(photoDefaults).forEach(([k,v])=>$('#'+k).value=v);photoFilter='none';$('#photoCrop').value='original';$('#photoText').value='';drawPhoto();setStatus('#photoStatus','Настройки сброшены.')};
$('#photoUndo').onclick=()=>{photoStrokes.pop();drawPhoto()};
$('#photoExport').onclick=()=>{if(!photoImage){setStatus('#photoStatus','Сначала открой фотографию.');return}photoCanvas.toBlob(blob=>{if(!blob)return;let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ai-studio-edited-photo.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),15000);setStatus('#photoStatus','Готово! PNG сохранён.')},'image/png')};
let activeStroke=null;
photoCanvas.addEventListener('pointerdown',e=>{if(!$('#drawMode').checked||!photoImage)return;photoCanvas.setPointerCapture(e.pointerId);let r=photoCanvas.getBoundingClientRect();activeStroke={color:$('#brushColor').value,size:+$('#brushSize').value,points:[{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}]};photoStrokes.push(activeStroke);drawPhoto()});
photoCanvas.addEventListener('pointermove',e=>{if(!activeStroke)return;let r=photoCanvas.getBoundingClientRect();activeStroke.points.push({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});drawPhoto()});
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>photoCanvas.addEventListener(ev,()=>activeStroke=null));
drawPhoto();

// Reorderable visual video timeline. Export uses the same ordered mediaFiles array.
function renderTimeline(){
 const el=$('#timelineTracks');el.innerHTML='';
 if(!mediaFiles.length){el.innerHTML='<span class="muted">Добавь медиафайлы для создания таймлайна</span>';return}
 mediaFiles.forEach((f,i)=>{let item=document.createElement('div');item.className='timeline-item';item.draggable=true;item.dataset.index=i;
 let title=document.createElement('span');title.textContent=(i+1)+'. '+f.name;
 let sub=document.createElement('small');sub.textContent=f.type.startsWith('video/')?'Видеоклип':'Фотография';
 let remove=document.createElement('button');remove.textContent='×';remove.title='Удалить';remove.onclick=e=>{e.stopPropagation();mediaFiles.splice(i,1);renderMedia();renderTimeline();drawPreview(mediaFiles[0]||null)};
 item.append(remove,title,sub);
 item.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(i));item.classList.add('dragging')});
 item.addEventListener('dragend',()=>item.classList.remove('dragging'));
 item.addEventListener('dragover',e=>e.preventDefault());
 item.addEventListener('drop',e=>{e.preventDefault();let from=+e.dataTransfer.getData('text/plain'),to=i;if(from===to)return;let [m]=mediaFiles.splice(from,1);mediaFiles.splice(to,0,m);renderMedia();renderTimeline();drawPreview(mediaFiles[0]||null)});
 el.append(item);
 });
}
const oldRenderMedia=renderMedia;
renderMedia=function(){oldRenderMedia();renderTimeline()};


// V3 workspace portability: export/import project metadata as JSON.
function workspaceData(){return {app:'AI Studio Ultimate',version:'3.0.0',exportedAt:new Date().toISOString(),projects:getProjects(),settings:{apiUrl:localStorage.getItem('ais_api')||''}}}
function downloadJson(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function exportWorkspace(){downloadJson(workspaceData(),'ai-studio-workspace.json')}
$('#exportWorkspace')?.addEventListener('click',exportWorkspace);
$('#exportWorkspace2')?.addEventListener('click',exportWorkspace);
function importWorkspaceFile(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!data||!Array.isArray(data.projects))throw new Error('Формат файла не распознан');localStorage.setItem('ais_projects',JSON.stringify(data.projects.slice(0,100)));if(data.settings?.apiUrl)localStorage.setItem('ais_api',data.settings.apiUrl);$('#apiUrl').value=localStorage.getItem('ais_api')||'';renderProjects();alert('Библиотека проекта импортирована. Медиафайлы нужно добавить заново: JSON содержит настройки и список проектов, но не сами фото/видео.')}catch(e){alert('Не удалось импортировать файл: '+e.message)}};r.readAsText(file)}
$('#importWorkspace')?.addEventListener('click',()=>$('#workspaceFile').click());
$('#importWorkspace2')?.addEventListener('click',()=>$('#workspaceFile').click());
$('#workspaceFile')?.addEventListener('change',e=>importWorkspaceFile(e.target.files[0]));
$('#hubCheck')?.addEventListener('click',async()=>{let u=($('#apiUrl').value||localStorage.getItem('ais_api')||'').trim().replace(/\/+$/,'');if(!u){setStatus('#hubStatus','Сначала укажи адрес сервера в Настройках.');return}try{let r=await fetch(u+'/health');let j=await r.json();setStatus('#hubStatus',r.ok?'Сервер доступен: '+(j.service||j.status||'OK')+'. Модели: '+(j.models||'проверяй отдельно'):'Сервер ответил ошибкой.')}catch(e){setStatus('#hubStatus','Соединение не установлено. Проверь сеть, CORS и адрес сервера.')}});
$('#removeBackground')?.addEventListener('click',async()=>{
 if(!photoImage){setStatus('#photoStatus','Сначала открой фотографию.');return}
 const base=(localStorage.getItem('ais_api')||'').trim().replace(/\/+$/,'');
 if(!base){setStatus('#photoStatus','Для AI-удаления фона нужен подключённый сервер сегментации. Укажи его в Настройках.');return}
 setStatus('#photoStatus','Проверяю доступность AI backend…');
 try{const r=await fetch(base+'/health');if(!r.ok)throw new Error('Сервер недоступен');setStatus('#photoStatus','Backend доступен, но endpoint сегментации /photo/remove-background ещё нужно подключить в backend.');}
 catch(e){setStatus('#photoStatus','Не удалось связаться с AI backend. '+e.message)}
});

// Video title overlay and transition-aware preview export (simple canvas compositor).
const originalVideoExport=exportVideo;
exportVideo=async function(){
 if(!mediaFiles.length){setStatus('#videoStatus','Сначала добавь фото или видео.');return}
 const caption=$('#videoCaption')?.value?.trim()||'';
 const canvas=$('#previewCanvas'),ctx=canvas.getContext('2d');
 const baseFn=window.__unused;
 // Existing export renderer remains the fallback; captions are composited on canvas during preview.
 if(caption){const draw=ctx.drawImage.bind(ctx);ctx.drawImage=function(...args){draw(...args);ctx.save();ctx.font=`700 ${$('#videoCaptionSize').value}px system-ui`;ctx.textAlign='center';ctx.fillStyle=$('#videoCaptionColor').value;ctx.shadowColor='#000';ctx.shadowBlur=9;ctx.fillText(caption,canvas.width/2,canvas.height*.88);ctx.restore()};}
 try{await originalVideoExport()}finally{if(caption)ctx.drawImage=CanvasRenderingContext2D.prototype.drawImage}
};
