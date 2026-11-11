import * as THREE from "three";

// All assets in this module are native Three.js meshes, lights or generated textures.
// No external textures to download, and instanced roadside objects reduce draw calls.
const m = (color, roughness=0.8, metalness=0) =>
  new THREE.MeshStandardMaterial({color, roughness, metalness});
const box = (group, size, pos, mat) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  o.position.set(...pos); group.add(o); return o;
};
function decalTexture(kind) {
  const canvas=document.createElement("canvas");
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext("2d");
  if(kind==="tarmac"){
    ctx.fillStyle="#4a4f52";ctx.fillRect(0,0,256,256);
    let seed=7713;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<6200;i++){
      const v=Math.floor(30+random()*88);
      ctx.fillStyle=`rgba(${v},${v},${v},${.02+random()*.22})`;
      ctx.fillRect(random()*256,random()*256,random()*2.4+.3,random()*2.4+.3);
    }
  } else {
    ctx.fillStyle="#21323d";ctx.fillRect(0,0,256,256);
    ctx.strokeStyle="#536b7e";ctx.lineWidth=2;
    for(let i=0;i<=256;i+=32){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}
    ctx.fillStyle="#1b2730";for(let i=0;i<130;i++)ctx.fillRect(Math.random()*256,Math.random()*256,2,2);
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=4;return tex;
}
function textSprite(text, accent="#edae54") {
  const canvas=document.createElement("canvas");
  canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#101b25";ctx.fillRect(0,0,512,128);
  ctx.fillStyle=accent;ctx.fillRect(0,0,512,9);
  ctx.font="900 45px Arial, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle="#fff0d8";ctx.fillText(text,256,68);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;return tex;
}

export function enhanceMaterials(model) {
  // GLB exports can bake dark/non-PBR colors into materials. Respect per-part textures,
  // but improve glass, tires, metallic parts and clearcoat where applicable.
  model.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    const result=mats.map(original=>{
      if(!original)return original;
      const mat=original.clone(), name=(mat.name||"").toLowerCase();
      if(/window|glass/.test(name)){
        mat.metalness=.12;mat.roughness=.08;
        if(mat.color)mat.color.set("#54768f");
        if(mat.map)mat.map=null; // prevent a baked pitch-black window texture
        mat.transparent=false;mat.opacity=1;
        mat.needsUpdate=true;
      } else if(/tire|rubber/.test(name)){
        mat.metalness=0;mat.roughness=.88;if(mat.color)mat.color.multiplyScalar(.55);
      } else if(/rim|chrome|wheelout|alloy/.test(name)){
        mat.metalness=.73;mat.roughness=.26;
      } else if(/metal|bodypaint|body.paint|paint/.test(name)){
        mat.metalness=.52;mat.roughness=.22;
        if('clearcoat' in mat){mat.clearcoat=.9;mat.clearcoatRoughness=.12;}
      } else if(/light|headlamp/.test(name)){
        mat.roughness=.2;
      }
      return mat;
    });
    o.material=Array.isArray(o.material)?result:result[0];
  });
}

