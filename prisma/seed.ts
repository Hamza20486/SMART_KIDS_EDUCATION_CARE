import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { permissionsForRole } from "../lib/permission-map";
import { PLAN_ENTITLEMENTS, type PlanCode } from "../lib/subscriptions/plans";
const prisma = new PrismaClient();
async function main() {
  for (const code of ["SUPER_ADMIN","ADMIN","MANAGER","TEACHER","ACCOUNTANT","PARENT"]) { const value=permissionsForRole(code); await prisma.role.upsert({where:{code},update:{permissions:value},create:{code,name:code.replaceAll("_"," "),permissions:value}}); }
  for (const plan of [{code:"ESSENTIAL",name:"Essential",priceCentimes:29900},{code:"PRO",name:"Pro",priceCentimes:49900},{code:"PREMIUM",name:"Premium",priceCentimes:79900}] as const) { const features=PLAN_ENTITLEMENTS[plan.code as PlanCode]; await prisma.subscriptionPlan.upsert({where:{code:plan.code},update:{...plan,features},create:{...plan,features}}); }
  const platformOrg=await prisma.organization.upsert({where:{slug:"platform"},update:{},create:{name:"Smart Kids SaaS Platform",slug:"platform",city:"Casablanca",country:"MA",currency:"MAD",timezone:"Africa/Casablanca",defaultLanguage:"fr"}});const platformPassword=await hash("SmartKids2026!",12);await prisma.user.upsert({where:{organizationId_email:{organizationId:platformOrg.id,email:"superadmin@smartkids.ma"}},update:{passwordHash:platformPassword,role:"SUPER_ADMIN",emailVerifiedAt:new Date()},create:{organizationId:platformOrg.id,email:"superadmin@smartkids.ma",name:"Super Admin",passwordHash:platformPassword,role:"SUPER_ADMIN",emailVerifiedAt:new Date()}});
  const org=await prisma.organization.upsert({where:{slug:"smart-kids-tit-melil"},update:{},create:{name:"Smart Kids Education Care",slug:"smart-kids-tit-melil",phone:"06 61 28 22 88",email:"contact@smartkids.ma",address:"Villa 114, Lotissement Fadell-allah, Tit Melil",city:"Casablanca",country:"MA",currency:"MAD",timezone:"Africa/Casablanca",defaultLanguage:"fr"}});
  const passwordHash=await hash("SmartKids2026!",12);
  async function user(email:string,name:string,role:string){return prisma.user.upsert({where:{organizationId_email:{organizationId:org.id,email}},update:{passwordHash,role,active:true,emailVerifiedAt:new Date()},create:{organizationId:org.id,name,email,passwordHash,role,emailVerifiedAt:new Date()}})}
  const admin=await user("admin@smartkids.ma","Administration Smart Kids","ADMIN");
  const manager=await user("manager@smartkids.ma","Manager Smart Kids","MANAGER");
  const teacher=await user("teacher@smartkids.ma","Nadia Enseignante","TEACHER");
  await user("accountant@smartkids.ma","Comptabilité Smart Kids","ACCOUNTANT");
  const parentUser=await user("parent@smartkids.ma","Sara Bennani","PARENT");
  const classe=await prisma.classRoom.upsert({where:{organizationId_name:{organizationId:org.id,name:"Les Étoiles"}},update:{},create:{organizationId:org.id,name:"Les Étoiles",capacity:18,ageGroup:"3–4 ans",academicYear:"2026-2027"}});
  await prisma.classTeacher.upsert({where:{classId_teacherId:{classId:classe.id,teacherId:teacher.id}},update:{},create:{organizationId:org.id,classId:classe.id,teacherId:teacher.id,isPrimary:true}});
  let parent=await prisma.parent.findUnique({where:{userId:parentUser.id}});if(!parent)parent=await prisma.parent.create({data:{organizationId:org.id,userId:parentUser.id,firstName:"Sara",lastName:"Bennani",phone:"0600000000",email:"parent@smartkids.ma",relationship:"Mère"}});
  let child=await prisma.child.findFirst({where:{organizationId:org.id,firstName:"Yasmine",lastName:"Bennani"}});if(!child)child=await prisma.child.create({data:{organizationId:org.id,classId:classe.id,firstName:"Yasmine",lastName:"Bennani",birthDate:new Date("2022-04-10")}});
  await prisma.parentChild.upsert({where:{parentId_childId:{parentId:parent.id,childId:child.id}},update:{},create:{organizationId:org.id,parentId:parent.id,childId:child.id,relationship:"Mère",primary:true}});if(!await prisma.authorizedPickupPerson.findFirst({where:{organizationId:org.id,childId:child.id,name:"Sara Bennani"}}))await prisma.authorizedPickupPerson.create({data:{organizationId:org.id,childId:child.id,parentId:parent.id,name:"Sara Bennani",relationship:"Mère",phone:parent.phone,createdById:admin.id}});
  const date=new Date();date.setHours(0,0,0,0);await prisma.attendance.upsert({where:{organizationId_childId_date:{organizationId:org.id,childId:child.id,date}},update:{},create:{organizationId:org.id,childId:child.id,date,status:"PRESENT",arrivalAt:new Date(),recordedById:admin.id}});
  const activity=await prisma.activity.create({data:{organizationId:org.id,classId:classe.id,title:"Atelier couleurs",description:"Découverte des couleurs primaires",activityDate:new Date(),createdById:teacher.id}});
  const homework=await prisma.homework.create({data:{organizationId:org.id,classId:classe.id,title:"Reconnaître les formes",description:"Identifier cercle, carré et triangle",dueDate:new Date(Date.now()+7*86400000),status:"PUBLISHED",publishedAt:new Date(),createdById:teacher.id}});
  await prisma.announcement.create({data:{organizationId:org.id,audience:"ALL",title:"Bienvenue",content:"Bienvenue sur le portail Smart Kids.",publishedAt:new Date(),createdById:manager.id}});
  const fees=await prisma.feeCategory.upsert({where:{organizationId_code:{organizationId:org.id,code:"SCOLARITE"}},update:{},create:{organizationId:org.id,name:"Scolarité",code:"SCOLARITE"}});await prisma.payment.create({data:{organizationId:org.id,parentId:parent.id,childId:child.id,categoryId:fees.id,grossAmountCentimes:120000,discountCentimes:0,amountCentimes:120000,currency:"MAD",academicPeriod:"2026-09",dueDate:new Date(Date.now()+10*86400000),status:"PENDING",reference:"SCOLARITE-2026-001"}});
  const pro=await prisma.subscriptionPlan.findUniqueOrThrow({where:{code:"PRO"}});if(!await prisma.subscription.findFirst({where:{organizationId:org.id,status:{in:["TRIAL","ACTIVE"]}}}))await prisma.subscription.create({data:{organizationId:org.id,planId:pro.id,status:"TRIAL",trialEndsAt:new Date(Date.now()+14*86400000),currentPeriodStart:new Date(),currentPeriodEnd:new Date(Date.now()+30*86400000)}});
  console.log("Seeded all roles and demo accounts. Password: SmartKids2026!");
  void activity; void homework;
}
main().finally(()=>prisma.$disconnect());
