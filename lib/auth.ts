import { auth } from "@/auth";
import { prisma } from "./prisma";
import { getActiveSubscription } from "./subscriptions/service";
export { ForbiddenError } from "./errors";
import { ForbiddenError } from "./errors";
export async function requireUser(roles?:string[]){const session=await auth();if(!session?.user?.id)throw new ForbiddenError("Authentication required");const user=await prisma.user.findFirst({where:{id:session.user.id,active:true,organization:{active:true}},select:{id:true,organizationId:true,name:true,email:true,role:true,sessionVersion:true}});if(!user||user.sessionVersion!==session.user.sessionVersion)throw new ForbiddenError("Account or organization disabled");if(roles&&!roles.includes(user.role))throw new ForbiddenError("Insufficient permission");if(user.role!=="SUPER_ADMIN"&&!await getActiveSubscription(user.organizationId))throw new ForbiddenError("Organization subscription inactive or expired");return user}
export const STAFF_ROLES=["ADMIN","MANAGER","TEACHER","ACCOUNTANT"];
