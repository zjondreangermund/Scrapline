import * as THREE from "three";
import { decorateTrack3D } from "./world.js";

const QUARTER_MILE = 402.336;
const METERS_TO_WORLD = 0.093;
const GEAR_SPEEDS = [0, 48, 83, 119, 161, 214];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export class DragRace {
  constructor({scene,camera,controls,getCar,garageObjects,onNotice}) {
    this.scene=scene;this.camera=camera;this.controls=controls;
    this.getCar=getCar;this.garageObjects=garageObjects;this.notice=onNotice;
    this.track=new THREE.Group();this.track.visible=false;scene.add(this.track);
    this.buildTrack();
    this.bindUI();
    this.phase="garage";this.throttle=false;this.manual=false;this.gear=1;
    this.distance=0;this.speed=0;this.aiDistance=0;this.aiSpeed=0;
    this.best=this.getBest();
    this.renderBest();
    this.last=performance.now();
  }
  mesh(geo,material,x,y,z,parent=this.track) {
    const obj=new THREE.Mesh(geo,material);obj.position.set(x,y,z);parent.add(obj);return obj;
  }
  buildTrack() {
    const asphalt=new THREE.MeshStandardMaterial({color:0x20282c,roughness:0.89,metalness:0.05});
    const shoulders=new THREE.MeshStandardMaterial({color:0x313b3a,roughness:0.94});
    const lines=new THREE.MeshBasicMaterial({color:0xd7cc9e});
    const white=new THREE.MeshBasicMaterial({color:0xe6e8e3});
    const yellow=new THREE.MeshBasicMaterial({color:0xffb64c});
    const red=new THREE.MeshStandardMaterial({color:0xc92830,emissive:0x41090e,roughness:.58});
    this.mesh(new THREE.PlaneGeometry(120,140),shoulders,0,.012,-15).rotation.x=-Math.PI/2;
    this.mesh(new THREE.PlaneGeometry(12,118),asphalt,0,.02,-18).rotation.x=-Math.PI/2;
    for(const x of [-5.7,0,5.7]){
      this.mesh(new THREE.PlaneGeometry(.13,115),x===0?yellow:white,x,.035,-18).rotation.x=-Math.PI/2;
    }
    for(let z=5;z>=-38;z-=4) {
      const mark=this.mesh(new THREE.PlaneGeometry(.48,.1),new THREE.MeshBasicMaterial({color:0xb1b8b7}),-1.35,.039,z);mark.rotation.x=-Math.PI/2;
      const mark2=this.mesh(new THREE.PlaneGeometry(.48,.1),new THREE.MeshBasicMaterial({color:0xb1b8b7}),1.35,.039,z);mark2.rotation.x=-Math.PI/2;
    }
    // Starting and finish-line checkers.
    for(const z of [4,-(QUARTER_MILE*METERS_TO_WORLD)+4]) {
      for(let col=0;col<16;col++){
        const m=this.mesh(new THREE.PlaneGeometry(.72,.36),(col%2===0)?white:asphalt,-5.4+col*.72,.049,z);
        m.rotation.x=-Math.PI/2;
      }
    }
    // Guard rails and rhythm posts create speed cues without heavy geometry.
    const railMat=new THREE.MeshStandardMaterial({color:0xa9b7c2,metalness:.8,roughness:.3});
    const postMat=new THREE.MeshStandardMaterial({color:0x606e79,metalness:.6});
    for(const x of [-6.25,6.25]){
      this.mesh(new THREE.BoxGeometry(.15,.13,115),railMat,x,.48,-18);
      for(let z=6;z>=-74;z-=3) this.mesh(new THREE.BoxGeometry(.13,.8,.13),postMat,x,.34,z);
    }
    // Sunset floodlights on each side.
    for(const z of [1,-14,-29,-44,-59]){
      for(const x of [-10,10]){
        this.mesh(new THREE.CylinderGeometry(.09,.13,7.2,6),postMat,x,3.6,z);
        const lamp=this.mesh(new THREE.BoxGeometry(.85,.25,.45),new THREE.MeshBasicMaterial({color:0xcfe6ff}),x,7.2,z);
        const glow=new THREE.PointLight(0xc9deff,14,18,2);glow.position.set(x,6.7,z);this.track.add(glow);
      }
    }
    // Start tree. Three ambers then green.
    const treePost=this.mesh(new THREE.CylinderGeometry(.12,.14,4,8),postMat,7.15,2,2);
    this.treeBulbs=[];
    for(let i=0;i<4;i++){
      const bulb=this.mesh(new THREE.SphereGeometry(.19,12,8),new THREE.MeshStandardMaterial({color:i===3?0x09402b:0x503d17,emissive:i===3?0x052418:0x201006,emissiveIntensity:.8}),7.15,3.28-i*.62,1.9);
      this.treeBulbs.push(bulb);
    }
    this.finishBanner=this.mesh(new THREE.BoxGeometry(12,.5,.4),new THREE.MeshStandardMaterial({color:0x171f26,roughness:.45}),0,5.2,4-QUARTER_MILE*METERS_TO_WORLD);
    for(const x of [-5.8,5.8]){
      this.mesh(new THREE.BoxGeometry(.2,5.3,.2),postMat,x,2.65,4-QUARTER_MILE*METERS_TO_WORLD);
    }
    decorateTrack3D(this.track);
  }
  bindUI() {
    const $=id=>document.getElementById(id);
    this.ui={garage:$("garage-ui"),race:$("race-ui"),raceBtn:$("race-start"),back:$("back-garage"),reset:$("reset-race"),throttle:$("throttle"),shift:$("shift"),gear:$("gear-value"),rpm:$("rpm-value"),speed:$("speed-value"),distance:$("distance-value"),timer:$("race-timer"),signal:$("race-signal"),opponent:$("opponent-progress"),player:$("player-progress"),result:$("race-result"),best:$("best-time"),auto:$("auto-shift"),hud:$("race-hud")};
    this.ui.raceBtn.addEventListener("click",()=>this.enter());
    this.ui.back.addEventListener("click",()=>this.exit());
    this.ui.reset.addEventListener("click",()=>this.enter());
    const th=this.ui.throttle;
    const release=()=>{this.throttle=false;th.classList.remove("pressed")};
    th.addEventListener("pointerdown",event=>{event.preventDefault();th.setPointerCapture(event.pointerId);this.throttle=true;th.classList.add("pressed");});
    th.addEventListener("pointerup",release);th.addEventListener("pointercancel",release);th.addEventListener("lostpointercapture",release);
    this.ui.shift.addEventListener("click",()=>this.shift());
    this.ui.auto.addEventListener("change",e=>{this.manual=!e.target.checked;this.ui.shift.disabled=!this.manual;this.ui.shift.textContent=this.manual?"SHIFT UP":"AUTO SHIFT";});
    this.ui.shift.disabled=true;
    window.addEventListener("keydown",e=>{
      if(this.phase==="garage")return;
      if(["Space","ArrowUp"].includes(e.code)){e.preventDefault();this.throttle=true;th.classList.add("pressed");}
      if((e.code==="KeyE"||e.code==="ShiftLeft")&&!e.repeat){e.preventDefault();this.shift();}
      if(e.code==="Escape")this.exit();
    });
    window.addEventListener("keyup",e=>{if(["Space","ArrowUp"].includes(e.code)){release();}});
    window.addEventListener("blur",release);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)release();});
  }
  getBest() {try{return Number(localStorage.getItem("scrapline-best-quarter-mile"))||0;}catch{return 0;}}
  saveBest(t){if(this.best===0||t<this.best){this.best=t;try{localStorage.setItem("scrapline-best-quarter-mile",String(t));}catch{}}this.renderBest();}
  renderBest(){this.ui.best.textContent=this.best?this.best.toFixed(2)+"s":"--.--";}
  enter() {
    const source=this.getCar();
    if(!source){this.notice("Load your car before racing.");return;}
    if(this.player){this.track.remove(this.player);this.track.remove(this.aiCar);}
    this.player=new THREE.Group();this.aiCar=new THREE.Group();
    for(const [group,x] of [[this.player,-2.85],[this.aiCar,2.85]]){
      const clone=source.clone(true);
      clone.visible=true;
      // Shallow clone preserves source model shape/materials, but separates animation transforms.
      clone.rotation.y+=Math.PI;
      group.add(clone);group.position.set(x,0,4);this.track.add(group);
    }
    this.aiCar.traverse(o=>{
      if(o.isMesh && o.material){
        const tint=m=>{const n=m.clone();if(n.color&&/(bodypaint|metal|carpaint)/i.test(m.name||""))n.color.set("#ad2639");return n;};
        o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);
      }
    });
    if(this.phase==="garage") this.previousFog=this.scene.fog;
    this.scene.fog=new THREE.FogExp2("#8494a2",0.011);
    if(this.phase==="garage") this.previousBackground=this.scene.background;
    this.scene.background=new THREE.Color("#849ab2");
    if(this.phase==="garage") this.previousFov=this.camera.fov;
    this.camera.fov=67;this.camera.updateProjectionMatrix();
    this.phase="countdown";this.countdown=3.75;this.elapsed=0;this.distance=0;this.speed=0;this.aiDistance=0;this.aiSpeed=0;this.gear=1;this.throttle=false;this.aiReaction=.28+Math.random()*.3;this.aiGear=1;this.aiElapsed=0;this.finishTime=0;this.aiFinishTime=0;
    this.ui.throttle.classList.remove("pressed");
    this.ui.result.hidden=true;this.ui.race.hidden=false;
    document.body.classList.add("in-race");this.controls.enabled=false;
    this.garageObjects.forEach(o=>o.visible=false);this.getCar().visible=false;this.track.visible=true;
    this.treeBulbs.forEach(b=>b.material.emissive.set("#25140b"));
    this.ui.signal.textContent="STAGING";this.ui.signal.dataset.signal="staging";this.ui.signal.style.opacity="1";
    this.ui.player.style.width="0%";this.ui.opponent.style.width="0%";
    this.ui.timer.textContent="0.00";this.ui.speed.textContent="0";this.ui.distance.textContent="0";this.ui.gear.textContent="1";this.ui.rpm.textContent="1100";
    this.last=performance.now();this.frameCamera(0.03);this.notice("Hold THROTTLE on green. Shift manually or use AUTO.");
  }
  exit(){
    this.phase="garage";this.throttle=false;this.ui.race.hidden=true;document.body.classList.remove("in-race");
    this.track.visible=false;
    if(this.previousFog)this.scene.fog=this.previousFog;
    if(this.previousBackground)this.scene.background=this.previousBackground;
    this.camera.fov=this.previousFov||42;this.camera.updateProjectionMatrix();
    this.garageObjects.forEach(o=>o.visible=true);
    if(this.getCar())this.getCar().visible=true;
    this.controls.enabled=true;
    this.camera.position.set(...(window.innerWidth<700?[6.9,3.2,9.5]:[5.3,2.65,6.4]));
    this.controls.target.set(0,window.innerWidth<700?.35:.90,0);this.controls.update();
  }
  shift(){
    if(!this.manual||this.phase!=="running"||this.gear>=5)return;
    this.gear++;this.notice("GEAR "+this.gear);
  }
  stepPhysics(speed,gear,dt,throttle,ai=false) {
    const kmh=speed*3.6;
    const upper=GEAR_SPEEDS[gear]||220;
    const lower=GEAR_SPEEDS[gear-1]||0;
    const rpm=clamp(1100+(kmh-lower)/(upper-lower)*5600,900,7800);
    if(ai && kmh>upper*.92&&gear<5)gear++;
    if(!ai&&!this.manual&&kmh>upper*.92&&gear<5)gear++;
    const inBand = kmh<upper*1.04;
    const output=throttle?Math.max(1.4,5.5-0.045*speed)*(inBand?1:.48):0;
    const drag=.0025*speed*speed;
    const rolling=.20;
    const next=Math.max(0,speed+(output-drag-rolling-(throttle?0:1.1))*dt);
    return {speed:next,gear,rpm};
  }
  tick(dt) {
    if(this.phase==="garage")return;
    dt=clamp(dt,0,0.08);
    if(this.phase==="countdown"){
      this.countdown-=dt;
      const n=Math.ceil(this.countdown);
      this.treeBulbs.forEach((b,i)=>b.material.emissive.set(i===3?0x072b15:(n<=3-i&&n>0?0xff9d18:0x281a0b)));
      if(this.countdown<=0){
        this.phase="running";this.ui.signal.textContent="GO!";this.ui.signal.dataset.signal="go";
        this.treeBulbs[3].material.emissive.set(0x00e35e);
      }else{
        this.ui.signal.textContent=n>3?"READY":String(n);
        this.ui.signal.dataset.signal=n>3?"staging":"amber";
      }
      this.frameCamera(dt);
      return;
    }
    if(this.phase==="complete")return;
    this.elapsed+=dt;
    if(this.elapsed>1.2)this.ui.signal.style.opacity="0";
    if(!this.finishTime){
      const p=this.stepPhysics(this.speed,this.gear,dt,this.throttle);
      this.speed=p.speed;this.gear=p.gear;
      this.distance+=this.speed*dt;
      this.ui.rpm.textContent=String(Math.round(p.rpm/100)*100);
      if(this.distance>=QUARTER_MILE){
        const over=this.distance-QUARTER_MILE;
        this.finishTime=this.elapsed-over/Math.max(this.speed,1);
        this.distance=QUARTER_MILE;
      }
    }
    if(!this.aiFinishTime && this.elapsed>this.aiReaction){
      this.aiElapsed+=dt;
      const a=this.stepPhysics(this.aiSpeed,this.aiGear,dt,true,true);
      this.aiSpeed=a.speed;this.aiGear=a.gear;this.aiDistance+=this.aiSpeed*dt;
      if(this.aiDistance>=QUARTER_MILE){
        const over=this.aiDistance-QUARTER_MILE;
        this.aiFinishTime=this.elapsed-over/Math.max(this.aiSpeed,1);
        this.aiDistance=QUARTER_MILE;
      }
    }
    this.player.position.z=4-this.distance*METERS_TO_WORLD;
    this.aiCar.position.z=4-this.aiDistance*METERS_TO_WORLD;
    this.ui.speed.textContent=String(Math.round(this.speed*3.6));
    this.ui.distance.textContent=String(Math.floor(this.distance));
    this.ui.timer.textContent=(this.finishTime||this.elapsed).toFixed(2);
    this.ui.gear.textContent=String(this.gear);
    this.ui.player.style.width=clamp(this.distance/QUARTER_MILE*100,0,100)+"%";
    this.ui.opponent.style.width=clamp(this.aiDistance/QUARTER_MILE*100,0,100)+"%";
    this.frameCamera(dt);
    if(this.finishTime && this.aiFinishTime)this.complete();
    // Allow player to stop after finishing while AI catches up.
    if(this.finishTime&&this.elapsed-this.finishTime>12)this.complete();
  }
  frameCamera(dt){
    const z=this.player?.position.z||4;
    const target=new THREE.Vector3(-2.6,1.05,z-3.1);
    const speedFactor=clamp(this.speed/55,0,1);
    const desired=new THREE.Vector3(-1.25,2.55+speedFactor*.18,z+8.4+speedFactor*2);
    const smoothing=1-Math.exp(-Math.max(.01,dt)*6.5);
    this.camera.position.lerp(desired,smoothing);
    this.camera.lookAt(target);
  }
  complete(){
    if(this.phase==="complete")return;
    this.phase="complete";this.throttle=false;
    this.ui.throttle.classList.remove("pressed");
    if(this.finishTime)this.saveBest(this.finishTime);
    const playerWon=!!this.finishTime&&(!this.aiFinishTime||this.finishTime<this.aiFinishTime);
    const headline=this.finishTime?(playerWon?"YOU WIN!":"RACE COMPLETE"):"RACE ENDED";
    this.ui.result.hidden=false;
    this.ui.result.querySelector("[data-result-title]").textContent=headline;
    this.ui.result.querySelector("[data-result-player]").textContent=this.finishTime?this.finishTime.toFixed(2)+"s":"DNF";
    this.ui.result.querySelector("[data-result-ai]").textContent=this.aiFinishTime?this.aiFinishTime.toFixed(2)+"s":"DNF";
  }
}
