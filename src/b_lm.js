
// ---------------- LM model ----------------
function cyl(a,b,r,mat,seg=6){const dir=new V3().subVectors(b,a);const len=dir.length();const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,seg),mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(new V3(0,1,0),dir.normalize());return m;}
const lmRoot=new THREE.Group(); scene.add(lmRoot);
const lm=new THREE.Group(); lm.position.copy(COM).negate(); lmRoot.add(lm);
// two stages: dsG (descent) and asG (ascent); on ABORT STAGE dsG is moved to dsRoot and falls on its own
const dsG=new THREE.Group(), asG=new THREE.Group(); lm.add(dsG,asG);
const dsRoot=new THREE.Group(); dsRoot.visible=false; scene.add(dsRoot);
let aplume;
const plume=new THREE.Group(), puffs=[];
const PADS=[],PROBES=[],HULL=[],HULL_D=[],HULL_A=[];
{
  const gold=new THREE.MeshStandardMaterial({map:foilTex,metalness:0.7,roughness:0.36,flatShading:true});
  const silver=new THREE.MeshStandardMaterial({color:0xb7bbbf,metalness:0.55,roughness:0.42,flatShading:true});
  const grey=new THREE.MeshStandardMaterial({color:0x8d9095,metalness:0.3,roughness:0.6,flatShading:true});
  const dark=new THREE.MeshStandardMaterial({color:0x2a2b2e,metalness:0.4,roughness:0.55,flatShading:true});
  const glass=new THREE.MeshStandardMaterial({color:0x0b0e14,metalness:0.6,roughness:0.15,side:THREE.DoubleSide});
  const mk=g=>(m)=>{m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};const add=mk(dsG),addA=mk(asG);
  const ds=add(new THREE.Mesh(new THREE.CylinderGeometry(2.15,2.15,1.65,8),gold));ds.position.y=2.05;ds.rotation.y=Math.PI/8;
  const deck=add(new THREE.Mesh(new THREE.CylinderGeometry(2.05,2.15,0.12,8),silver));deck.position.y=2.92;deck.rotation.y=Math.PI/8;
  const shield=add(new THREE.Mesh(new THREE.CylinderGeometry(2.1,1.9,0.14,8),dark));shield.position.y=1.17;shield.rotation.y=Math.PI/8;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.8,0.95,16,1,true),new THREE.MeshStandardMaterial({color:0x3a3633,metalness:0.6,roughness:0.5,side:THREE.DoubleSide}))).position.y=0.86;
  for(let k=0;k<4;k++){const a=k*Math.PI/2,d=new V3(Math.cos(a),0,Math.sin(a)),pp=new V3(-d.z,0,d.x);
    const A=d.clone().multiplyScalar(2.05).setY(2.75),P=d.clone().multiplyScalar(4.55).setY(0.16);
    add(cyl(A,P,0.11,silver));
    const M=A.clone().lerp(P,0.55);
    add(cyl(M,d.clone().multiplyScalar(1.95).add(pp.clone().multiplyScalar(1.1)).setY(1.3),0.06,gold));
    add(cyl(M,d.clone().multiplyScalar(1.95).add(pp.clone().multiplyScalar(-1.1)).setY(1.3),0.06,gold));
    add(cyl(M,d.clone().multiplyScalar(2.0).setY(1.45),0.07,silver));
    const pad=add(new THREE.Mesh(new THREE.CylinderGeometry(0.47,0.36,0.16,12),gold));pad.position.copy(d.clone().multiplyScalar(4.55)).setY(0.08);
    PADS.push(d.clone().multiplyScalar(4.55).setY(0).sub(COM));
    if(k!==0){const t0=d.clone().multiplyScalar(4.62).setY(0.05),t1=d.clone().multiplyScalar(4.75).setY(-1.5);add(cyl(t0,t1,0.025,silver,4));PROBES.push(t1.clone().sub(COM));}
    else{for(const s of [-0.28,0.28]){add(cyl(A.clone().add(pp.clone().multiplyScalar(s)).add(d.clone().multiplyScalar(0.1)),P.clone().add(pp.clone().multiplyScalar(s)).add(new V3(0,0.3,0)),0.03,silver,4));}
      for(let r=1;r<9;r++){const c=A.clone().lerp(P,r/9.5).add(d.clone().multiplyScalar(0.1));add(cyl(c.clone().add(pp.clone().multiplyScalar(-0.28)),c.clone().add(pp.clone().multiplyScalar(0.28)),0.02,silver,4));}
      add(new THREE.Mesh(new THREE.BoxGeometry(0.6,0.05,0.9),silver)).position.set(2.35,2.85,0);}
  }
  // ascent stage
  const cab=addA(new THREE.Mesh(new THREE.CylinderGeometry(1.28,1.28,3.0,8),grey));cab.rotation.x=Math.PI/2;cab.position.set(0.25,4.1,0);
  addA(new THREE.Mesh(new THREE.BoxGeometry(0.25,1.7,2.0),grey)).position.set(1.45,3.95,0);
  addA(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.85,0.85),dark)).position.set(1.6,3.45,0);
  for(const s of [-1,1]){const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(0.78*s,0);sh.lineTo(0.12*s,0.62);sh.lineTo(0,0);
    const w=addA(new THREE.Mesh(new THREE.ShapeGeometry(sh),glass));w.rotation.y=Math.PI/2;w.position.set(1.585,4.08,-0.12*s);}
  addA(new THREE.Mesh(new THREE.BoxGeometry(1.3,1.6,2.5),dark)).position.set(-1.45,4.25,0);
  for(const s of [-1,1]){const t=addA(new THREE.Mesh(new THREE.CylinderGeometry(0.58,0.58,0.8,8),silver));t.rotation.x=Math.PI/2;t.position.set(-0.4,3.75,1.75*s);
    addA(new THREE.Mesh(new THREE.BoxGeometry(1.2,1.0,0.5),gold)).position.set(0.3,3.55,1.45*s);}
  addA(new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.62,0.55,10),silver)).position.set(0.15,5.55,0);
  addA(cyl(new V3(-0.9,5.2,-0.9),new V3(-1.0,6.0,-1.1),0.04,silver,4));
  const dish=addA(new THREE.Mesh(new THREE.SphereGeometry(0.42,10,6,0,Math.PI*2,0,1.0),silver));dish.position.set(-1.0,6.0,-1.1);dish.rotation.x=-0.6;
  const rr=addA(new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.2,0.2,10),silver));rr.position.set(0.95,5.25,0.75);rr.rotation.z=-0.8;
  // RCS quads; each has 4 jets (up, down, and two sideways). Jets are emitter descriptors, the visible exhaust is the rcsFx particle system below.
  for(const sx of [-1,1])for(const sz of [-1,1]){const qd=addA(new THREE.Mesh(new THREE.BoxGeometry(0.32,0.32,0.32),silver));qd.position.set(1.15*sx,4.75,1.55*sz);
    for(const dirv of [new V3(0,1,0),new V3(0,-1,0),new V3(sx,0,0),new V3(0,0,sz)]){
      const p=qd.position.clone().addScaledVector(dirv,0.2);const r=p.clone().sub(COM);     // nozzle, relative to the centre of mass
      const tq=new V3().crossVectors(r,dirv.clone().negate()).normalize();                 // body-frame torque direction this jet produces
      puffs.push({p,d:dirv.clone(),tq,on:0});}}
  // plume (stylised; real DPS plume is nearly invisible in vacuum)
  const pm1=new THREE.MeshBasicMaterial({color:0xffb46a,alphaMap:plumeAlpha,transparent:true,opacity:0.3,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const pm2=pm1.clone();pm2.color.set(0xfff0d0);
  const c1=new THREE.Mesh(new THREE.CylinderGeometry(0.75,2.4,7,20,1,true),pm1);c1.position.y=-3.5;
  const c2=new THREE.Mesh(new THREE.CylinderGeometry(0.55,1.1,3.2,16,1,true),pm2);c2.position.y=-1.6;
  plume.add(c1,c2);plume.position.y=0.38;dsG.add(plume);
  // ascent engine plume (APS nozzle sits at the base of the ascent stage)
  aplume=new THREE.Group();const a1=new THREE.Mesh(new THREE.CylinderGeometry(0.4,1.5,4.2,16,1,true),pm1.clone());a1.position.y=-2.1;const a2=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.6,1.8,12,1,true),pm2.clone());a2.position.y=-0.9;
  aplume.add(a1,a2);aplume.position.y=2.95;aplume.visible=false;asG.add(aplume);
  HULL_D.push(...[[0,0.38,0],[2.15,1.25,0],[-2.15,1.25,0],[0,1.25,2.15],[0,1.25,-2.15],[0,2.9,0]].map(a=>new V3(...a).sub(COM)));
  HULL_A.push(...[[0,5.8,0],[1.6,4.0,1.0],[1.6,4.0,-1.0],[-2.1,4.2,1.2],[-2.1,4.2,-1.2],[-0.4,3.75,2.35],[-0.4,3.75,-2.35],[0,2.95,0],[1.2,3.0,1.2],[1.2,3.0,-1.2],[-1.2,3.0,1.2],[-1.2,3.0,-1.2]].map(a=>new V3(...a).sub(COM)));
  HULL.push(...HULL_D.slice(0,5),...HULL_A.slice(0,7));
}

