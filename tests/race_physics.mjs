import assert from "node:assert/strict";
import { QUARTER_MILE, PERFECT_SHIFT_MIN, PERFECT_SHIFT_MAX, newVehicle, beginLaunch, shift, advanceVehicle, engineRpm } from "../web/racePhysics.js";

function simulate(kind) {
  const v=newVehicle();
  beginLaunch(v,kind);
  let time=0, to100=0;
  while(time<35 && v.distance<QUARTER_MILE) {
    advanceVehicle(v,.016,1,true);
    time+=.016;
    if(!to100 && v.speed*3.6>=100)to100=time;
  }
  return {v,time,to100};
}
const ideal=simulate("perfect"), spinning=simulate("spin"), slow=simulate("late");
assert.ok(ideal.time>12 && ideal.time<17,`Quarter mile should feel like a tuned street car, got ${ideal.time}`);
assert.ok(ideal.to100>4 && ideal.to100<7,`0-100 km/h unrealistic: ${ideal.to100}`);
assert.ok(spinning.time>ideal.time+.45,"Wheelspin must noticeably lose time");
assert.ok(slow.time>ideal.time+.15,"Late reaction must lose time");
assert.ok(ideal.v.distance>=QUARTER_MILE,"Racing time must come from distance, not an artificial bar");
const second=newVehicle();beginLaunch(second,"perfect");
second.speed=16;second.gear=2;
assert.ok(engineRpm(second.speed,second.gear)>1500,"Gear-two RPM must not collapse to 900");
second.rpm=(PERFECT_SHIFT_MIN+PERFECT_SHIFT_MAX)/2;
assert.equal(shift(second,true),"perfect");
assert.ok(second.shiftBoost>.5);
const poor=newVehicle();beginLaunch(poor,"perfect");poor.rpm=2500;
assert.equal(shift(poor,true),"early");
assert.ok(poor.shiftPenalty>.4);
console.log("SCRAPLINE_PHYSICS_OK",{
  quarter:ideal.time.toFixed(2),
  zeroTo100:ideal.to100.toFixed(2),
  spinning:spinning.time.toFixed(2),
  late:slow.time.toFixed(2)
});
