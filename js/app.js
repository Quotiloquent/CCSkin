const $=s=>document.querySelector(s);
const W=85.6,H=53.98,R=3.18,BL=1.5,CH={x:9.4,y:20.2,w:11.4,h:9.4};
const S={front:{img:null,zoom:1,fit:'fill'},back:{img:null,zoom:1,fit:'fill'}};
let done=false,chipOn=true;
let mt;const msg=(t,ok)=>{const m=$('#msg');m.textContent=t;m.className=ok?'ok':'';clearTimeout(mt);if(t)mt=setTimeout(()=>m.textContent='',ok?2600:5000)};

/* ---------- tiles ---------- */
const tiles=$('#tiles'),fmt=z=>z.toFixed(2)+'\u00d7';
[['front','Side A','Front','var(--pink)'],['back','Side B','Back','var(--blue)']].forEach(([k,n,t,col])=>{
  const d=document.createElement('div');d.className='slot';d.dataset.k=k;d.style.setProperty('--c',col);
  d.innerHTML=`<label class="drop"><div class="in"></div><span class="ph"><span class="plus"><svg class="i"><use href="#i-plus"/></svg></span><b>Add ${t.toLowerCase()}</b><small>JPG \u00b7 PNG \u00b7 WebP</small></span><span class="chk"><svg class="i"><use href="#i-check"/></svg></span><input type="file" accept="image/*" aria-label="${t} image"></label>
  <div class="meta"><div class="hd"><h3>${t}</h3></div><span class="fn">No image yet</span>
  <div class="seg" role="group" aria-label="${t} fit"><button type="button" class="on" data-f="fill" data-tip="Crop to cover the card">Fill</button><button type="button" data-f="fit" data-tip="Show the whole image">Fit</button></div>
  <label class="zl"><span>Zoom</span><input class="zoom" type="range" min="1" max="2.5" step=".01" value="1" aria-label="${t} zoom"><output>1.00\u00d7</output></label></div>`;
  tiles.appendChild(d);
  const s=S[k],inn=d.querySelector('.in');
  d.querySelector('input[type=file]').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const u=URL.createObjectURL(f),im=new Image();
    im.onload=()=>{s.img=im;inn.style.backgroundImage=`url(${u})`;d.classList.add('has');d.querySelector('.fn').textContent=f.name;msg('');upd()};
    im.src=u;
  };
  d.querySelector('.zoom').oninput=e=>{s.zoom=+e.target.value;inn.style.transform=`scale(${s.zoom})`;d.querySelector('output').textContent=fmt(s.zoom);upd()};
  d.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{
    s.fit=b.dataset.f;d.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===b));
    inn.style.backgroundSize=s.fit==='fill'?'cover':'contain';upd();
  });
});
$('#chip').onchange=e=>{chipOn=e.target.checked;upd()};
let pend=0;function upd(){if(!done)return;cancelAnimationFrame(pend);pend=requestAnimationFrame(build)}

/* ---------- artwork renderer ---------- */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function render(k,dpi,print){
  const b=print?BL:0,m=dpi/25.4,pw=Math.round((W+2*b)*m),ph=Math.round((H+2*b)*m);
  const cv=document.createElement('canvas');cv.width=pw;cv.height=ph;
  const x=cv.getContext('2d'),s=S[k],im=s.img;
  x.save();if(!print){rr(x,0,0,pw,ph,R*m);x.clip()}
  x.fillStyle='#fff';x.fillRect(0,0,pw,ph);
  const r=(s.fit==='fill'?Math.max:Math.min)(pw/im.width,ph/im.height)*s.zoom,dw=im.width*r,dh=im.height*r;
  x.imageSmoothingQuality='high';x.drawImage(im,(pw-dw)/2,(ph-dh)/2,dw,dh);x.restore();
  if(!print&&k==='front'&&chipOn){x.globalCompositeOperation='destination-out';rr(x,CH.x*m,CH.y*m,CH.w*m,CH.h*m,1.2*m);x.fill()}
  return cv;
}

