import { NextResponse } from "next/server";
import { getLeadScopeFilter } from "@/server/session-scope";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const leadScope = await getLeadScopeFilter();
    const approvals = await db.aprovacao.findMany({
      where: leadScope ? { leadId: leadScope } : undefined,
      orderBy: { createdAt: "desc" },
      include: { lead: true, analise: true },
    });
    return NextResponse.json(approvals);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("GET /api/aprovacoes", error);
    return NextResponse.json({ error: "Não foi possível carregar as aprovações." }, { status: 500 });
  }
}
