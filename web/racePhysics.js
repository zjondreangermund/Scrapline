// Scrapline tuned arcade physics: SI units (metres, seconds, m/s), no fake progress.
export const QUARTER_MILE = 402.336;
export const GEAR_TOP_KMH = [0, 53, 94, 138, 179, 228];
export const PERFECT_SHIFT_MIN = 6050;
export const PERFECT_SHIFT_MAX = 6750;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function engineRpm(speed, gear, throttle=1) {
  const top=GEAR_TOP_KMH[clamp(gear,1,5)];
  const roadRpm=1100+(speed*3.6/top)*5600;
  return clamp(roadRpm, 1100+throttle*200, 7500);
}
export function newVehicle(power=1) {
  return {power, speed:0, distance:0, gear:1, rpm:1100, spinLeft:0,
    shiftPenalty:0, shiftBoost:0, launchBoost:0, started:false, launchKind:"", shiftQuality:""};
}
export function beginLaunch(v, kind) {
  v.started=true;
  v.launchKind=kind;
  v.spinLeft=kind==="spin"?1.4:0;
  v.launchBoost=kind==="perfect"?1.15:0;
  v.shiftPenalty=kind==="late"?.26:0;
}
export function shift(v, manual=false) {
  if(!v.started || v.gear>=5)return "max";
  const rpm=v.rpm;
  let quality="normal";
  if(manual) {
    if(rpm>=PERFECT_SHIFT_MIN&&rpm<=PERFECT_SHIFT_MAX) {
      quality="perfect";v.shiftBoost=0.85;v.shiftPenalty=.035;
    } else if(rpm<4000){quality="early";v.shiftPenalty=.45;}
    else if(rpm>7000){quality="late";v.shiftPenalty=.35;}
    else v.shiftPenalty=.15;
  } else v.shiftPenalty=.08;
  v.gear++;
  v.rpm=engineRpm(v.speed,v.gear);
  v.shiftQuality=quality;
  return quality;
}
export function advanceVehicle(v, dt, throttle, auto=true) {
  dt=clamp(dt,0,0.05);
  if (!v.started) {v.rpm=1100;return v;}
  const kmh=v.speed*3.6;
  v.rpm=engineRpm(v.speed,v.gear,throttle);
  if(auto && v.rpm>=6600 && v.gear<5)shift(v,false);
  const highRpmPenalty=v.rpm>6900?clamp(1-(v.rpm-6900)/1600,.35,1):1;
  const powerCurve=clamp(1-.43*(kmh/225),.48,1);
  const gearDrive=[0,1.12,1.02,.96,.89,.83][v.gear];
  let acceleration=7.0*v.power*powerCurve*gearDrive*highRpmPenalty*clamp(throttle,0,1);
  if(v.launchBoost>0)acceleration*=1.18;
  if(v.shiftBoost>0)acceleration*=1.15;
  if(v.spinLeft>0)acceleration*=.38;  // wheelspin sounds fast but goes nowhere
  if(v.shiftPenalty>0)acceleration*=.35;
  const aero=.0026*v.speed*v.speed;
  const decel=throttle>0?0.17:1.65;
  v.speed=clamp(v.speed+(acceleration-aero-decel)*dt,0,67);
  v.distance+=v.speed*dt;
  v.spinLeft=Math.max(0,v.spinLeft-dt);
  v.launchBoost=Math.max(0,v.launchBoost-dt);
  v.shiftBoost=Math.max(0,v.shiftBoost-dt);
  v.shiftPenalty=Math.max(0,v.shiftPenalty-dt);
  v.rpm=engineRpm(v.speed,v.gear,throttle);
  return v;
}
