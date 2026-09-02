import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { brl } from "@/lib/format";
import { getTenantId, forTenant } from "@/server/tenant";

export const dynamic = "force-dynamic";

export default async function CreditosPage() {
  const tenantId = await getTenantId();
  const db = forTenant(tenantId);
  const credits = await db.taxCredit.findMany({
    orderBy: { amount: "desc" },
    include: { project: { include: { lead: true } } },
  });

  const total = credits.reduce((acc, c) => acc + Number(c.amount), 0);

  return (
    <AppShell title="Recuperação de créditos" subtitle="Teses identificadas por projeto e status.">
      <Card>
        <CardTitle className="text-base">Total identificado: {brl.format(total)}</CardTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-4">Tese</th>
                <th className="py-2 pr-4">Tributo</th>
                <th className="py-2 pr-4">Projeto / Lead</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">{c.thesis ?? "—"}</td>
                  <td className="py-2 pr-4">{c.taxType}</td>
                  <td className="py-2 pr-4 text-muted">
                    {c.project?.name}
                    <br />
                    <span className="text-xs">{c.project?.lead?.companyName}</span>
                  </td>
                  <td className="py-2 pr-4 font-medium tabular-nums">{brl.format(Number(c.amount))}</td>
                  <td className="py-2 pr-4">
                    <Badge value={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