// ---------------- dust particles ----------------
const MAXP=4000;
const dust={pos:new Float32Array(MAXP*3),vel:new Float32Array(MAXP*3),life:new Float32Array(MAXP),max:new Float32Array(MAXP),alpha:new Float32Array(MAXP),a0:new Float32Array(MAXP),size:new Float32Array(MAXP),head:0};
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dust.pos,3));
dustGeo.setAttribute('aAlpha',new THREE.BufferAttribute(dust.alpha,1));dustGeo.setAttribute('aSize',new THREE.BufferAttribute(dust.size,1));
const dustMat=new THREE.ShaderMaterial({uniforms:{uScale:{value:600},uColor:{value:new THREE.Color(0xc9c2b4)}},transparent:true,depthWrite:false,
  vertexShader:`#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aAlpha;attribute float aSize;varying float vA;uniform float uScale;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale/max(0.1,-mv.z),1.0,256.0);vA=aAlpha;
#include <logdepthbuf_vertex>
}`,
  fragmentShader:`#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor;varying float vA;
void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5||vA<=0.0)discard;
#include <logdepthbuf_fragment>
gl_FragColor=vec4(uColor,vA*(1.0-d*2.0));}`});
const dustPts=new THREE.Points(dustGeo,dustMat);dustPts.frustumCulled=false;scene.add(dustPts);
function emitDust(x,y,z,vx,vy,vz,life,size,alpha){const i=dust.head;dust.head=(dust.head+1)%MAXP;
  dust.pos[i*3]=x;dust.pos[i*3+1]=y;dust.pos[i*3+2]=z;dust.vel[i*3]=vx;dust.vel[i*3+1]=vy;dust.vel[i*3+2]=vz;dust.life[i]=life;dust.max[i]=life;dust.size[i]=size;dust.a0[i]=alpha;}