export function decorateGarage3D(scene) {
  const world=new THREE.Group();world.name="ScraplineShowroomDecor";scene.add(world);
  const dark=m("#121b24",.72,.32), steel=m("#6b7f8d",.34,.65), tiles=m("#263843",.45,.25);
  const concrete=m("#344754",.92,.04), copper=m("#d99d4a",.28,.52), glass=m("#203646",.18,.3);
  box(world,[14,.18,15],[0,-.17,-.5],concrete);
  box(world,[14,5,.3],[0,2.45,-6.4],dark);
  for(const x of [-6.9,6.9]){
    box(world,[.3,5,14.5],[x,2.45,-.3],dark);
    for(const z of [-5,-2,1,4]){
      box(world,[.16,4.8,.16],[x,2.45,z],steel);
    }
  }
  for(const x of [-4.5,4.5]){
    box(world,[.22,5,.22],[x,2.5,-5],steel);
    box(world,[1.35,1.3,.75],[x,.7,-4.4],dark);
    box(world,[1.13,.12,.79],[x,1.4,-4.4],steel);
    for(const off of [-.25,.25]){
      box(world,[.25,.3,.05],[x+off,1,-3.98],glass);
    }
  }
  // Actual emissive ceiling tube fixtures and strip reflections.
  const tubeMat=new THREE.MeshBasicMaterial({color:0xe8f5ff,toneMapped:false});
  const glowMat=new THREE.MeshStandardMaterial({color:"#e9b56b",emissive:"#f6ac4e",emissiveIntensity:2});
  for(const z of [-3.2,0,3.2]){
    for(const x of [-3.2,0,3.2]){
      box(world,[1.65,.07,.13],[x,4.85,z],tubeMat);
    }
  }
  for(const x of [-5.6,5.6]){
    for(const z of [-4.8,-.5,3.7])box(world,[.04,2.1,.07],[x,2.3,z],glowMat);
  }
  // Painted service-bay floor guide lines and anti-slip workshop pads.
  const orange=new THREE.MeshBasicMaterial({color:"#b98b56"});
  for(const x of [-2.4,2.4])box(world,[.045,.005,4],[x,.005,0],orange);
  for(const z of [-2.4,2.4])box(world,[4.6,.004,.045],[0,.005,z],orange);
  const gridMat=new THREE.MeshStandardMaterial({map:decalTexture("tiles"),roughness:.55,metalness:.19});
  const drain=new THREE.Mesh(new THREE.PlaneGeometry(11,12),gridMat);
  drain.rotation.x=-Math.PI/2;drain.position.set(0,-.06,-.4);world.add(drain);
  // Tool wall with rails, shelves and distinct 3D objects.
  box(world,[5.2,2.15,.18],[0,2.1,-6.17],tiles);
  for(const y of [1.3,2,2.7]){
    box(world,[4.8,.07,.19],[0,y,-6.03],steel);
  }
  for(let i=0;i<13;i++){
    const x=-2.25+i*.38;
    const c=(i%4===0)?copper:steel;
    box(world,[.11,.47,.08],[x,2.45+(i%3)*.13,-5.87],c);
  }
  const labelMat=new THREE.MeshBasicMaterial({map:textSprite("SCRAPLINE"),side:THREE.DoubleSide});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.8,.95),labelMat);
  sign.position.set(0,3.7,-6.01);world.add(sign);
  const wheelMat=m("#171d24",1,0), rimMat=m("#a3b5c2",.3,.75);
  for(let i=0;i<3;i++){
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(.44,.15,10,25),wheelMat);
    wheel.position.set(5.6,.72+i*.95,-3.75);world.add(wheel);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.06,12),rimMat);
    cap.rotation.x=Math.PI/2;cap.position.set(5.6,.72+i*.95,-3.75);world.add(cap);
  }
  return world;
}

