import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

const STAGES = [
  ["prospeccao", "Prospecção"],
  ["qualificacao", "Qualificação"],
  ["diagnostico", "Diagnóstico"],
  ["proposta", "Proposta"],
  ["negociacao", "Negociação"],
  ["contrato", "Contrato"],
  ["onboarding", "Onboarding"],
  ["execucao", "Execução"],
  ["encerrado", "Encerrado"],
] as const;

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <AppShell title="Pipeline de leads" subtitle="9 fases, da prospecção ao encerramento.">
      <div className="grid gap-4 overflow-x-auto md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map(([key, label]) => {
          const items = leads.filter((l) => l.stage === key);
          return (
            <Card key={key} className="min-w-56">
              <CardTitle className="flex items-center justify-between text-sm">
                {label}
                <span className="text-xs font-normal text-muted">{items.length}</span>
              </CardTitle>
              <div className="mt-3 space-y-2">
                {items.map((l) => (
                  <div key={l.id} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium">{l.companyName}</p>
                    <p className="text-xs text-muted">{l.contactName}</p>
                    <p className="mt-2 text-sm font-medium tabular-nums text-navy">
                      {brl.format(Number(l.estimatedValue))}
                    </p>
                  </div>
                ))}
                {items.length === 0 ? <p className="text-xs text-muted">Sem leads nesta fase.</p> : null}
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
