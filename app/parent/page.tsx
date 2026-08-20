import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import {
  Baby, Bell, CreditCard, Sparkles, CalendarCheck, BookOpen, UserX,
  MessageSquare, ArrowRight, Heart, GraduationCap, Clock3, Inbox, CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const user = await requireUser(["PARENT"]);
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const parent = await prisma.parent.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
    include: { children: { include: { child: { include: { class: { include: { teachers: { include: { teacher: true } } } } } } } } },
  });
  const linkedChildren = parent?.children.map((link) => link.child) || [];
  const childIds = linkedChildren.map((child) => child.id);
  const classIds = linkedChildren.flatMap((child) => child.classId ? [child.classId] : []);
  const start = new Date(); start.setHours(0,0,0,0);
  const monthStart = new Date(start); monthStart.setDate(monthStart.getDate()-30);

  const [unread, due, attendanceGroups, upcomingHomework, recentActivities, notifications] = parent ? await Promise.all([
    prisma.notification.count({ where: { organizationId:user.organizationId,userId:user.id,readAt:null } }),
    prisma.payment.aggregate({ where:{organizationId:user.organizationId,parentId:parent.id,status:"PENDING"},_sum:{amountCentimes:true} }),
    prisma.attendance.groupBy({by:["status"],where:{organizationId:user.organizationId,childId:{in:childIds},date:{gte:monthStart}},_count:true}),
    childIds.length ? prisma.homework.findMany({where:{organizationId:user.organizationId,status:"PUBLISHED",active:true,dueDate:{gte:start},OR:[{classId:{in:classIds}},{assignments:{some:{childId:{in:childIds}}}}]},select:{id:true,title:true,dueDate:true,class:{select:{name:true}}},orderBy:{dueDate:"asc"},take:4}) : Promise.resolve([]),
    childIds.length ? prisma.activity.findMany({where:{organizationId:user.organizationId,active:true,visibleToParents:true,OR:[{childId:{in:childIds}},{classId:{in:classIds}},{AND:[{childId:null},{classId:null}]}]},select:{id:true,title:true,activityDate:true,class:{select:{name:true}}},orderBy:{activityDate:"desc"},take:4}) : Promise.resolve([]),
    prisma.notification.findMany({where:{organizationId:user.organizationId,userId:user.id},select:{id:true,title:true,createdAt:true,readAt:true},orderBy:{createdAt:"desc"},take:4}),
  ]) : [0,{_sum:{amountCentimes:0}},[],[],[],[]];

  const attendance = Object.fromEntries(attendanceGroups.map((row)=>[row.status,row._count]));
  const attendanceTotal = attendanceGroups.reduce((sum,row)=>sum+row._count,0);
  const attendanceRate = attendanceTotal ? Math.round(((attendance.PRESENT||0)/attendanceTotal)*100) : 0;
  const primaryChild = linkedChildren[0];
  const teacherName = primaryChild?.class?.teachers?.[0]?.teacher.name;

  return <>
    <section className="welcome-panel">
      <div className="welcome-copy"><span className="welcome-kicker"><Heart size={14} fill="currentColor"/> Espace Famille Smart Kids</span><h1>{t("parent.greeting",{name:user.name})} 👋</h1><p>{t("parent.subtitle")} Suivez les journées de vos enfants en toute simplicité.</p></div>
      <div className="welcome-actions"><Link href="/parent/activities" className="button"><Sparkles size={17}/> Voir les activités</Link><Link href="/account/notifications" className="button secondary"><Bell size={17}/> Notifications {unread > 0 && `(${unread})`}</Link></div>
    </section>

    {primaryChild && <section className="child-summary"><div className="child-profile"><span className="child-avatar"><Baby size={25}/></span><div><h2>{primaryChild.firstName} {primaryChild.lastName}</h2><p><GraduationCap size={13} style={{verticalAlign:"-2px",marginRight:4}}/>{primaryChild.class?.name || t("parent.noClass")}{teacherName ? ` · ${teacherName}` : ""}</p></div></div><div className="welcome-actions"><Link href="/parent/attendance" className="button secondary"><CalendarCheck size={15}/> Présences</Link><Link href="/parent/children" className="button secondary">Voir le profil</Link></div></section>}

    <div className="grid dashboard-stats">
      <Link href="/parent/children" className="card stat"><div className="stat-top"><span className="stat-label">{t("parent.myChildren")}</span><span className="stat-icon tone-blue"><Baby size={22}/></span></div><div><strong>{linkedChildren.length}</strong><p className="stat-detail">Enfant{linkedChildren.length>1?"s":""} lié{linkedChildren.length>1?"s":""} à votre compte</p></div></Link>
      <Link href="/parent/attendance" className="card stat"><div className="stat-top"><span className="stat-label">Présence · 30 jours</span><span className="stat-icon tone-green"><CheckCircle2 size={22}/></span></div><div><strong>{attendanceRate}%</strong><p className="stat-detail">{attendance.PRESENT||0} journée{(attendance.PRESENT||0)>1?"s":""} présente{(attendance.PRESENT||0)>1?"s":""}</p></div></Link>
      <Link href="/account/notifications" className="card stat"><div className="stat-top"><span className="stat-label">{t("notifications.title")}</span><span className="stat-icon tone-purple"><Bell size={22}/></span></div><div><strong>{unread}</strong><p className="stat-detail">Notification{unread>1?"s":""} non lue{unread>1?"s":""}</p></div></Link>
      <Link href="/parent/payments" className="card stat"><div className="stat-top"><span className="stat-label">{t("parent.amountDue")}</span><span className="stat-icon tone-orange"><CreditCard size={22}/></span></div><div><strong>{formatMoney(locale,due._sum.amountCentimes||0)}</strong><p className="stat-detail">{(due._sum.amountCentimes||0)>0?"Solde restant à régler":"Tout est à jour"}</p></div></Link>
    </div>

    <div className="dashboard-columns">
      <section className="panel"><div className="section-heading"><div><h2>Services & raccourcis</h2><p>Tout ce dont votre famille a besoin</p></div></div><div className="feature-grid">
        <Feature href="/parent/activities" icon={<Sparkles size={22}/>} tone="tone-purple" title="Activités" text="Photos et ateliers de la journée"/>
        <Feature href="/parent/homework" icon={<BookOpen size={22}/>} tone="tone-blue" title="Devoirs" text="Consignes et remises en ligne"/>
        <Feature href="/parent/absences" icon={<UserX size={22}/>} tone="tone-coral" title="Absences" text="Signaler et joindre un justificatif"/>
        <Feature href="/parent/complaints" icon={<MessageSquare size={22}/>} tone="tone-green" title="Demandes" text="Échanger avec la direction"/>
        <Feature href="/parent/payments" icon={<CreditCard size={22}/>} tone="tone-orange" title="Paiements" text="Factures, historique et reçus"/>
      </div></section>
      <section className="panel"><div className="section-heading"><div><h2>À venir</h2><p>Prochaines échéances</p></div><Link href="/parent/homework">Tout voir</Link></div>{upcomingHomework.length?<div className="activity-list">{upcomingHomework.map((item)=><Link href="/parent/homework" className="activity-row" key={item.id}><span className="activity-dot tone-purple"><Clock3 size={17}/></span><span className="activity-content"><strong>{item.title}</strong><span>{item.class.name}</span></span><span className="activity-date">{formatDate(locale,item.dueDate)}</span></Link>)}</div>:<Empty label="Aucune échéance prochaine"/>}</section>
    </div>

    <div className="dashboard-columns">
      <section className="panel"><div className="section-heading"><div><h2>Activités récentes</h2><p>Les derniers moments partagés</p></div><Link href="/parent/activities">Tout voir</Link></div>{recentActivities.length?<div className="activity-list">{recentActivities.map((item)=><Link href="/parent/activities" className="activity-row" key={item.id}><span className="activity-dot"><Sparkles size={17}/></span><span className="activity-content"><strong>{item.title}</strong><span>{item.class?.name||"Tous les enfants"}</span></span><span className="activity-date">{formatDate(locale,item.activityDate)}</span></Link>)}</div>:<Empty label="Aucune activité récente"/>}</section>
      <section className="panel"><div className="section-heading"><div><h2>Informations récentes</h2><p>Messages et mises à jour</p></div><Link href="/account/notifications">Tout voir</Link></div>{notifications.length?<div className="activity-list">{notifications.map((item)=><Link href="/account/notifications" className="activity-row" key={item.id}><span className={`activity-dot ${item.readAt?"":"tone-orange"}`}><Bell size={17}/></span><span className="activity-content"><strong>{item.title}</strong><span>{item.readAt?"Lu":"À consulter"}</span></span><span className="activity-date">{formatDate(locale,item.createdAt)}</span></Link>)}</div>:<Empty label="Aucune information récente"/>}</section>
    </div>
  </>;
}
function Feature({href,icon,tone,title,text}:{href:string;icon:React.ReactNode;tone:string;title:string;text:string}){return <Link href={href} className="feature-card"><div className="feature-card-head"><span className={`feature-icon ${tone}`}>{icon}</span><ArrowRight size={17} className="arrow"/></div><div><h3>{title}</h3><p>{text}</p></div></Link>}
function Empty({label}:{label:string}){return <div className="empty-state"><Inbox size={28}/><strong>{label}</strong><span>Les nouvelles informations apparaîtront ici.</span></div>}
