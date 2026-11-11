import * as THREE from 'three';
const V3 = THREE.Vector3;
const $ = id => document.getElementById(id);
const DEG = Math.PI/180, FT = 3.28084;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;

// ---------------- constants (Apollo LM-ish) ----------------
const GM=1.62, TMAX=45040, ISP=305, G0=9.80665, DRY=6900, TANK=8248, FUEL0=700;
const MAXRATE=14*DEG, ANGACC=26*DEG, R_MOON=1737400;
const COM=new V3(0,2.8,0);
const TARGET={x:-25,z:12};           // where P64 is taking you: West crater rim
const WEST={x:70,z:25,r:95};
const CLEAR={x:400,z:-30,r:55};      // a smooth patch ~430 m long
const GET0=102*3600+42*60+5;

// ---------------- RNG / noise ----------------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash2(i,j){let h=(Math.imul(i,374761393)+Math.imul(j,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function vnoise(x,z){const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  return lerp(lerp(hash2(i,j),hash2(i+1,j),u),lerp(hash2(i,j+1),hash2(i+1,j+1),u),v)*2-1;}

// ---------------- terrain ----------------
const rng=mulberry32(19690720);
const CELL=40, cgrid=new Map(); const ckey=(i,j)=>(i+3000)*8192+(j+3000);
function addCrater(x,z,r,fresh){
  const c={x,z,r,depth:r*(fresh?0.2:0.1),rim:r*(fresh?0.05:0.02),ir2:1/(r*r)};
  const R=r*2.2;
  for(let i=Math.floor((x-R)/CELL);i<=Math.floor((x+R)/CELL);i++)
    for(let j=Math.floor((z-R)/CELL);j<=Math.floor((z+R)/CELL);j++){const k=ckey(i,j);let a=cgrid.get(k);if(!a){a=[];cgrid.set(k,a);}a.push(c);}
}
addCrater(WEST.x,WEST.z,WEST.r,true);
for(let n=0;n<34;n++){const r=150+Math.pow(rng(),2)*650,x=(rng()*2-1)*28000,z=(rng()*2-1)*28000;if(Math.hypot(x,z)<1700+r*2.2)continue;addCrater(x,z,r,rng()<0.3);}
for(let n=0;n<300;n++){const r=12+Math.pow(rng(),2.5)*70,x=(rng()*2-1)*3300,z=(rng()*2-1)*3300;
  if(Math.hypot(x-CLEAR.x,z-CLEAR.z)<CLEAR.r+r*2.2+10)continue; if(Math.hypot(x-WEST.x,z-WEST.z)<WEST.r+r*1.5)continue; addCrater(x,z,r,rng()<0.4);}
for(let n=0;n<1700;n++){const r=1.5+Math.pow(rng(),3)*10,x=-750+rng()*1900,z=-550+rng()*1100;
  if(Math.hypot(x-CLEAR.x,z-CLEAR.z)<CLEAR.r+r*2.2)continue; addCrater(x,z,r,rng()<0.5);}
function craterH(c,x,z){const dx=x-c.x,dz=z-c.z,d2=(dx*dx+dz*dz)*c.ir2;if(d2>4.84)return 0;
  if(d2<1)return c.depth*(d2-1)+c.rim; const t=(Math.sqrt(d2)-1)/0.4; return c.rim*Math.exp(-t*t);}
function H(x,z){
  let h=7*vnoise(x*0.0021+3.1,z*0.0021-1.7)+1.6*vnoise(x*0.009,z*0.009+5.3)+0.35*vnoise(x*0.04+9,z*0.04)+0.07*vnoise(x*0.25,z*0.25);
  const a=cgrid.get(ckey(Math.floor(x/CELL),Math.floor(z/CELL)));
  if(a)for(let i=0;i<a.length;i++)h+=craterH(a[i],x,z);
  return h-(x*x+z*z)/(2*R_MOON);
}
function tcol(x,z){let c=0.30+0.035*vnoise(x*0.02+11,z*0.02)+0.02*vnoise(x*0.15,z*0.15-4);
  const dw=Math.hypot(x-WEST.x,z-WEST.z)/WEST.r; if(dw>0.8&&dw<3.2)c+=0.07*Math.exp(-(((dw-1.3)/0.6)**2))*(0.6+0.4*vnoise(x*0.05,z*0.05));
  return c;}

