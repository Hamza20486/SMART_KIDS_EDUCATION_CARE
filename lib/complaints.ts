import{randomBytes}from"node:crypto";
const transitions:Record<string,string[]>={OPEN:["IN_PROGRESS","RESOLVED"],IN_PROGRESS:["RESOLVED"],RESOLVED:["IN_PROGRESS","CLOSED"],CLOSED:[]};
export function canTransitionComplaint(from:string,to:string){return from===to||(transitions[from]?.includes(to)??false)}
export function complaintSla(priority:string,from=new Date()){const hours:Record<string,number>={LOW:168,NORMAL:72,HIGH:24,URGENT:4};return new Date(from.getTime()+(hours[priority]??72)*3600000)}
export function complaintReference(date=new Date()){return `CMP-${date.getUTCFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`}
export function visibleComplaintMessages<T extends{internal:boolean}>(role:string,messages:T[]){return role==="PARENT"?messages.filter(x=>!x.internal):messages}
