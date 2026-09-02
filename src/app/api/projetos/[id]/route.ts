import { NextResponse } from "next/server";
import { isReadOnlySession } from "@/server/session-scope";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";

const validStatuses = [
  "planejamento",
  "importacao",
  "auditoria",
  "analise",
  "aprovacao",
  "protocolo",
  "concluido",
] as const;

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePayload(body: any) {
  const name = String(body.name ?? "").trim();
  const leadId = body.leadId ? String(body.leadId) : null;
  const status = String(body.status ?? "planejamento");
  const periodStart = parseDate(body.periodStart);
  const periodEnd = parseDate(body.periodEnd);
  const prescriptionDate = parseDate(body.prescriptionDate);

  if (!name) throw new Error("O nome do projeto é obrigatório.");
  if (!validStatuses.includes(status as (typeof validStatuses)[number])) throw new Error("Status de projeto inválido.");
  if (body.periodStart && !periodStart) throw new Error("Data inicial inválida.");
  if (body.periodEnd && !periodEnd) throw new Error("Data final inválida.");
  if (body.prescriptionDate && !prescriptionDate) throw new Error("Data de prescrição inválida.");
  if (periodStart && periodEnd && periodStart > periodEnd) throw new Error("A data inicial não pode ser posterior à data final.");

  return { name, leadId, status: status as (typeof validStatuses)[number], periodStart, periodEnd, prescriptionDate };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const body = await request.json();
    const data = parsePayload(body);

    const existing = await db.project.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

    if (data.leadId) {
      const lead = await db.lead.findUnique({ where: { id: data.leadId } });
      if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 400 });
    }

    const project = await db.project.update({
      where: { id: params.id },
      data,
      include: { lead: true },
    });

    return NextResponse.json(project);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o projeto.";
    const status = message.includes("obrigatório") || message.includes("inválido") || message.includes("não pode") ? 400 : 500;
    console.error("PUT /api/projetos/[id]", error);
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
    const existing = await db.project.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { documents: true, inconsistencies: true, taxCredits: true } },
      },
    });

    if (!existing) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

    const totalLinked = existing._count.documents + existing._count.inconsistencies + existing._count.taxCredits;
    if (totalLinked > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir este projeto porque existem documentos, inconsistências ou créditos vinculados." },
        { status: 409 }
      );
    }

    await db.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("DELETE /api/projetos/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o projeto." }, { status: 500 });
  }
}
