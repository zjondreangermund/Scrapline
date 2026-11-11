import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const html=readFileSync("web/index.html","utf8");
const app=readFileSync("web/app.js","utf8");
const race=readFileSync("web/race.js","utf8");
const world=readFileSync("web/world.js","utf8");
const physics=readFileSync("web/racePhysics.js","utf8");
const audio=readFileSync("web/raceAudio.js","utf8");
for(const file of ["web/app.js","web/race.js","web/world.js","web/racePhysics.js","web/raceAudio.js","server.mjs"]){
  execFileSync(process.execPath,["--check",file],{stdio:"pipe"});
}
for(const id of ["garage-ui","race-start","race-ui","camera-mode","tach-needle","tach-readout","shift-hint","camera-zoom","camera-height","sound-toggle","race-result","back-garage","reset-race","throttle","shift","speed-value","gear-value","rpm-value","race-timer","race-signal","player-progress","opponent-progress","distance-value","best-time","auto-shift"]){
  assert.ok(html.includes(`id="${id}"`),`Missing UI element ${id}`);
}
assert.match(app,/new DragRace\(/);
assert.match(app,/if\s*\(race\)\s*race.tick\(dt\)/);
assert.match(race,/QUARTER_MILE\s*=\s*402\.336/);
assert.match(race,/localStorage\.setItem\("scrapline-best-quarter-mile"/);
assert.match(race,/pointercancel/);
assert.match(race,/pivot\.rotation\.y=Math\.PI/,"Imported car must rotate around corrected pivot");
assert.match(race,/7\.35,1\.85,2\.4/,"Traffic light pole must not block player camera");
assert.match(race,/decorateTrack3D\(this\.track\)/);
assert.match(race,/buildStripBuildings\(this\.track\)/);
assert.match(race,/this\.audio\.chirp\(kind==="perfect"\)/);
assert.match(race,/wheel\.rotateZ\(playerRotation\)/);
assert.match(race,/this\.cameraDistance=Number/);
assert.match(app,/decorateGarage3D\(scene\)/);
assert.match(app,/RoomEnvironment/);
assert.match(world,/export function decorateTrack3D/);
assert.match(world,/export function decorateGarage3D/);
assert.match(world,/export function installInterior/);
assert.match(world,/export function buildStripBuildings/);
assert.match(physics,/export function advanceVehicle/);
assert.match(audio,/export class RaceAudio/);
const server=readFileSync("server.mjs","utf8");
assert.match(server,/game\/assets/);
console.log("SCRAPLINE_WEB_SMOKE_OK: 3D worlds, camera, car pivot, timing, controls and persistence");
