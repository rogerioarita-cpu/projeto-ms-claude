import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";
import { brl, dateFmt, daysUntil } from "@/lib/format";
import { getLeadScopeFilter } from "@/server/session-scope";

export const dynamic = "force-dynamic";

async function getData(leadScope?: string) {
  const leadWhere = leadScope ? { id: leadScope } : undefined;
  const analiseWhere = leadScope ? { leadId: leadScope } : undefined;
  const docWhere = leadScope ? { leadId: leadScope } : undefined;
  const aprovacaoWhere = leadScope ? { leadId: leadScope } : undefined;
  const projectWhere = leadScope ? { leadId: leadScope } : undefined;

  const [
    leads,
    analisesEmAndamento,
    aprovacoesPendentes,
    documentosPendentes,
    analisesRecentes,
    totalCredits,
    riskProjects,
    topCredits,
    openInconsistencies,
  ] = await Promise.all([
    prisma.lead.findMany({ where: leadWhere }),
    prisma.analiseFiscal.count({ where: { ...analiseWhere, status: "em_andamento" } }),
    prisma.aprovacao.count({ where: { ...aprovacaoWhere, status: "pendente" } }),
    prisma.document.count({ where: { ...docWhere, status: "pendente" } }),
    prisma.analiseFiscal.findMany({
      where: analiseWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { lead: true },
    }),
    prisma.taxCredit.aggregate({ _sum: { amount: true }, where: leadScope ? { project: { leadId: leadScope } } : undefined }),
    prisma.project.findMany({
      where: { ...projectWhere, prescriptionDate: { not: null } },
      orderBy: { prescriptionDate: "asc" },
      take: 5,
      include: { lead: true },
    }),
    prisma.taxCredit.findMany({
      where: leadScope ? { project: { leadId: leadScope } } : undefined,
      orderBy: { amount: "desc" },
      take: 5,
      include: { project: { include: { lead: true } } },
    }),
    prisma.inconsistency.count({ where: { resolved: false, ...(leadScope ? { project: { leadId: leadScope } } : {}) } }),
  ]);

  const leadsAtivos = leads.filter((l) => l.status !== "aprovado" && l.status !== "cancelado").length;
  const leadsSemNda = leads.filter((l) => !l.ndaSigned).length;
  const leadsByStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    leadsAtivos,
    leadsSemNda,
    leadsByStatus,
    analisesEmAndamento,
    aprovacoesPendentes,
    documentosPendentes,
    analisesRecentes,
    totalCredits,
    riskProjects,
    topCredits,
    openInconsistencies,
  };
}

export default async function DashboardPage() {
  const leadScope = await getLeadScopeFilter();
  const data = await getData(leadScope);

  const kpis = [
    { label: "Leads ativos", value: String(data.leadsAtivos) },
    { label: "Aprovações pendentes", value: String(data.aprovacoesPendentes) },
    { label: "Documentos pendentes", value: String(data.documentosPendentes) },
    { label: "Leads sem NDA", value: String(data.leadsSemNda) },
    { label: "Análises em andamento", value: String(data.analisesEmAndamento) },
  ];

  return (
    <AppShell title="Dashboard executivo" subtitle="Pipeline de leads, análises fiscais, aprovações e documentos consolidados.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardTitle className="text-xs font-medium text-muted">{kpi.label}</CardTitle>
              <p className="mt-2 text-2xl font-bold text-navy">{kpi.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle className="text-base">Leads por status</CardTitle>
            <div className="mt-3 space-y-2">
              {Object.entries(data.leadsByStatus).length === 0 ? (
                <p className="text-sm text-muted">Nenhum lead cadastrado.</p>
              ) : (
                Object.entries(data.leadsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-md border border-border p-3">
                    <Badge value={status} />
                    <span className="text-sm font-medium tabular-nums">{count}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardTitle className="text-base">Análises fiscais recentes</CardTitle>
            <div className="mt-3 space-y-2">
              {data.analisesRecentes.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma análise cadastrada ainda.</p>
              ) : (
                data.analisesRecentes.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{a.lead?.companyName}</p>
                      <p className="text-xs text-muted">{a.thesis}</p>
                    </div>
                    <Badge value={a.status} />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle className="text-base">Risco de prescrição (5 anos)</CardTitle>
            <div className="mt-3 space-y-2">
              {data.riskProjects.length === 0 ? (
                <p className="text-sm text-muted">Nenhum projeto com data de prescrição cadastrada.</p>
              ) : (
                data.riskProjects.map((p) => {
                  const days = daysUntil(p.prescriptionDate);
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted">{p.lead?.companyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{p.prescriptionDate ? dateFmt.format(p.prescriptionDate) : "—"}</p>
                        <p className={`text-xs ${days !== null && days < 180 ? "text-red-600" : "text-muted"}`}>{days !== null ? `${days} dias` : ""}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardTitle className="text-base">Maiores créditos por tese</CardTitle>
            <div className="mt-3 space-y-2">
              {data.topCredits.length === 0 ? (
                <p className="text-sm text-muted">Nenhum crédito cadastrado ainda.</p>
              ) : (
                data.topCredits.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{c.thesis ?? c.taxType}</p>
                      <p className="text-xs text-muted">{c.project?.lead?.companyName}</p>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-navy">{brl.format(Number(c.amount))}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <p className="text-xs text-muted">
          Total identificado em créditos: <strong>{brl.format(Number(data.totalCredits._sum.amount ?? 0))}</strong> · Inconsistências
          em aberto: <strong>{data.openInconsistencies}</strong>
        </p>
      </div>
    </AppShell>
  );
}
