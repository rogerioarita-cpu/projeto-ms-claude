import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";
import { dateFmt, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WorkflowPage() {
  const projects = await prisma.project.findMany({
    orderBy: { prescriptionDate: "asc" },
    include: { client: true },
  });

  return (
    <AppShell title="Workflow tributário" subtitle="Etapas do fluxo jurídico-fiscal por projeto.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => {
          const days = daysUntil(p.prescriptionDate);
          const atRisk = days !== null && days < 180;
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <Badge value={p.status} />
              </div>
              <p className="mt-1 text-xs text-muted">{p.client?.name}</p>

              <div className="mt-4 space-y-1 text-sm">
                <p>
                  <span className="text-muted">Período: </span>
                  {p.periodStart ? dateFmt.format(p.periodStart) : "—"} –{" "}
                  {p.periodEnd ? dateFmt.format(p.periodEnd) : "—"}
                </p>
                <p>
                  <span className="text-muted">Prescrição: </span>
                  {p.prescriptionDate ? dateFmt.format(p.prescriptionDate) : "—"}
                </p>
              </div>

              {atRisk ? (
                <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  ⚠ Risco de prescrição em {days} dias
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