function updateDust(dt){for(let i=0;i<MAXP;i++){if(dust.life[i]<=0){dust.alpha[i]=0;continue;}dust.life[i]-=dt;
  dust.vel[i*3+1]-=GM*dt;dust.pos[i*3]+=dust.vel[i*3]*dt;dust.pos[i*3+1]+=dust.vel[i*3+1]*dt;dust.pos[i*3+2]+=dust.vel[i*3+2]*dt;
  const f=dust.life[i]/dust.max[i];dust.alpha[i]=dust.life[i]>0?Math.min(1,f*1.6)*dust.a0[i]:0;}
  dustGeo.attributes.position.needsUpdate=true;dustGeo.attributes.aAlpha.needsUpdate=true;dustGeo.attributes.aSize.needsUpdate=true;}
function clearDust(){dust.life.fill(0);dust.alpha.fill(0);rcsP.life.fill(0);rcsP.alpha.fill(0);}
// ---------------- RCS exhaust: short-lived, soft, additive wisps ----------------
const MAXR=LOW?500:900;
const rcsP={pos:new Float32Array(MAXR*3),vel:new Float32Array(MAXR*3),life:new Float32Array(MAXR),max:new Float32Array(MAXR),alpha:new Float32Array(MAXR),a0:new Float32Array(MAXR),size:new Float32Array(MAXR),s0:new Float32Array(MAXR),head:0};
const rcsGeo=new THREE.BufferGeometry();rcsGeo.setAttribute('position',new THREE.BufferAttribute(rcsP.pos,3));
rcsGeo.setAttribute('aAlpha',new THREE.BufferAttribute(rcsP.alpha,1));rcsGeo.setAttribute('aSize',new THREE.BufferAttribute(rcsP.size,1));
const rcsMat=new THREE.ShaderMaterial({uniforms:{uScale:{value:600},uColor:{value:new THREE.Color(0xdfe8ff)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:dustMat.vertexShader,
  fragmentShader:`#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor;varying float vA;
void main(){vec2 c=gl_PointCoord-0.5;float d2=dot(c,c)*4.0;if(d2>1.0||vA<=0.0)discard;
#include <logdepthbuf_fragment>
gl_FragColor=vec4(uColor*vA*exp(-d2*3.2)*(1.0-d2),1.0);}`});
const rcsPts=new THREE.Points(rcsGeo,rcsMat);rcsPts.frustumCulled=false;rcsPts.renderOrder=3;scene.add(rcsPts);
const _rp=new V3(),_rd=new V3();
function emitRcs(jet,n,strength,q,pos,vel){for(let k=0;k<n;k++){const i=rcsP.head;rcsP.head=(rcsP.head+1)%MAXR;
  _rp.copy(jet.p).sub(COM).applyQuaternion(q).add(pos);_rd.copy(jet.d);
  _rd.x+=(Math.random()-0.5)*0.32;_rd.y+=(Math.random()-0.5)*0.32;_rd.z+=(Math.random()-0.5)*0.32;_rd.normalize().applyQuaternion(q);
  const sp=9+Math.random()*9,j=Math.random()*0.05;
  rcsP.pos[i*3]=_rp.x+_rd.x*j;rcsP.pos[i*3+1]=_rp.y+_rd.y*j;rcsP.pos[i*3+2]=_rp.z+_rd.z*j;
  rcsP.vel[i*3]=vel.x+_rd.x*sp;rcsP.vel[i*3+1]=vel.y+_rd.y*sp;rcsP.vel[i*3+2]=vel.z+_rd.z*sp;
  const l=0.07+Math.random()*0.11;rcsP.life[i]=l;rcsP.max[i]=l;rcsP.s0[i]=0.12+Math.random()*0.08;rcsP.a0[i]=(0.38+Math.random()*0.22)*strength;}}
function updateRcsFx(dt){for(let i=0;i<MAXR;i++){if(rcsP.life[i]<=0){rcsP.alpha[i]=0;continue;}rcsP.life[i]-=dt;
  rcsP.pos[i*3]+=rcsP.vel[i*3]*dt;rcsP.pos[i*3+1]+=rcsP.vel[i*3+1]*dt;rcsP.pos[i*3+2]+=rcsP.vel[i*3+2]*dt;
  const age=1-Math.max(0,rcsP.life[i])/rcsP.max[i];rcsP.size[i]=rcsP.s0[i]*(1+age*4.5);rcsP.alpha[i]=rcsP.life[i]>0?rcsP.a0[i]*(1-age)*(1-age):0;}
  rcsGeo.attributes.position.needsUpdate=true;rcsGeo.attributes.aAlpha.needsUpdate=true;rcsGeo.attributes.aSize.needsUpdate=true;}
