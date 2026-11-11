import * as THREE from "three";
import { decorateTrack3D, buildStripBuildings } from "./world.js";
import { QUARTER_MILE, PERFECT_SHIFT_MIN, PERFECT_SHIFT_MAX, newVehicle, beginLaunch, shift, advanceVehicle } from "./racePhysics.js";
import { RaceAudio } from "./raceAudio.js";

// Explicit scene units. Every metre raced moves the actual 3D vehicle 0.18 world units.
const METERS_TO_WORLD=0.18;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export class DragRace {
  constructor({scene,camera,controls,getCar,garageObjects,onNotice}) {
    Object.assign(this,{scene,camera,controls,getCar,garageObjects,notice:onNotice});
    this.track=new THREE.Group();
    this.track.name="ScraplineDragStrip";
    this.track.visible=false;
    scene.add(this.track);
    this.makeTrack();
    this.ui={};
    this.audio=new RaceAudio();
    this.phase="garage";
    this.throttle=false;
    this.manual=false;
    this.cameraMode="chase";
    this.cameraDistance=9.0;
    this.cameraHeight=2.8;
    this.cameraYaw=.14;
    this.cameraPitch=0;
    this.contacts=new Map();
    this.smoke=[];
    this.best=this.getBest();
    this.bindUI();
    this.renderBest();
  }
  object(geometry,material,x,y,z) {
    const obj=new THREE.Mesh(geometry,material);
    obj.position.set(x,y,z);this.track.add(obj);return obj;
  }
  makeTrack() {
    const asphalt=new THREE.MeshStandardMaterial({color:0x252c32,roughness:.86});
    const grass=new THREE.MeshStandardMaterial({color:0x475344,roughness:1});
    const white=new THREE.MeshBasicMaterial({color:0xf3f0dd});
    const gold=new THREE.MeshBasicMaterial({color:0xdcb45e});
    const silver=new THREE.MeshStandardMaterial({color:0xc2cdd1,roughness:.3,metalness:.76});
    const metal=new THREE.MeshStandardMaterial({color:0x566b77,roughness:.62,metalness:.42});
    const far=106;
    const courseZ=4-QUARTER_MILE*METERS_TO_WORLD;
    const earth=this.object(new THREE.PlaneGeometry(240,220),grass,0,-.02,-60);earth.rotation.x=-Math.PI/2;
    const road=this.object(new THREE.PlaneGeometry(12,195),asphalt,0,.02,-65);road.rotation.x=-Math.PI/2;
    for(const x of [-5.65,0,5.65]){
      const line=this.object(new THREE.PlaneGeometry(.1,192),x===0?gold:white,x,.04,-65);
      line.rotation.x=-Math.PI/2;
    }
    for(let z=5;z>-95;z-=4){
      for(const x of [-2.8,2.8]){
        const marking=this.object(new THREE.PlaneGeometry(.10,1.65),white,x,.06,z);
        marking.rotation.x=-Math.PI/2;
      }
    }
    // Start/finish stripes are painted ON the actual road, at real quarter-mile positions.
    for(const z of [4,courseZ]){
      for(let x=-5.5;x<5.5;x+=.55){
        const check=this.object(new THREE.PlaneGeometry(.55,.55),Math.round((x+5.5)/.55)%2===0?white:asphalt,x,.075,z);
        check.rotation.x=-Math.PI/2;
      }
    }
    // Barriers and visible roadside motion cues.
    for(const x of [-6.2,6.2]){
      this.object(new THREE.BoxGeometry(.17,.2,186),silver,x,.52,-65);
      for(let z=8;z>-100;z-=3.2)
        this.object(new THREE.BoxGeometry(.14,.88,.14),metal,x,.44,z);
    }
    this.treeBulbs=[];
    this.object(new THREE.CylinderGeometry(.10,.13,3.7,10),metal,7.35,1.85,2.4);
    for(let n=0;n<4;n++){
      const mat=new THREE.MeshStandardMaterial({color:n===3?0x0c4b28:0x56360c,emissive:0x0d110c,emissiveIntensity:1.5});
      this.treeBulbs.push(this.object(new THREE.SphereGeometry(.18,14,10),mat,7.35,3.25-n*.55,2.3));
    }
    this.object(new THREE.BoxGeometry(12,.5,.45),metal,0,5.1,courseZ);
    for(const x of [-5.8,5.8])
      this.object(new THREE.BoxGeometry(.22,5,.22),silver,x,2.5,courseZ);
    decorateTrack3D(this.track);
    buildStripBuildings(this.track);
    const sunlight=new THREE.DirectionalLight(0xffdfba,1.1);sunlight.position.set(10,12,-15);this.track.add(sunlight);
    const warm=new THREE.HemisphereLight(0xdbebfb,0x59605b,.7);this.track.add(warm);
  }
  bindUI() {
    const $=id=>document.getElementById(id);
    for(const [key,id] of Object.entries({race:"race-ui",raceBtn:"race-start",back:"back-garage",reset:"reset-race",
      throttle:"throttle",shift:"shift",auto:"auto-shift",rpm:"rpm-value",speed:"speed-value",
      gear:"gear-value",timer:"race-timer",distance:"distance-value",signal:"race-signal",
      opponent:"opponent-progress",player:"player-progress",result:"race-result",
      best:"best-time",camera:"camera-mode",tach:"tach-needle",tachReadout:"tach-readout",
      tachHint:"shift-hint",mute:"sound-toggle",zoom:"camera-zoom",height:"camera-height"})){
      this.ui[key]=$(id);
    }
    this.ui.raceBtn.addEventListener("click",()=>this.enter());
    this.ui.back.addEventListener("click",()=>this.exit());
    this.ui.reset.addEventListener("click",()=>this.enter());
    this.ui.camera.addEventListener("click",()=>{
      const modes=["chase","side","hood","cinematic"];
      this.cameraMode=modes[(modes.indexOf(this.cameraMode)+1)%modes.length];
      this.ui.camera.textContent="CAMERA: "+this.cameraMode.toUpperCase()+" ↻";
    });
    this.ui.zoom.addEventListener("input",e=>{this.cameraDistance=Number(e.target.value)});
    this.ui.height.addEventListener("input",e=>{this.cameraHeight=Number(e.target.value)});
    this.ui.mute.addEventListener("click",()=>{
      this.audio.muted=!this.audio.muted;
      if(!this.audio.muted)this.audio.unlock();
      this.ui.mute.textContent=this.audio.muted?"SOUND OFF":"SOUND ON";
    });
    const th=this.ui.throttle;
    const press=event=>{
      event?.preventDefault();
      if(event?.pointerId!=null && th.setPointerCapture)th.setPointerCapture(event.pointerId);
      this.audio.unlock();
      this.throttle=true;th.classList.add("pressed");
      if(this.phase==="countdown")this.earlyThrottle=true;
      else if(this.phase==="running"&&!this.playerVehicle.started){
        const reaction=this.elapsed;
        this.launch(reaction<=.28?"perfect":"late");
      }
    };
    const release=()=>{this.throttle=false;th.classList.remove("pressed")};
    th.addEventListener("pointerdown",press);
    th.addEventListener("pointerup",release);
    th.addEventListener("pointercancel",release);
    th.addEventListener("lostpointercapture",release);
    this.ui.shift.addEventListener("click",()=>this.shiftGear());
    this.ui.auto.addEventListener("change",e=>{
      this.manual=!e.target.checked;this.ui.shift.disabled=!this.manual;
      this.ui.shift.textContent=this.manual?"SHIFT ▲":"AUTO";
    });
    this.ui.shift.disabled=true;
    window.addEventListener("keydown",e=>{
      if(this.phase==="garage")return;
      if(["ArrowUp","Space"].includes(e.code)){
        e.preventDefault();if(!e.repeat)press();
      }
      if(["KeyE","ShiftLeft"].includes(e.code)&&!e.repeat){e.preventDefault();this.shiftGear();}
      if(e.code==="Escape")this.exit();
    });
    window.addEventListener("keyup",e=>{if(["ArrowUp","Space"].includes(e.code))release()});
    window.addEventListener("blur",release);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)release()});
    // On the uncovered 3D canvas, one-finger drag adjusts the chase angle.
    // Two fingers pinch the follow distance.
    const canvas=this.controls.domElement;
    canvas.addEventListener("pointerdown",e=>{
      if(this.phase==="garage")return;
      this.contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    });
    canvas.addEventListener("pointermove",e=>{
      if(this.phase==="garage"||!this.contacts.has(e.pointerId))return;
      const before=this.contacts.get(e.pointerId);
      const oldPinch=this.pinchDistance();
      this.contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.contacts.size===1){
        this.cameraYaw=clamp(this.cameraYaw+(e.clientX-before.x)*.005,-.75,.75);
        this.cameraPitch=clamp(this.cameraPitch-(e.clientY-before.y)*.012,-1.2,2.3);
      }else if(this.contacts.size===2){
        const next=this.pinchDistance();
        this.cameraDistance=clamp(this.cameraDistance+(oldPinch-next)*.023,5,15);
        this.ui.zoom.value=String(this.cameraDistance);
      }
    });
    const end=e=>this.contacts.delete(e.pointerId);
    canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
  }
  pinchDistance() {
    const p=[...this.contacts.values()];
    return p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;
  }
  getBest(){try{return Number(localStorage.getItem("scrapline-best-quarter-mile"))||0}catch{return 0}}
  renderBest(){this.ui.best.textContent=this.best?this.best.toFixed(2)+"s":"--.--"}
  saveBest(time) {
    if(this.best>0 && time>=this.best)return;
    this.best=time;try{localStorage.setItem("scrapline-best-quarter-mile",String(time))}catch{}
    this.renderBest();
  }
  enter() {
    const source=this.getCar();
    if(!source){this.notice("Choose a Golf first.");return;}
    this.audio.unlock();
    if(this.player) {this.track.remove(this.player);this.track.remove(this.aiCar);}
    this.player=this.cloneCar(source,-2.85);
    this.aiCar=this.cloneCar(source,2.85);
    this.playerWheels=this.findWheels(this.player);
    this.aiWheels=this.findWheels(this.aiCar);
    // Independent AI body colour; never mutate saved garage paint.
    this.aiCar.traverse(obj=>{
      if(!obj.isMesh)return;
      const materials=Array.isArray(obj.material)?obj.material:[obj.material];
      const m2=materials.map(m=>{
        if(!m)return m;
        const cloned=m.clone();
        if(cloned.color && /bodypaint|carpaint|metal|paint/i.test(m.name||""))
          cloned.color.set("#b82036");
        return cloned;
      });
      obj.material=Array.isArray(obj.material)?m2:m2[0];
    });
    if(this.phase==="garage"){
      this.previousFog=this.scene.fog;
      this.previousBackground=this.scene.background;
      this.previousFov=this.camera.fov;
    }
    this.scene.fog=new THREE.FogExp2("#7d96ad",.007);
    this.scene.background=new THREE.Color("#6f92b1");
    this.playerVehicle=newVehicle(1);
    this.aiVehicle=newVehicle(.94+Math.random()*.10);
    this.aiDelay=.30+Math.random()*.28;
    this.phase="countdown";this.countdown=3.2;this.elapsed=0;this.throttle=false;
    this.earlyThrottle=false;this.finishTime=0;this.aiFinishTime=0;
    this.smoke.forEach(p=>this.track.remove(p.mesh));this.smoke=[];
    this.ui.throttle.classList.remove("pressed");
    this.ui.race.hidden=false;this.ui.result.hidden=true;this.ui.signal.style.opacity="1";
    this.ui.signal.dataset.signal="staging";this.ui.signal.textContent="WATCH THE LIGHTS";
    this.ui.player.style.width="0%";this.ui.opponent.style.width="0%";
    this.ui.timer.textContent="0.00";this.ui.speed.textContent="0";
    this.ui.distance.textContent="0";this.ui.gear.textContent="1";
    this.ui.rpm.textContent="1100";
    this.ui.camera.textContent="CAMERA: "+this.cameraMode.toUpperCase()+" ↻";
    this.ui.zoom.value=String(this.cameraDistance);this.ui.height.value=String(this.cameraHeight);
    this.garageObjects.forEach(o=>o.visible=false);
    this.getCar().visible=false;
    this.track.visible=true;this.controls.enabled=false;
    document.body.classList.add("in-race");
    this.treeBulbs.forEach(b=>b.material.emissive.set("#231509"));
    this.updateGauge(1100);
    this.frameCamera(.5,true);
    this.notice("Press the throttle as GREEN appears for a perfect launch!");
  }
  cloneCar(source,x){
    const car=new THREE.Group();
    const pivot=new THREE.Group();
    const clone=source.clone(true);
    clone.visible=true;
    // Preserve GLB's normalized transform; rotate the enclosing pivot only.
    pivot.rotation.y=Math.PI;
    pivot.add(clone);car.add(pivot);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,28),new THREE.MeshBasicMaterial({
      color:0x101319,transparent:true,opacity:.42,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.2,2.5,1);
    shadow.position.y=.08;car.add(shadow);
    car.position.set(x,0,4);this.track.add(car);
    return car;
  }
  findWheels(vehicle){
    const wheels=[];
    vehicle.traverse(node=>{
      if(!node.isMesh && /^Tire(?:\.\d+)?$/i.test(node.name||""))
        wheels.push(node);
    });
    return wheels;
  }
  exit(){
    this.phase="garage";this.throttle=false;
    this.ui.race.hidden=true;document.body.classList.remove("in-race");
    this.track.visible=false;this.audio.stop();
    if(this.previousFog)this.scene.fog=this.previousFog;
    if(this.previousBackground)this.scene.background=this.previousBackground;
    this.camera.fov=this.previousFov||42;this.camera.updateProjectionMatrix();
    this.garageObjects.forEach(o=>o.visible=true);
    if(this.getCar())this.getCar().visible=true;
    this.controls.enabled=true;
    this.camera.position.set(...(window.innerWidth<700?[6.9,3.2,9.5]:[5.3,2.65,6.4]));
    this.controls.target.set(0,window.innerWidth<700?.35:.90,0);
    this.controls.update();
  }
  launch(kind){
    if(this.playerVehicle.started)return;
    beginLaunch(this.playerVehicle,kind);
    this.audio.chirp(kind==="perfect");
    if(kind==="perfect"){this.showSignal("PERFECT LAUNCH!","go");}
    else if(kind==="spin"){this.showSignal("WHEELSPIN!","spin");}
    else {this.showSignal("SLOW REACTION","late");}
    this.notice(kind==="perfect"?"Perfect grip!":kind==="spin"?"Wheelspin — traction lost.":"Late launch.");
    this.launchMessageUntil=this.elapsed+1.25;
  }
  showSignal(message,type) {
    this.ui.signal.textContent=message;this.ui.signal.dataset.signal=type;
    this.ui.signal.style.opacity="1";
  }
  shiftGear(){
    if(!this.manual||this.phase!=="running"||!this.playerVehicle.started)return;
    const q=shift(this.playerVehicle,true);
    if(q==="perfect"){
      this.showSignal("PERFECT SHIFT!","go");this.launchMessageUntil=this.elapsed+.75;
      this.notice("Perfect shift — boost!");
    }else if(q!=="max") {
      this.ui.tachHint.textContent=q==="early"?"EARLY SHIFT":q==="late"?"LATE SHIFT":"SHIFT!";
    }
  }
  updateGauge(rpm) {
    const ratio=clamp(rpm/8000,0,1);
    const angle=-128+ratio*256;
    this.ui.tach.style.transform="translateX(-50%) rotate("+angle.toFixed(1)+"deg)";
    this.ui.tachReadout.textContent=(rpm/1000).toFixed(1);
    const perfect=rpm>=PERFECT_SHIFT_MIN&&rpm<=PERFECT_SHIFT_MAX;
    this.ui.tachHint.textContent=perfect?"PERFECT SHIFT":rpm>7000?"SHIFT NOW":rpm<2600?"BUILD REVS":"POWER BAND";
    this.ui.tachHint.dataset.zone=perfect?"perfect":rpm>7000?"late":"normal";
  }
  makeSmoke(amount=1) {
    for(let j=0;j<amount;j++){
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(.22+Math.random()*.2,7,5),
        new THREE.MeshBasicMaterial({color:0xb6bfc4,transparent:true,opacity:.22,depthWrite:false}));
      mesh.position.set(this.player.position.x+(Math.random()-.5)*1.6,.22,this.player.position.z+1+Math.random()*1.1);
      this.track.add(mesh);this.smoke.push({mesh,life:0});
    }
  }
  tick(dt){
    if(this.phase==="garage")return;
    dt=clamp(dt,0,.05);
    if(this.phase==="countdown"){
      this.countdown-=dt;
      const n=Math.ceil(this.countdown);
      this.treeBulbs.forEach((bulb,i)=>{
        const active=i<3 && n<=3-i && n>0;
        bulb.material.emissive.set(active?"#ffae18":"#27180d");
      });
      const preRpm=this.throttle?4500:1200;
      this.updateGauge(preRpm);this.ui.rpm.textContent=String(preRpm);
      this.audio.tick(preRpm,this.throttle?1:.1,true);
      if(this.countdown<=0){
        this.phase="running";
        this.treeBulbs[3].material.emissive.set("#21ff71");
        this.showSignal("GO!","go");
        if(this.throttle)this.launch("spin");
      }else this.showSignal(n===4?"STAGE":n===3?"3":n===2?"2":"1","staging");
      this.frameCamera(dt);
      return;
    }
    if(this.phase==="complete"){this.audio.stop();return;}
    this.elapsed+=dt;
    if(this.ui.signal.style.opacity!=="0" && this.elapsed>(this.launchMessageUntil||1.1))
      this.ui.signal.style.opacity="0";
    const p=this.playerVehicle;
    const a=this.aiVehicle;
    const previousP=p.distance, previousA=a.distance;
    if(p.started&&!this.finishTime){
      advanceVehicle(p,dt,this.throttle?1:0,!this.manual);
      if(p.spinLeft>0&&Math.random()<.28)this.makeSmoke(1);
      if(p.distance>=QUARTER_MILE){
        const overshoot=p.distance-QUARTER_MILE;
        this.finishTime=this.elapsed-overshoot/Math.max(1,p.speed);
        p.distance=QUARTER_MILE;
      }
    }
    if(this.elapsed>=this.aiDelay&&!a.started)beginLaunch(a,Math.random()<.23?"spin":"perfect");
    if(a.started&&!this.aiFinishTime){
      advanceVehicle(a,dt,1,true);
      if(a.distance>=QUARTER_MILE){
        this.aiFinishTime=this.elapsed-(a.distance-QUARTER_MILE)/Math.max(1,a.speed);
        a.distance=QUARTER_MILE;
      }
    }
    this.player.position.z=4-p.distance*METERS_TO_WORLD;
    this.aiCar.position.z=4-a.distance*METERS_TO_WORLD;
    // Individual 3D tire groups rotate with true vehicle speed, with extra spin
    // when traction is lost at the starting line.
    const playerRotation=(p.speed/.30+(p.spinLeft>0?24:0))*dt;
    const aiRotation=(a.speed/.30+(a.spinLeft>0?18:0))*dt;
    for(const wheel of this.playerWheels)wheel.rotateZ(playerRotation);
    for(const wheel of this.aiWheels)wheel.rotateZ(aiRotation);
    // Gentle acceleration pitch / bounce conveys motion while staying stable on phones.
    this.player.rotation.x=clamp((p.speed-(p.previousSpeed||0))*2.2,-.045,.045);
    p.previousSpeed=p.speed;
    for(const particle of this.smoke){
      particle.life+=dt;particle.mesh.position.y+=dt*.42;
      particle.mesh.position.z+=dt*.5;
      particle.mesh.scale.multiplyScalar(1+dt*.8);
      particle.mesh.material.opacity=Math.max(0,.25-particle.life*.2);
    }
    for(let i=this.smoke.length-1;i>=0;i--){
      if(this.smoke[i].life>1.25){this.track.remove(this.smoke[i].mesh);this.smoke.splice(i,1);}
    }
    this.updateGauge(p.rpm);
    this.ui.rpm.textContent=String(Math.round(p.rpm));
    this.ui.speed.textContent=String(Math.round(p.speed*3.6));
    this.ui.gear.textContent=String(p.gear);
    this.ui.timer.textContent=(this.finishTime||this.elapsed).toFixed(2);
    this.ui.distance.textContent=String(Math.floor(p.distance));
    this.ui.player.style.width=(p.distance/QUARTER_MILE*100).toFixed(2)+"%";
    this.ui.opponent.style.width=(a.distance/QUARTER_MILE*100).toFixed(2)+"%";
    this.audio.tick(p.started?p.rpm:this.throttle?3500:1100,this.throttle?1:.2,true);
    this.frameCamera(dt);
    if(this.finishTime&&this.aiFinishTime)this.finish();
    if(this.finishTime&&this.elapsed-this.finishTime>7)this.finish();
    if(this.aiFinishTime&&!p.started&&this.elapsed-this.aiFinishTime>3)this.finish();
  }
  frameCamera(dt,teleport=false){
    if(!this.player)return;
    const z=this.player.position.z, x=this.player.position.x;
    const speed=this.playerVehicle?.speed||0;
    const y=this.cameraHeight+this.cameraPitch;
    const distance=this.cameraDistance+clamp(speed/30,0,1)*1.5;
    let target=new THREE.Vector3(x,.95,z-2.7);
    let desired;
    if(this.cameraMode==="side") desired=new THREE.Vector3(x+distance,y,z+2.2);
    else if(this.cameraMode==="hood"){
      desired=new THREE.Vector3(x,1.45,z-1.3);target=new THREE.Vector3(x,1.3,z-15);
    }
    else if(this.cameraMode==="cinematic"){
      desired=new THREE.Vector3(x-distance*.85,y+1.4,z+distance*.48);
    }else {
      desired=new THREE.Vector3(x+distance*Math.sin(this.cameraYaw),
        y,z+distance*Math.cos(this.cameraYaw));
    }
    const smoothing=teleport?1:1-Math.exp(-dt*8);
    this.camera.position.lerp(desired,smoothing);
    this.camera.lookAt(target);
    const fov=this.cameraMode==="hood"?74:clamp(57+speed*.20,57,72);
    this.camera.fov+= (fov-this.camera.fov)*smoothing;
    this.camera.updateProjectionMatrix();
  }
  finish(){
    if(this.phase==="complete")return;
    this.phase="complete";this.throttle=false;this.audio.stop();
    this.ui.throttle.classList.remove("pressed");
    if(this.finishTime)this.saveBest(this.finishTime);
    const won=!!this.finishTime&&(!this.aiFinishTime||this.finishTime<this.aiFinishTime);
    this.ui.result.hidden=false;
    this.ui.result.querySelector("[data-result-title]").textContent=
      !this.finishTime?"RACE ENDED":won?"YOU WIN!":"RACE COMPLETE";
    this.ui.result.querySelector("[data-result-player]").textContent=this.finishTime?this.finishTime.toFixed(2)+"s":"DNF";
    this.ui.result.querySelector("[data-result-ai]").textContent=this.aiFinishTime?this.aiFinishTime.toFixed(2)+"s":"DNF";
  }
}