// ---------------- boulders ----------------
const boulders=[], BCELL=8, bgrid=new Map(); const bkey=(i,j)=>(i+5000)*16384+(j+5000);
function bdens(x,z){const dw=Math.hypot(x-WEST.x,z-WEST.z)/WEST.r;let d=0.0005+0.026*Math.exp(-(((dw-1.15)/0.45)**2));if(dw<0.9)d+=0.003;
  const dc=Math.hypot(x-CLEAR.x,z-CLEAR.z);if(dc<CLEAR.r)d=0;else if(dc<CLEAR.r+25)d*=(dc-CLEAR.r)/25;return d;}
{const DMAX=0.0295,X0=-700,X1=1100,Z0=-500,Z1=500,N=Math.round((X1-X0)*(Z1-Z0)*DMAX);
 for(let n=0;n<N;n++){const x=X0+rng()*(X1-X0),z=Z0+rng()*(Z1-Z0);if(rng()*DMAX>bdens(x,z))continue;
  const dw=Math.hypot(x-WEST.x,z-WEST.z)/WEST.r, big=(dw>0.75&&dw<1.9)?2:1;
  const r=Math.min(3.2,0.18*Math.pow(1-rng(),-1/1.7)*big); const b={x,z,r,y:H(x,z)+r*0.35,sy:0.55+rng()*0.3};boulders.push(b);
  for(let i=Math.floor((x-r)/BCELL);i<=Math.floor((x+r)/BCELL);i++)for(let j=Math.floor((z-r)/BCELL);j<=Math.floor((z+r)/BCELL);j++){const k=bkey(i,j);let a=bgrid.get(k);if(!a){a=[];bgrid.set(k,a);}a.push(b);}
 }}
function bouldersNear(x,z){return bgrid.get(bkey(Math.floor(x/BCELL),Math.floor(z/BCELL)))||[];}

// ---------------- device & graphics quality ----------------
const QS=new URLSearchParams(location.search);
const IS_TOUCH=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>1||('ontouchstart' in window);
function pref(k,d,ok){try{const v=QS.get(k)||localStorage.getItem('eagle.'+k);return ok.includes(v)?v:d;}catch(e){return d;}}
const gfxPref=pref('gfx','auto',['auto','high','low']);
const GFX=gfxPref==='auto'?(IS_TOUCH?'low':'high'):gfxPref, LOW=GFX==='low';
let touchPref=pref('touch','auto',['auto','on','off']);
let TOUCH_UI=touchPref==='on'||(touchPref==='auto'&&IS_TOUCH);

// ---------------- renderer / scene ----------------
const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(LOW?1.5:2,devicePixelRatio||1));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=LOW?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
renderer.outputColorSpace=THREE.SRGBColorSpace;
$('view').prepend(renderer.domElement);
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x000000);
const camera=new THREE.PerspectiveCamera(55,1,0.08,300000);

const SUN_EL=11*DEG, SUN_AZ=200*DEG; // sun low, behind the LM (from -x)
const sunDir=new V3(Math.cos(SUN_EL)*Math.cos(SUN_AZ),Math.sin(SUN_EL),Math.cos(SUN_EL)*Math.sin(SUN_AZ)).normalize();
const sun=new THREE.DirectionalLight(0xfff8ec,5.2); sun.castShadow=true;
{const ms=Math.min(LOW?2048:4096,renderer.capabilities.maxTextureSize||2048);sun.shadow.mapSize.set(ms,ms);} sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.04;
sun.shadow.camera.near=1; sun.shadow.camera.far=4000;
scene.add(sun); scene.add(sun.target);
scene.add(new THREE.HemisphereLight(0x8a9ab8,0x5a544a,0.55));
const engLight=new THREE.PointLight(0xffc890,0,60,1.6); scene.add(engLight);