export function decorateTrack3D(track) {
  const world=new THREE.Group();world.name="DragStrip3DWorld";track.add(world);
  const tarmac=decalTexture("tarmac");tarmac.repeat.set(4,17);
  const asphalt=new THREE.MeshStandardMaterial({map:tarmac,roughness:.92,metalness:.02,polygonOffset:true,polygonOffsetFactor:-2});
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(11.25,116),asphalt);
  surface.rotation.x=-Math.PI/2;surface.position.set(0,.053,-18);world.add(surface);
  const grass=m("#51664c",.98), dry=m("#a29a70",1), steel=m("#a6b7c4",.4,.6),
    concrete=m("#9ea2a0",.9), dark=m("#19242a",.88), white=new THREE.MeshBasicMaterial({color:"#e3ecea"});
  for(const x of [-10,10]){
    const verge=new THREE.Mesh(new THREE.PlaneGeometry(6,125),grass);
    verge.rotation.x=-Math.PI/2;verge.position.set(x,.044,-20);world.add(verge);
    const edge=new THREE.Mesh(new THREE.PlaneGeometry(.4,116),concrete);
    edge.rotation.x=-Math.PI/2;edge.position.set(Math.sign(x)*5.95,.071,-18);world.add(edge);
    const dirt=new THREE.Mesh(new THREE.PlaneGeometry(2.7,119),dry);
    dirt.rotation.x=-Math.PI/2;dirt.position.set(Math.sign(x)*8.55,.045,-18);world.add(dirt);
    for(const z of [1,-11,-24,-37,-50,-63]){
      const banner=box(world,[.12,1.7,2.8],[Math.sign(x)*7.5,1.35,z],dark);
      banner.rotation.y=x>0?Math.PI/2:-Math.PI/2;
      const side=new THREE.Mesh(new THREE.PlaneGeometry(2.65,.85),
        new THREE.MeshBasicMaterial({map:textSprite(z===1?"START":z===-37?"FINISH":"SCRAPLINE"),side:THREE.DoubleSide}));
      side.rotation.y=x>0?Math.PI/2:-Math.PI/2;
      side.position.set(Math.sign(x)*7.42,1.8,z);world.add(side);
    }
  }
  // Roadside cones near the staging lanes.
  const coneMaterial=m("#dd6e27",.7), coneWhite=m("#fff8e7",.8);
  const coneGeo=new THREE.ConeGeometry(.21,.7,9);
  const coneMesh=new THREE.InstancedMesh(coneGeo,coneMaterial,28);
  const dummy=new THREE.Object3D();let ci=0;
  for(const sign of [-1,1])for(let n=0;n<14;n++){
    dummy.position.set(sign*5.35,.36,6-n*4);
    dummy.updateMatrix();coneMesh.setMatrixAt(ci++,dummy.matrix);
  }
  coneMesh.instanceMatrix.needsUpdate=true;world.add(coneMesh);
  // More substantial 3D pit lane garages near the start.
  for(const x of [-18,18]){
    box(world,[10,3.4,8],[x,1.7,2],dark);
    box(world,[10.6,.4,8.6],[x,3.6,2],steel);
    for(let j=0;j<3;j++){
      box(world,[2.6,2.3,.07],[x-3.2+j*3.2,1.3,-2.05],concrete);
      box(world,[2.6,.16,.13],[x-3.2+j*3.2,2.45,-2],m("#dca256",.45));
    }
  }
  // Spectator stands: stepped geometry, separated from race lanes.
  const stand=m("#788b99",.7,.35), seat=m("#2a4052",.78);
  for(const sign of [-1,1]){
    for(let row=0;row<4;row++){
      box(world,[1.8,.34,23],[sign*(12+row*1.8),.45+row*.46,-17],stand);
      box(world,[1.5,.12,23],[sign*(12+row*1.8),.69+row*.46,-17],seat);
    }
  }
  // Trees and grass beyond the barriers, using instancing on mobile.
  const trunkMat=m("#54453b",1), leafMat=m("#405f48",1);
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.1,.14,1.5,5),trunkMat,46);
  const canopies=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.93,0),leafMat,46);
  for(let i=0;i<46;i++){
    const side=i%2===0?-1:1,z=5-Math.floor(i/2)*3.6,x=side*(23+(i%4)*.9);
    dummy.position.set(x,.85,z);dummy.scale.set(1,1,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    dummy.position.set(x,2.15,z);dummy.scale.set(.8+(i%3)*.08,.9+(i%4)*.07,.8);dummy.updateMatrix();canopies.setMatrixAt(i,dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate=true;canopies.instanceMatrix.needsUpdate=true;world.add(trunks,canopies);
  // Mountain silhouettes are genuine low-poly geometry (not image backdrops).
  for(let i=0;i<11;i++){
    const x=-57+i*11;
    const mountain=new THREE.Mesh(new THREE.ConeGeometry(8+(i%3)*2,12+(i%4)*3,5),m(i%2?"#5e7071":"#697676",1));
    mountain.position.set(x,2.5,-75-(i%2)*5);world.add(mountain);
  }
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    vertexShader:`varying float h; void main(){h=position.y/110.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying float h;void main(){float p=clamp(h*.95+.4,0.0,1.0);vec3 horizon=vec3(.79,.70,.60);vec3 zenith=vec3(.26,.45,.65);gl_FragColor=vec4(mix(horizon,zenith,smoothstep(.02,.87,p)),1.0);}`
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(110,24,14),skyMat);
  sky.position.set(0,0,-15);world.add(sky);
  return world;
}
