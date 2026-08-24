import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { brl, dateFmt, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getData() {
  const [totalCredits, creditsByStatus, riskProjects, topCredits] = await Promise.all([
    prisma.taxCredit.aggregate({ _sum: { amount: true } }),
    prisma.taxCredit.groupBy({ by: ["status"], _sum: { amount: true }, _count: true }),
    prisma.project.findMany({
      where: { prescriptionDate: { not: null } },
      orderBy: { prescriptionDate: "asc" },
      take: 5,
      include: { client: true },
    }),
    prisma.taxCredit.findMany({
      orderBy: { amount: "desc" },
      take: 5,
      include: { project: { include: { client: true } } },
    }),
  ]);

  const openInconsistencies = await prisma.inconsistency.count({ where: { resolved: false } });

  return { totalCredits, creditsByStatus, riskProjects, topCredits, openInconsistencies };
}

export default async function DashboardPage() {
  const { totalCredits, riskProjects, topCredits, openInconsistencies } = await getData();

  const kpis = [
    { label: "Total identificado em créditos", value: brl.format(Number(totalCredits._sum.amount ?? 0)) },
    { label: "Inconsistências em aberto", value: String(openInconsistencies) },
    { label: "Projetos com risco de prescrição", value: String(riskProjects.length) },
  ];

  return (
    <AppShell title="Dashboard executivo" subtitle="Créditos, auditoria SPED e risco de prescrição consolidados.">
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardTitle className="text-muted-foreground text-xs font-medium">{kpi.label}</CardTitle>
            <p className="mt-2 text-2xl font-bold text-navy">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="text-base">Risco de prescrição (5 anos)</CardTitle>
          <div className="mt-3 space-y-2">
            {riskProjects.length === 0 ? (
              <p className="text-sm text-muted">Nenhum projeto com data de prescrição cadastrada.</p>
            ) : (
              riskProjects.map((p) => {
                const days = daysUntil(p.prescriptionDate);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.client?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{p.prescriptionDate ? dateFmt.format(p.prescriptionDate) : "—"}</p>
                      <p className={`text-xs ${days !== null && days < 180 ? "text-red-600" : "text-muted"}`}>
                        {days !== null ? `${days} dias` : ""}
                      </p>
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
            {topCredits.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{c.thesis ?? c.taxType}</p>
                  <p className="text-xs text-muted">{c.project?.client?.name}</p>
                </div>
                <p className="text-sm font-medium text-navy tabular-nums">{brl.format(Number(c.amount))}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