// textures
function canvasTex(w,h,fn,srgb=true){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
const regoTex=canvasTex(256,256,(g,w,h)=>{const id=g.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const n=0.5*(vnoise(x/16%16,y/16%16)+1); let v=200+30*Math.sin(n*6)+(hash2(x,y)*40-20); const i=(y*w+x)*4;id.data[i]=id.data[i+1]=id.data[i+2]=clamp(v,0,255);id.data[i+3]=255;}
  g.putImageData(id,0,0); for(let k=0;k<160;k++){g.fillStyle=`rgba(40,40,40,${0.15+Math.random()*0.3})`;g.beginPath();g.arc(Math.random()*w,Math.random()*h,Math.random()*2.2+0.4,0,7);g.fill();}});
regoTex.wrapS=regoTex.wrapT=THREE.RepeatWrapping;
const foilTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#b8892a';g.fillRect(0,0,w,h);const cs=['#d9b14a','#8a6420','#e8c96a','#6b4c18','#c79a33','#f0d68a','#2b2b2b','#a9a9a0'];
  for(let k=0;k<420;k++){g.fillStyle=cs[(Math.random()*(k%9===0?8:6))|0];g.globalAlpha=0.35+Math.random()*0.6;g.beginPath();const x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let s=0;s<4;s++)g.lineTo(x+(Math.random()-0.5)*40,y+(Math.random()-0.5)*40);g.fill();}g.globalAlpha=1;});
const earthTex=canvasTex(512,256,(g,w,h)=>{const id=g.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const lon=x/w*Math.PI*2,lat=(y/h-0.5)*Math.PI;const px=Math.cos(lat)*Math.cos(lon)*3,py=Math.sin(lat)*3,pz=Math.cos(lat)*Math.sin(lon)*3;
   let land=vnoise(px+py*1.3+10,pz-py+4)*0.6+vnoise(px*2.1+3,pz*2.1+py)*0.3+vnoise(px*4,pz*4+py*3)*0.15;
   let cl=vnoise(px*2.5+py*3+40,pz*2.5-py)*0.6+vnoise(px*6+1,pz*6+py*5)*0.4;
   let r=22,gg=70,b=150; if(land>0.12){r=95+land*80;gg=110+land*40;b=70;} if(Math.abs(lat)>1.25){r=gg=b=235;}
   const c=clamp((cl-0.05)*2.2,0,1)*0.9; r=lerp(r,250,c);gg=lerp(gg,250,c);b=lerp(b,252,c);
   const i=(y*w+x)*4;id.data[i]=r;id.data[i+1]=gg;id.data[i+2]=b;id.data[i+3]=255;}g.putImageData(id,0,0);});
const glowTex=canvasTex(128,128,(g,w,h)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.15,'rgba(255,250,235,0.9)');gr.addColorStop(0.4,'rgba(255,240,200,0.2)');gr.addColorStop(1,'rgba(255,240,200,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const plumeAlpha=canvasTex(4,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#fff');gr.addColorStop(0.35,'#666');gr.addColorStop(1,'#000');g.fillStyle=gr;g.fillRect(0,0,w,h);},false);

