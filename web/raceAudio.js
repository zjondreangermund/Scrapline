// Small, original synthesized effects: no copyrighted audio assets or downloads.
export class RaceAudio {
  constructor(){this.ctx=null;this.muted=false;this.osc=null;this.gain=null;this.lastPitch=1100;}
  unlock(){
    if(this.muted)return;
    const Ctor=window.AudioContext||window.webkitAudioContext;
    if(!Ctor)return;
    try {
      if(!this.ctx){
        this.ctx=new Ctor();
        this.osc=this.ctx.createOscillator();this.osc.type="sawtooth";
        const filter=this.ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=450;
        this.gain=this.ctx.createGain();this.gain.gain.value=.0001;
        this.osc.connect(filter);filter.connect(this.gain);this.gain.connect(this.ctx.destination);
        this.osc.start();
      }
      this.ctx.resume();
    }catch(error){console.warn("Audio unavailable",error);this.muted=true;}
  }
  tick(rpm,throttle,active){
    if(!this.ctx||!this.osc||!this.gain)return;
    const now=this.ctx.currentTime, level=active&&!this.muted?.012+Math.min(1,throttle)*.024:0;
    this.osc.frequency.setTargetAtTime(Math.max(40,rpm/42),now,.07);
    this.gain.gain.setTargetAtTime(level,now,.06);
  }
  chirp(perfect){
    if(!this.ctx||this.muted)return;
    const ctx=this.ctx, start=ctx.currentTime;
    // Short white-noise friction burst, like rubber catching traction.
    const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*(perfect?.19:.9)),ctx.sampleRate);
    const channel=buffer.getChannelData(0);
    let seed=331;
    for(let i=0;i<channel.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;channel[i]=(seed/2147483648-1)*.34;}
    const source=ctx.createBufferSource();source.buffer=buffer;
    const filter=ctx.createBiquadFilter();filter.type="bandpass";filter.frequency.value=perfect?1750:950;filter.Q.value=.9;
    const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(perfect?.14:.18,start+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,start+(perfect?.19:.87));
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(start);
  }
  stop(){this.tick(1100,0,false);}
}
