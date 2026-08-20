import Link from "next/link";
import { requirePermission, authorizedClassIds, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";
import {
  Baby, Users, CalendarCheck, CreditCard, PlusCircle, ClipboardCheck,
  Sparkles, Megaphone, ArrowRight, BookOpen, MessageSquare, Clock3,
  Activity, Inbox, CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const u = await requirePermission("dashboard.read");
  const ids = await authorizedClassIds(u);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const canParents = hasPermission(u.role, "parents.read");
  const canPayments = hasPermission(u.role, "payments.read");
  const canHomework = hasPermission(u.role, "homework.read");
  const canComplaints = hasPermission(u.role, "complaints.read");
  const classScope = ids ? { classId: { in: ids } } : {};

  const [childrenCount, parentsCount, classesCount, attendanceGroups, due, recentActivities, upcomingHomework, openComplaints] = await Promise.all([
    prisma.child.count({ where: { organizationId: u.organizationId, active: true, ...classScope } }),
    canParents ? prisma.parent.count({ where: { organizationId: u.organizationId } }) : Promise.resolve(0),
    prisma.classRoom.count({ where: { organizationId: u.organizationId, active: true, ...(ids ? { id: { in: ids } } : {}) } }),
    prisma.attendance.groupBy({ by: ["status"], where: { organizationId: u.organizationId, date: { gte: start, lt: end }, ...(ids ? { child: { classId: { in: ids } } } : {}) }, _count: true }),
    canPayments ? prisma.payment.aggregate({ where: { organizationId: u.organizationId, status: "PENDING" }, _sum: { amountCentimes: true } }) : Promise.resolve(null),
    prisma.activity.findMany({ where: { organizationId: u.organizationId, active: true, ...(ids ? { OR: [{ classId: { in: ids } }, { classId: null }] } : {}) }, select: { id: true, title: true, activityDate: true, class: { select: { name: true } } }, orderBy: { activityDate: "desc" }, take: 4 }),
    canHomework ? prisma.homework.findMany({ where: { organizationId: u.organizationId, active: true, status: "PUBLISHED", dueDate: { gte: start }, ...classScope }, select: { id: true, title: true, dueDate: true, class: { select: { name: true } } }, orderBy: { dueDate: "asc" }, take: 4 }) : Promise.resolve([]),
    canComplaints ? prisma.complaint.count({ where: { organizationId: u.organizationId, status: { in: ["OPEN", "IN_PROGRESS"] } } }) : Promise.resolve(0),
  ]);

  const attendance = Object.fromEntries(attendanceGroups.map((row) => [row.status, row._count]));
  const recorded = attendanceGroups.reduce((sum, row) => sum + row._count, 0);
  const present = attendance.PRESENT || 0;
  const attendanceRate = childrenCount ? Math.min(100, Math.round((present / childrenCount) * 100)) : 0;
  const todayFormatted = new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="welcome-kicker"><CalendarCheck size={14} /> {todayFormatted}</span>
          <h1>Bonjour {u.name.split(" ")[0]} 👋</h1>
          <p>{t("staff.dashboardSubtitle")} Retrouvez ici les informations essentielles de votre établissement.</p>
        </div>
        <div className="welcome-actions">
          <Link href="/admin/attendance/daily" className="button"><ClipboardCheck size={17} /> Faire l’appel</Link>
          <Link href="/admin/enfants" className="button secondary"><PlusCircle size={17} /> Inscrire un enfant</Link>
        </div>
      </section>

      <div className="grid dashboard-stats">
        <div className="card stat"><div className="stat-top"><span className="stat-label">{t("staff.authorizedChildren")}</span><span className="stat-icon tone-blue"><Baby size={22} /></span></div><div><strong>{childrenCount}</strong><p className="stat-detail">Dans {classesCount} classe{classesCount > 1 ? "s" : ""} active{classesCount > 1 ? "s" : ""}</p></div></div>
        {canParents && <div className="card stat"><div className="stat-top"><span className="stat-label">{t("navigation.parents")}</span><span className="stat-icon tone-purple"><Users size={22} /></span></div><div><strong>{parentsCount}</strong><p className="stat-detail">Comptes familles enregistrés</p></div></div>}
        <div className="card stat"><div className="stat-top"><span className="stat-label">Présents aujourd’hui</span><span className="stat-icon tone-green"><CheckCircle2 size={22} /></span></div><div><strong>{present}<small style={{fontSize:13,color:"var(--muted)"}}> / {childrenCount}</small></strong><p className="stat-detail">{recorded} présence{recorded > 1 ? "s" : ""} enregistrée{recorded > 1 ? "s" : ""}</p></div></div>
        {canPayments && due && <div className="card stat"><div className="stat-top"><span className="stat-label">{t("staff.unpaid")}</span><span className="stat-icon tone-orange"><CreditCard size={22} /></span></div><div><strong>{((due._sum.amountCentimes || 0) / 100).toFixed(2)} <small style={{fontSize:13}}>DH</small></strong><p className="stat-detail">En attente d’encaissement</p></div></div>}
      </div>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="section-heading"><div><h2>Actions fréquentes</h2><p>Accédez rapidement à vos outils quotidiens</p></div></div>
          <div className="feature-grid">
            <Feature href="/admin/attendance/daily" icon={<ClipboardCheck size={22}/>} tone="tone-blue" title="Présences" text="Effectuer l’appel quotidien" />
            <Feature href="/admin/activities" icon={<Sparkles size={22}/>} tone="tone-purple" title="Activités" text="Partager les moments de classe" />
            {canHomework && <Feature href="/admin/homework" icon={<BookOpen size={22}/>} tone="tone-green" title="Devoirs" text="Publier et suivre les travaux" />}
            <Feature href="/admin/announcements" icon={<Megaphone size={22}/>} tone="tone-orange" title="Communication" text="Informer toutes les familles" />
            {canComplaints && <Feature href="/admin/complaints" icon={<MessageSquare size={22}/>} tone="tone-coral" title="Réclamations" text={`${openComplaints} demande${openComplaints > 1 ? "s" : ""} à suivre`} />}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading"><div><h2>Présences du jour</h2><p>Suivi en temps réel</p></div><Link href="/admin/attendance">Voir le détail</Link></div>
          <div className="attendance-meter"><div className="meter-head"><span>Taux de présence</span><span>{attendanceRate}%</span></div><div className="meter-track"><div className="meter-fill" style={{width:`${attendanceRate}%`}} /></div></div>
          <div className="status-legend"><div className="legend-item"><strong>{present}</strong>Présents</div><div className="legend-item"><strong>{attendance.ABSENT || 0}</strong>Absents</div><div className="legend-item"><strong>{attendance.LATE || 0}</strong>En retard</div><div className="legend-item"><strong>{Math.max(0, childrenCount-recorded)}</strong>À pointer</div></div>
        </section>
      </div>

      <div className="dashboard-columns">
        <section className="panel"><div className="section-heading"><div><h2>Activité récente</h2><p>Dernières publications pédagogiques</p></div><Link href="/admin/activities">Tout voir</Link></div>{recentActivities.length ? <div className="activity-list">{recentActivities.map((item)=><Link className="activity-row" href={`/admin/activities/${item.id}`} key={item.id}><span className="activity-dot"><Activity size={17}/></span><span className="activity-content"><strong>{item.title}</strong><span>{item.class?.name || "Toutes les classes"}</span></span><span className="activity-date">{formatDate(locale,item.activityDate)}</span></Link>)}</div>:<Empty label="Aucune activité publiée" />}</section>
        <section className="panel"><div className="section-heading"><div><h2>À venir</h2><p>Prochaines échéances</p></div>{canHomework && <Link href="/admin/homework">Tout voir</Link>}</div>{upcomingHomework.length ? <div className="activity-list">{upcomingHomework.map((item)=><Link className="activity-row" href={`/admin/homework/${item.id}`} key={item.id}><span className="activity-dot tone-purple"><Clock3 size={17}/></span><span className="activity-content"><strong>{item.title}</strong><span>{item.class.name}</span></span><span className="activity-date">{formatDate(locale,item.dueDate)}</span></Link>)}</div>:<Empty label="Aucune échéance prochaine" />}</section>
      </div>
    </>
  );
}

function Feature({href,icon,tone,title,text}:{href:string;icon:React.ReactNode;tone:string;title:string;text:string}){return <Link href={href} className="feature-card"><div className="feature-card-head"><span className={`feature-icon ${tone}`}>{icon}</span><ArrowRight size={17} className="arrow"/></div><div><h3>{title}</h3><p>{text}</p></div></Link>}
function Empty({label}:{label:string}){return <div className="empty-state"><Inbox size={28}/><strong>{label}</strong><span>Les nouvelles informations apparaîtront ici.</span></div>}
