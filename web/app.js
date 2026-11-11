import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DragRace } from "./race.js";

const $ = id => document.getElementById(id);
const container = $("viewport");
const loading = $("loading");
const loadingDetails = $("loading-details");
const modelTag = $("model-tag");
const modelNote = $("model-note");
const toast = $("toast");
const wheelsBtn = $("wheels-btn");
const lightsBtn = $("lights-btn");
const bonnetBtn = $("bonnet-btn");
const paints = [...document.querySelectorAll("[data-paint]")];
const loader = new GLTFLoader();
let renderer, scene, camera, controls, currentCar = null, bonnet = null, race = null;
let garageObjects = [];
let paintMaterials = [], wheelMaterials = [], lightPairs = [];
let paintColor = "#dfded8", wheelDark = false, fourLights = true, bonnetOpen = false;
let importedUserFile = false;
let toastTimer;

function message(text) {
  toast.textContent = text;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}
function setLoading(text) { loading.hidden = false; loading.style.display = "flex"; loadingDetails.textContent = text; }
function clearLoading() { loading.style.display = "none"; }
function init() {
  try {
    renderer = new THREE.WebGLRenderer({antialias: window.innerWidth > 520, alpha: true, powerPreference: "high-performance"});
  } catch (e) {
    clearLoading(); $("unsupported").hidden = false; console.error(e); return false;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, window.innerWidth < 700 ? 1.35 : 1.8));
  renderer.shadowMap.enabled = window.innerWidth >= 700;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#111c28");
  scene.fog = new THREE.Fog("#111c28", 9, 24);
  camera = new THREE.PerspectiveCamera(42, 1, 0.03, 120);
  camera.position.set(5.3, 2.65, 6.4);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.90, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3.1;
  controls.maxDistance = 10.5;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.enablePan = false;
  controls.update();
  const hemis = new THREE.HemisphereLight("#cfe7ff", "#5e6270", 2.1); scene.add(hemis);
  const key = new THREE.DirectionalLight("#fff4de", 4); key.position.set(3, 7, 4); scene.add(key);
  const rim = new THREE.DirectionalLight("#a2cbe5", 3.1); rim.position.set(-5, 5, -3); scene.add(rim);
  const warm = new THREE.PointLight("#e8aa6a", 45, 12); warm.position.set(4, 3, -4); scene.add(warm);
  const garageStart = scene.children.length;
  makeGarage();
  garageObjects = scene.children.slice(garageStart);
  race = new DragRace({scene,camera,controls,getCar:()=>currentCar,garageObjects,onNotice:message});
  const resize = () => {
    if (!renderer) return;
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    camera.aspect = w/h; camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  };
  window.addEventListener("resize", resize);
  resize();
  let last = 0;
  let previousFrame = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { previousFrame = now; return; }
    if (now - last < (window.innerWidth < 700 ? 33 : 16)) return;
    const dt = Math.min((now - previousFrame)/1000,0.08);
    previousFrame = now;
    last = now;
    if (race) race.tick(dt);
    controls.update(); renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  return true;
}
function makeGarage() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.MeshStandardMaterial({color:"#202b34",metalness:.28,roughness:.45}));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.025; scene.add(floor);
  const grid = new THREE.GridHelper(34,34,"#667581","#3c4b59"); grid.position.y = -.012; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.55,2.55,.055,72),new THREE.MeshStandardMaterial({color:"#34414b",metalness:.62,roughness:.33}));
  pad.position.y=-.012; scene.add(pad);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(2.52,.018,8,100),new THREE.MeshBasicMaterial({color:"#ad814d"}));
  torus.rotation.x=-Math.PI/2;torus.position.y=.025;scene.add(torus);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(20,7,.2),new THREE.MeshStandardMaterial({color:"#1e2934",roughness:.9}));
  wall.position.set(0,3,-7);scene.add(wall);
  for (const x of [-5.4,5.4]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(.32,5.8,.32),new THREE.MeshStandardMaterial({color:"#59626b",metalness:.65,roughness:.43}));
    pillar.position.set(x,2.85,-5.1);scene.add(pillar);
  }
  // Soft contact shadow is transparent and mobile-friendly (no expensive shadow map required).
  const shadowCanvas=document.createElement("canvas");shadowCanvas.width=128;shadowCanvas.height=128;
  const shadowContext=shadowCanvas.getContext("2d");
  if(shadowContext){const g=shadowContext.createRadialGradient(64,64,7,64,64,63);g.addColorStop(0,"rgba(0,0,0,.68)");g.addColorStop(.6,"rgba(0,0,0,.39)");g.addColorStop(1,"rgba(0,0,0,0)");shadowContext.fillStyle=g;shadowContext.fillRect(0,0,128,128);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4.9,2.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.046;scene.add(shadow);
  }
  for (const x of [-2.5,0,2.5]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5,.045,.15), new THREE.MeshBasicMaterial({color:"#d6e6eb"}));
    strip.position.set(x,4,-3.8);scene.add(strip);
  }
}
const key = "scrapline-garage-preferences";
function savePrefs() {try{localStorage.setItem(key,JSON.stringify({paintColor,wheelDark,fourLights}));}catch(e){}}
function loadPrefs() {
  try {const p=JSON.parse(localStorage.getItem(key)||"{}");paintColor=p.paintColor||paintColor;wheelDark=!!p.wheelDark;fourLights=p.fourLights!==false;}catch(e){}
  paints.forEach(el=>el.classList.toggle("active",el.dataset.paint===paintColor));
}
function setModel(model,title,custom) {
  if(currentCar) { scene.remove(currentCar); }
  currentCar = model;scene.add(currentCar);
  const b = new THREE.Box3().setFromObject(currentCar);
  if(b.isEmpty()) throw new Error("The model contains no visible geometry.");
  const size = b.getSize(new THREE.Vector3());
  const horizontal = Math.max(size.x,size.z);
  const scale = 4.15 / Math.max(0.01,horizontal);
  currentCar.scale.multiplyScalar(scale);
  const bounds = new THREE.Box3().setFromObject(currentCar);
  const center = bounds.getCenter(new THREE.Vector3());
  currentCar.position.set(-center.x,-bounds.min.y,-center.z);
  importedUserFile = custom;
  if(race && race.phase!=="garage") race.exit();
  modelTag.textContent=title;
  modelNote.textContent=custom?"YOUR MODEL • SAVED ON THIS DEVICE":"You can load your own Volkswagen .GLB";
  setupParts();
  applyCustomization();
  controls.target.set(0,1.0,0);controls.update();
  clearLoading();
}
function setupParts() {
  paintMaterials = [];wheelMaterials=[];lightPairs=[];bonnet=null;bonnetOpen=false;
  const paintsSeen = new Set(), wheelsSeen = new Set();
  currentCar.traverse(obj=>{
    if(!obj.isMesh)return;
    obj.frustumCulled = true;
    const mats = Array.isArray(obj.material)?obj.material:[obj.material];
    const changed = mats.map(m=>{
      if (!m) return m;
      const copy = m.clone();
      const materialName=(m.name||"").toLowerCase();
      const objectName=obj.name.toLowerCase();
      const isPaint= /bodypaint|body.paint|carpaint/.test(materialName) || (importedUserFile && materialName==="metal");
      const isWheel= /alloy|wheelhub|wheelout/.test(materialName+" "+objectName) || (importedUserFile && /^cylinder/.test(objectName));
      if(isPaint && copy.color){paintMaterials.push(copy);paintsSeen.add(copy);}
      if(isWheel && copy.color){wheelMaterials.push(copy);wheelsSeen.add(copy);}
      return copy;
    });
    obj.material=Array.isArray(obj.material)?changed:changed[0];
    const lower=obj.name.toLowerCase();
    if(lower==="bonnet"||lower==="hood") bonnet=obj;
    if(lower.startsWith("headlights2_")||lower.startsWith("headlights4_"))lightPairs.push(obj);
  });
  lightsBtn.disabled=lightPairs.length===0;
  if(!lightPairs.length)lightsBtn.textContent="FIXED LIGHTS";
  else lightsBtn.innerHTML=(fourLights?"4-LIGHT LOOK":"2-LIGHT LOOK")+" <span>↻</span>";
  bonnetBtn.disabled=!bonnet;
  bonnetBtn.innerHTML=bonnet?'OPEN BONNET <span>↗</span>':"PARTS SOON";
  wheelsBtn.disabled=wheelMaterials.length===0;
}
function applyCustomization() {
  const c=new THREE.Color(paintColor);
  paintMaterials.forEach(m=>m.color.copy(c));
  wheelMaterials.forEach(m=>m.color.set(wheelDark?"#252c35":"#aebbc7"));
  wheelsBtn.innerHTML=(wheelDark?"DARK ALLOY":"SILVER ALLOY")+" <span>↻</span>";
  lightPairs.forEach(o=>o.visible=o.name.toLowerCase().startsWith("headlights4_")?fourLights:!fourLights);
  if(lightPairs.length)lightsBtn.innerHTML=(fourLights?"4-LIGHT LOOK":"2-LIGHT LOOK")+" <span>↻</span>";
  savePrefs();
}
function focusView(view) {
  const distance = 6;
  const p = view==="front" ? [0,2.1,distance] : view==="rear" ? [0,2.1,-distance] : view==="side" ? [distance,2.1,0] : [3.2,7.6,3.2];
  camera.position.set(...p);controls.target.set(0,.95,0);controls.update();
  document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("selected",b.dataset.view===view));
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>focusView(b.dataset.view)));
paints.forEach(b=>b.addEventListener("click",()=>{paintColor=b.dataset.paint;paints.forEach(x=>x.classList.toggle("active",x===b));applyCustomization();}));
wheelsBtn.addEventListener("click",()=>{wheelDark=!wheelDark;applyCustomization();});
lightsBtn.addEventListener("click",()=>{if(!lightPairs.length){message("This model needs separately modeled light parts.");return;}fourLights=!fourLights;applyCustomization();});
bonnetBtn.addEventListener("click",()=>{if(!bonnet){message("Bonnet opening needs a separate 3D bonnet part.");return;}bonnetOpen=!bonnetOpen;bonnet.rotation.x += (bonnetOpen?-.9:.9);bonnetBtn.textContent=bonnetOpen?"CLOSE BONNET":"OPEN BONNET";});
function openDatabase() {
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window)){reject(new Error("Storage unavailable"));return;}
    const r=indexedDB.open("scrapline-car",1);
    r.onupgradeneeded=()=>r.result.createObjectStore("files");
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}
async function storeCar(blob) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("files","readwrite");
    tx.objectStore("files").put(blob,"volkswagen.glb");
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
  });
}
async function recoverCar() {
  try {
    const db=await openDatabase();
    const data=await new Promise((resolve,reject)=>{const tx=db.transaction("files","readonly");const req=tx.objectStore("files").get("volkswagen.glb");req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    db.close();return data||null;
  } catch(e){return null;}
}
async function parseBlob(blob,title) {
  const url=URL.createObjectURL(blob);
  try {const gltf=await loader.loadAsync(url);setModel(gltf.scene,title,true);}
  finally {URL.revokeObjectURL(url);}
}
$("model-file").addEventListener("change", async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.name.toLowerCase().endsWith(".glb")){message("Please select a .glb file.");return;}
  if(file.size>60*1024*1024){message("Please select a model smaller than 60 MB.");return;}
  setLoading("Importing your Volkswagen from your phone");
  try{
    await parseBlob(file,"YOUR UPLOADED VOLKSWAGEN");
    try{await storeCar(file);}catch(e){message("Car loaded; local saving wasn't available.");}
    message("Volkswagen model loaded and saved on this device.");
  }catch(err){clearLoading();console.error(err);message("Unable to open this GLB. Try another export.");}
  e.target.value="";
});
async function run() {
  loadPrefs();
  if(!init())return;
  const saved=await recoverCar();
  if(saved) {
    try {setLoading("Restoring your previously uploaded Volkswagen");await parseBlob(saved,"YOUR SAVED VOLKSWAGEN");return;}catch(e){console.warn(e);}
  }
  setLoading("Loading the garage car from GitHub");
  for (const [path,title] of [
    ["/game/assets/volkswagen_citi_golf.glb","VOLKSWAGEN IMPORTED MODEL"],
    ["/game/assets/scrapline_hatch.glb","SCRAPLINE GARAGE PROTOTYPE"]
  ]) {
    try {const gltf=await loader.loadAsync(path);setModel(gltf.scene,title,false);return;}catch(err){console.warn(path,err);}
  }
  clearLoading();
  $("unsupported").hidden=false;
  $("unsupported").querySelector("b").textContent="Could not load the car model";
  $("unsupported").querySelector("span").textContent="Try refreshing while connected to the internet.";
}
run().catch(e=>{console.error(e);clearLoading();$("unsupported").hidden=false;});
