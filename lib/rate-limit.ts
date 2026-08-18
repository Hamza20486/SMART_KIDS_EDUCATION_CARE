import{Redis}from"@upstash/redis";import{Ratelimit}from"@upstash/ratelimit";
type Policy="login"|"forgot"|"invite"|"upload";const limits:Record<Policy,{count:number,window:"1 m"|"10 m"|"1 h"}>={login:{count:10,window:"10 m"},forgot:{count:5,window:"1 h"},invite:{count:20,window:"1 h"},upload:{count:20,window:"1 m"}};const instances=new Map<Policy,Ratelimit>();const memory=new Map<string,{count:number,reset:number}>();
function instance(policy:Policy){if(!process.env.UPSTASH_REDIS_REST_URL||!process.env.UPSTASH_REDIS_REST_TOKEN)return null;if(!instances.has(policy)){const p=limits[policy];instances.set(policy,new Ratelimit({redis:Redis.fromEnv(),limiter:Ratelimit.slidingWindow(p.count,p.window),prefix:`smartkids:${policy}`}))}return instances.get(policy)!}
export async function checkRateLimit(policy:Policy,identifier:string){const remote=instance(policy);if(remote){const result=await remote.limit(identifier);return{success:result.success,retryAfter:Math.max(0,Math.ceil((result.reset-Date.now())/1000))}}const p=limits[policy],duration=p.window==="1 m"?60000:p.window==="10 m"?600000:3600000,key=`${policy}:${identifier}`,now=Date.now(),current=memory.get(key);if(!current||current.reset<now){memory.set(key,{count:1,reset:now+duration});return{success:true,retryAfter:0}}current.count++;return{success:current.count<=p.count,retryAfter:Math.ceil((current.reset-now)/1000)}}
export function requestIdentifier(request:Request,email?:string){const ip=request.headers.get("x-forwarded-for")?.split(",")[0].trim()||request.headers.get("x-real-ip")||"unknown";return email?`${ip}:${email.toLowerCase()}`:ip}

export function rateLimitStoreConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export async function checkRateLimitStore() {
  if (!rateLimitStoreConfigured()) {
    return { ok: false, detail: "not_configured" } as const;
  }
  const pong = await Redis.fromEnv().ping();
  return { ok: pong === "PONG", detail: pong === "PONG" ? "reachable" : "unexpected_response" } as const;
}
