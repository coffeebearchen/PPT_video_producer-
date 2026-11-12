export type InkPath={group:number;hatch?:boolean;cell?:number;lit?:boolean;d:string;stroke:string;sw:number;fill:string};
export type InkText={x:number;y:number;s:string;size:number;c:string;anchor:'start'|'middle'|'end';weight:number};
export type Drawing={title:string;sub:string;paths:InkPath[];texts:InkText[];foot:string};
export const rawLayouts:Record<string,(data?:unknown)=>Drawing>;
export function icon(name:string,x:number,y:number,size:number,color:string):InkPath[];

export function drawLayout(id:string,data:unknown):Drawing;

export const C:{bg:string;ink:string;muted:string;yellow:string;green:string;red:string;pink:string;orange:string;line:string;surface:string};