/* ---------- 3D ---------- */
let ren,scene,cam,grp,fm,bm,chipM,touched=false,tgt={x:.12,y:-.5},drag=null;
function shape(){const s=new THREE.Shape(),x=-W/2,y=-H/2,P=Math.PI;
  s.moveTo(x+R,y);s.lineTo(x+W-R,y);s.absarc(x+W-R,y+R,R,-P/2,0);s.lineTo(x+W,y+H-R);s.absarc(x+W-R,y+H-R,R,0,P/2);
  s.lineTo(x+R,y+H);s.absarc(x+R,y+H-R,R,P/2,P);s.lineTo(x,y+R);s.absarc(x+R,y+R,R,P,1.5*P);return s}
function face(sh,flip){
  const g=new THREE.ShapeGeometry(sh,20),p=g.attributes.position,u=g.attributes.uv;
  for(let i=0;i<p.count;i++){const a=(p.getX(i)+W/2)/W;u.setXY(i,flip?1-a:a,(p.getY(i)+H/2)/H)}
  return new THREE.Mesh(g,new THREE.MeshStandardMaterial({transparent:true,roughness:.28,metalness:.05}));
}
function init(){
  const cv=$('#gl');
  ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  ren.setPixelRatio(Math.min(devicePixelRatio||1,2));ren.outputEncoding=THREE.sRGBEncoding;
  scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(30,1.4,50,500);cam.position.z=200;
  scene.add(new THREE.AmbientLight(0xffffff,.85));
  const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(40,70,120);scene.add(dl);
  const p1=new THREE.PointLight(0xf4a7c3,.8,400);p1.position.set(-90,50,70);
  const p2=new THREE.PointLight(0x4f7be0,.8,400);p2.position.set(90,-50,70);scene.add(p1,p2);
  grp=new THREE.Group();scene.add(grp);
  const sh=shape();
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.76,bevelEnabled:false,curveSegments:20}),new THREE.MeshStandardMaterial({color:0x1d1b27,roughness:.5}));
  body.position.z=-.38;grp.add(body);
  chipM=new THREE.Mesh(new THREE.PlaneGeometry(CH.w,CH.h),new THREE.MeshStandardMaterial({color:0xd9b55f,metalness:.85,roughness:.3}));
  chipM.position.set(-W/2+CH.x+CH.w/2,H/2-CH.y-CH.h/2,.39);grp.add(chipM);
  fm=face(sh,false);bm=face(sh,true);fm.position.z=.4;bm.position.z=-.4;bm.rotation.y=Math.PI;grp.add(fm,bm);
  new ResizeObserver(()=>{const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}).observe(cv);
  cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};touched=true;cv.setPointerCapture(e.pointerId)});
  cv.addEventListener('pointermove',e=>{if(!drag)return;tgt.y+=(e.clientX-drag.x)*.011;tgt.x=Math.max(-.9,Math.min(.9,tgt.x+(e.clientY-drag.y)*.008));drag={x:e.clientX,y:e.clientY}});
  ['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>drag=null));
  (function loop(t){requestAnimationFrame(loop);if(!done)return;
    if(!touched)tgt.y=RM?-.35:Math.sin(t/1700)*.6;
    grp.rotation.y+=(tgt.y-grp.rotation.y)*.12;grp.rotation.x+=(tgt.x-grp.rotation.x)*.12;
    const f=Math.cos(grp.rotation.y)>=0;$('#side').textContent=f?'Front':'Back';
    ren.render(scene,cam)})(0);
}
function tex(cv){const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=ren.capabilities.getMaxAnisotropy();return t}
function build(){
  [['front',fm],['back',bm]].forEach(([k,m])=>{if(m.material.map)m.material.map.dispose();m.material.map=tex(render(k,300,false));m.material.needsUpdate=true});
  chipM.visible=chipOn;
}
$('#flip').onclick=()=>{touched=true;tgt.y=(Math.round(grp.rotation.y/Math.PI)+1)*Math.PI;tgt.x=0};

const goRun=()=>{
  if(!S.front.img||!S.back.img){msg('Add both images first.');return}
  msg('');
  try{if(!ren)init();done=true;$('#prev').hidden=false;build()}
  catch(e){msg(typeof THREE==='undefined'?'three.js did not load: connect to the internet once, or put three.min.js in the vendor folder.':'3D preview needs WebGL, which is not available here.');return}
  $('#prev').scrollIntoView({behavior:'smooth',block:'start'});
};

