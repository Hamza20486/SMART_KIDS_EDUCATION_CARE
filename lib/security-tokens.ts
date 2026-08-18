import{createHash,randomBytes}from"node:crypto";
export function createOpaqueToken(){const token=randomBytes(32).toString("base64url");return{token,tokenHash:hashToken(token)}}
export function hashToken(token:string){return createHash("sha256").update(token).digest("hex")}
export function appUrl(){return(process.env.APP_URL||process.env.AUTH_URL||"http://localhost:3000").replace(/\/$/,"")}
