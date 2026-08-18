import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
export async function audit(user:{id:string;organizationId:string},action:string,entity:string,entityId?:string,metadata?:Record<string,unknown>){await prisma.auditLog.create({data:{organizationId:user.organizationId,userId:user.id,action,entity,entityId,metadata:metadata as Prisma.InputJsonValue|undefined}})}
