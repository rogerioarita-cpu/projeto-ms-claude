import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { parseLeadPayload } from "@/lib/leads/validate";
import { isReadOnlySession } from "@/server/session-scope";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const body = await request.json();
    const data = parseLeadPayload(body);
    // O filtro de tenant já está embutido nesta consulta (via `db`), então um
    // lead de outro tenant simplesmente não é encontrado — não vaza como 403,
    // vira 404, que é o comportamento correto (não revela que o registro existe).
    const existing = await db.lead.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

    // "Cliente" não é editável manualmente: uma vez marcado permanece marcado,
    // e passa a ser true automaticamente quando o status muda para "contrato".
    const isClient = existing.isClient || data.status === "contrato" || data.status === "aprovado";
    const clientFlagChanged = existing.isClient !== isClient;

    const lead = await db.lead.update({
      where: { id: params.id },
      data: {
        ...data,
        isClient,
        // Registra a alteração do campo "Cliente", com quem alterou (via mudança de status) e quando.
        // Escrita aninhada: a extensão tenant-aware não intercepta sub-operações,
        // por isso o tenantId é incluído manualmente aqui.
        ...(clientFlagChanged
          ? { clientFlagLogs: { create: { value: isClient, changedById: userId, tenantId } } }
          : {}),
      },
      include: { owner: true, clientFlagLogs: { orderBy: { changedAt: "desc" }, take: 5, include: { changedBy: { select: { name: true, email: true } } } } },
    });
    return NextResponse.json(lead);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o lead.";
    const status = /obrigatóri|inválid|deve ter|deve ser/.test(message) ? 400 : 500;
    console.error("PUT /api/leads/[id]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const existing = await db.lead.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    await db.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("DELETE /api/leads/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o lead." }, { status: 500 });
  }
}