/* ---------- PDF (pdf-lib, generated entirely in the browser) ---------- */
const MM=72/25.4,PH=841.89,COLS=[[244,167,195],[248,213,107],[63,111,209],[232,71,61]];
const C=c=>PDFLib.rgb(c[0]/255,c[1]/255,c[2]/255);
const rrPath=(w,h,r)=>`M ${r} 0 H ${w-r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h-r} A ${r} ${r} 0 0 1 ${w-r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h-r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
const jpg=cv=>new Promise(r=>cv.toBlob(b=>b.arrayBuffer().then(r),'image/jpeg',.95));
async function makePDF(){
  const {PDFDocument,StandardFonts}=PDFLib,doc=await PDFDocument.create();
  const f=await doc.embedFont(StandardFonts.Helvetica),fb=await doc.embedFont(StandardFonts.HelveticaBold);
  const INK=[30,20,40],MUTE=[110,90,120],BODY=[70,60,80],BLACK=[0,0,0],CUT=[230,0,120],CHIPC=[0,150,230];
  let pg;
  const page=()=>{pg=doc.addPage([595.28,PH]);COLS.forEach((c,i)=>pg.drawRectangle({x:i*52.5*MM,y:PH-5*MM,width:52.5*MM,height:5*MM,color:C(c)}))};
  const T=(s,x,y,o={})=>pg.drawText(s,{x:x*MM,y:PH-y*MM,size:o.s||9,font:o.b?fb:f,color:C(o.c||INK)});
  const L=(x1,y1,x2,y2,o={})=>pg.drawLine({start:{x:x1*MM,y:PH-y1*MM},end:{x:x2*MM,y:PH-y2*MM},thickness:(o.w||.2)*MM,color:C(o.c||BLACK),...(o.d?{dashArray:o.d.map(v=>v*MM)}:{})});
  const RR=(x,y,w,h,r,c)=>pg.drawSvgPath(rrPath(w*MM,h*MM,r*MM),{x:x*MM,y:PH-y*MM,borderColor:C(c),borderWidth:.25*MM,borderDashArray:[1.2*MM,.9*MM]});
  const wrap=(s,w,sz)=>{const out=[];let l='';s.split(' ').forEach(t=>{const n=l?l+' '+t:t;if(l&&f.widthOfTextAtSize(n,sz)>w*MM){out.push(l);l=t}else l=n});out.push(l);return out};

  page();
  T('CARDSKIN / PRINT SHEET',15,19,{s:17,b:1});
  T('Print on A4 at 100% (Actual size)  -  artwork at 600 dpi with 1.5 mm bleed',15,25,{c:MUTE});
  const x0=(210-W-2*BL)/2;
  const place=async(k,y0)=>{
    const im=await doc.embedJpg(await jpg(render(k,600,true)));
    pg.drawImage(im,{x:x0*MM,y:PH-(y0+H+2*BL)*MM,width:(W+2*BL)*MM,height:(H+2*BL)*MM});
    const tx=x0+BL,ty=y0+BL,bw=W+2*BL,bh=H+2*BL;
    T(k.toUpperCase(),x0,y0-9,{b:1});
    [tx,tx+W].forEach(x=>{L(x,y0-2,x,y0-6);L(x,y0+bh+2,x,y0+bh+6)});
    [ty,ty+H].forEach(y=>{L(x0-2,y,x0-6,y);L(x0+bw+2,y,x0+bw+6,y)});
    RR(tx,ty,W,H,R,CUT);
    if(k==='front'&&chipOn)RR(tx+CH.x,ty+CH.y,CH.w,CH.h,1.2,CHIPC);
  };
  await place('front',44);await place('back',130);

  let ly=204;
  L(15,ly,33,ly,{w:.35,c:CUT,d:[1.2,.9]});T('Cut line (trim size, 3.18 mm corner radius)',37,ly+1,{c:BODY});
  if(chipOn){ly+=7;L(15,ly,33,ly,{w:.35,c:CHIPC,d:[1.2,.9]});T('Chip window, front only (position is approximate: test against your card)',37,ly+1,{c:BODY})}
  ly+=7;L(15,ly-2,15,ly+2);L(15,ly+2,19,ly+2);T('Crop marks sit outside the artwork, aligned to the cut line',37,ly+1,{c:BODY});
  T('SCALE CHECK',15,240,{b:1});
  L(15,247,65,247,{w:.4});L(15,244.5,15,249.5,{w:.4});L(65,244.5,65,249.5,{w:.4});
  T('This bar must measure exactly 50 mm. If not, reprint at 100% scale.',72,248,{c:BODY});
  T('Page 1 of 2  -  Instructions on the next page',15,286,{s:8,c:[140,120,150]});

  page();
  T('HOW TO MAKE & APPLY',15,19,{s:17,b:1});
  const steps=[
    ['Print','Use printable sticker paper (matte or gloss vinyl) that matches your printer type. In the print dialog choose A4, Scale 100% / Actual size, and turn off "Fit to page". Print in the best quality setting.'],
    ['Check the scale','Measure the scale bar on page 1. It must read 50 mm. If it does not, your printer is scaling the page: fix that and print again.'],
    ['Cut','Cut along the dashed pink line with sharp scissors, or a craft knife and ruler. The 1.5 mm bleed outside the line absorbs small cutting errors. Round the corners to match your card (about 3 mm radius).'],
    ['Chip window','If you enabled the chip window, cut out the dashed blue rectangle on the front sticker with a craft knife. Keep the edges clean so the contacts stay uncovered. Hold it against your card first and adjust if needed.'],
    ['Prep the card','Wipe the card with isopropyl alcohol and let it dry. Dust and oils are the main cause of bubbles and peeling edges.'],
    ['Apply','Peel the backing slowly. Line up one short edge (the chip edge on the front), lay the sticker down progressively, and smooth with a soft card or your thumb from the centre outwards to push out bubbles.'],
    ['Finish','Trim any overhang flush with a blade. Press the edges for 30 seconds. If a small bubble remains, prick it with a pin and smooth it flat.']
  ];
  let y=32;
  steps.forEach((s,i)=>{
    pg.drawCircle({x:19*MM,y:PH-(y-1.2)*MM,size:3.6*MM,color:C(COLS[i%4])});
    const n=String(i+1);T(n,19-fb.widthOfTextAtSize(n,10)/MM/2,y+.2,{s:10,b:1});
    T(s[0],27,y,{s:10,b:1});
    const ln=wrap(s[1],165,10);ln.forEach((t,j)=>T(t,27,y+5.5+j*4.6,{s:10,c:BODY}));
    y+=5.5+ln.length*4.6+6;
  });
  pg.drawRectangle({x:15*MM,y:PH-(y+32)*MM,width:180*MM,height:30*MM,color:C([250,240,246])});
  T('Good to know',20,y+10,{b:1,s:10});
  wrap('Stickers are cosmetic and only for cards you own. Keep the chip contacts and any signature panel usable, and check your card issuer\u2019s terms before covering other parts of the card. Thin vinyl normally does not affect contactless payments, but test before relying on it.',170,9).forEach((t,j)=>T(t,20,y+16+j*4.2,{c:BODY}));
  return doc.save();
}
$('#dl').onclick=async()=>{
  if(!done)return;msg('');
  try{
    $('#dl').classList.add('busy');await new Promise(r=>setTimeout(r,40));const bytes=await makePDF(),a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));a.download='cardskin-print-sheet.pdf';
    document.body.appendChild(a);a.click();a.remove();msg('PDF created. Check your downloads.',1);setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  }catch(e){msg('Could not create the PDF: '+e.message)}finally{$('#dl').classList.remove('busy')}
};

/* ---------- UI hooks: motion preference, convert loading state ---------- */
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#go').onclick=()=>{
  const miss=document.querySelectorAll('.slot');
  miss.forEach(el=>{if(!S[el.dataset.k].img){el.classList.add('need');setTimeout(()=>el.classList.remove('need'),950)}});
  const b=$('#go');b.classList.add('busy');
  setTimeout(()=>{goRun();b.classList.remove('busy');if(done)msg('Preview ready. Drag to turn the card.',1)},40);
};