// terrain meshes
const terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,map:regoTex,roughness:0.97,metalness:0});
function buildTier(x0,x1,z0,z1,step,hole,drop){
  const nx=Math.round((x1-x0)/step),nz=Math.round((z1-z0)/step),vx=nx+1,nv=vx*(nz+1);
  const pos=new Float32Array(nv*3),col=new Float32Array(nv*3),uv=new Float32Array(nv*2);
  let p=0,q=0;
  for(let j=0;j<=nz;j++){const z=z0+j*step;for(let i=0;i<=nx;i++){const x=x0+i*step;pos[p]=x;pos[p+1]=H(x,z)-drop;pos[p+2]=z;
    const c=tcol(x,z);col[p]=c;col[p+1]=c*0.97;col[p+2]=c*0.93;p+=3;uv[q++]=x/7;uv[q++]=z/7;}}
  const idx=[];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const xa=x0+i*step,za=z0+j*step;
    if(hole&&xa>=hole.x0&&xa+step<=hole.x1&&za>=hole.z0&&za+step<=hole.z1)continue;
    const a=j*vx+i,b=a+1,c=a+vx,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx),1));g.computeVertexNormals();
  const m=new THREE.Mesh(g,terrainMat);m.receiveShadow=true;m.castShadow=step<5;scene.add(m);return m;
}
buildTier(-700,1100,-500,500,LOW?3.5:2.5,null,0);
buildTier(-3600,3600,-3600,3600,LOW?30:20,{x0:-680,x1:1080,z0:-480,z1:480},0.35);
buildTier(-30000,30000,-30000,30000,400,{x0:-3200,x1:3200,z0:-3200,z1:3200},2);

// boulders instanced
{const vis=LOW?boulders.filter(b=>b.r>=0.25):boulders;const geo=new THREE.IcosahedronGeometry(1,LOW?0:1);const pa=geo.attributes.position;
 for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i);const f=0.82+0.36*hash2(Math.round(x*97)+Math.round(z*31),Math.round(y*53));pa.setXYZ(i,x*f,y*f,z*f);}
 geo.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.92,flatShading:true,map:regoTex});
 const im=new THREE.InstancedMesh(geo,mat,vis.length);const d=new THREE.Object3D();const col=new THREE.Color();
 vis.forEach((b,i)=>{d.position.set(b.x,b.y,b.z);d.rotation.set(rng()*0.4,rng()*6.28,rng()*0.4);d.scale.set(b.r*(0.85+rng()*0.3),b.r*b.sy,b.r*(0.85+rng()*0.3));d.updateMatrix();im.setMatrixAt(i,d.matrix);
   const v=0.33+rng()*0.12;col.setRGB(v,v*0.97,v*0.93);im.setColorAt(i,col);});
 im.castShadow=true;im.receiveShadow=true;scene.add(im);}

// target ring (planned site)
{const ring=new THREE.Mesh(new THREE.RingGeometry(7,8,48),new THREE.MeshBasicMaterial({color:0xff6a3a,transparent:true,opacity:0.35,depthWrite:false}));
 ring.rotation.x=-Math.PI/2;ring.position.set(TARGET.x,H(TARGET.x,TARGET.z)+1.2,TARGET.z);scene.add(ring);}

// sky: stars, earth, sun
const sky=new THREE.Group();scene.add(sky);
{const n=2600,p=new Float32Array(n*3);for(let i=0;i<n;i++){const u=rng()*2-1,a=rng()*Math.PI*2,s=Math.sqrt(1-u*u);p[i*3]=s*Math.cos(a)*90000;p[i*3+1]=u*90000;p[i*3+2]=s*Math.sin(a)*90000;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
 sky.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xbfc8d8,size:1.4,sizeAttenuation:false,transparent:true,opacity:0.75,depthWrite:false})));}
const earthDir=new V3(0.55,0.42,-0.72).normalize();
const earth=new THREE.Mesh(new THREE.SphereGeometry(1500,48,32),new THREE.MeshStandardMaterial({map:earthTex,roughness:0.9,emissive:0x0a1430,emissiveIntensity:0.25}));
earth.position.copy(earthDir).multiplyScalar(80000);earth.rotation.set(0.4,2.2,0.2);sky.add(earth);
const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
sunSprite.scale.set(9000,9000,1);sunSprite.position.copy(sunDir).multiplyScalar(85000);sky.add(sunSprite);
