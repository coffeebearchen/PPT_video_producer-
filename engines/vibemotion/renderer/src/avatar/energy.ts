export type EnergyTrack={version:1;fps:number;durationMs:number;values:number[];rms:number[];silenceFloor:number;referenceRms:number;source?:string};

/** Measured PCM energy, not phonemes. Precompute once so frame seeking is deterministic. */
export function computeEnergy(samples:Float32Array,sampleRate:number,fps=30):EnergyTrack {
 if(!samples.length||!Number.isFinite(sampleRate)||sampleRate<=0||!Number.isFinite(fps)||fps<=0)throw new Error('无法分析空音频或无效采样率');
 const rms:number[]=[];
 for(let frame=0;frame<Math.ceil(samples.length/sampleRate*fps);frame++){
  const start=Math.floor(frame*sampleRate/fps),end=Math.min(samples.length,Math.floor((frame+1)*sampleRate/fps));
  let sum=0;for(let i=start;i<end;i++)sum+=samples[i]*samples[i];
  rms.push(Math.sqrt(sum/Math.max(1,end-start)));
 }
 const voiced=rms.filter(v=>v>0.001).sort((a,b)=>a-b);
 const referenceRms=Math.max(0.015,voiced[Math.floor(voiced.length*.95)]??0.015);
 const silenceFloor=Math.max(0.003,referenceRms*.045);
 let last=0;
 const values=rms.map(r=>{
  if(r<=silenceFloor){last=0;return 0;}
  const target=Math.pow(Math.min(1,(r-silenceFloor)/Math.max(.001,referenceRms-silenceFloor)),.65);
  last+=(target-last)*(target>last?.82:.55);
  return Number(last.toFixed(5));
 });
 return {version:1,fps,durationMs:Math.round(samples.length/sampleRate*1000),values,rms:rms.map(v=>Number(v.toFixed(6))),silenceFloor,referenceRms};
}

export function energyAt(track:EnergyTrack,timeMs:number):number {
 if(timeMs<0||timeMs>=track.durationMs)return 0;
 return track.values[Math.floor(timeMs/1000*track.fps)]??0;
}
