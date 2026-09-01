import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReadOnlySession, getLeadScopeFilter } from "@/server/session-scope";

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
  if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
    throw new Error("Status de projeto inválido.");
  }
  if (body.periodStart && !periodStart) throw new Error("Data inicial inválida.");
  if (body.periodEnd && !periodEnd) throw new Error("Data final inválida.");
  if (body.prescriptionDate && !prescriptionDate) throw new Error("Data de prescrição inválida.");
  if (periodStart && periodEnd && periodStart > periodEnd) {
    throw new Error("A data inicial não pode ser posterior à data final.");
  }

  return { name, leadId, status: status as (typeof validStatuses)[number], periodStart, periodEnd, prescriptionDate };
}

export async function GET() {
  try {
    const leadScope = await getLeadScopeFilter();
    const projects = await prisma.project.findMany({
      where: leadScope ? { leadId: leadScope } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        lead: true,
        _count: { select: { documents: true, inconsistencies: true, taxCredits: true } },
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projetos", error);
    return NextResponse.json({ error: "Não foi possível carregar os projetos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const body = await request.json();
    const data = parsePayload(body);

    if (data.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
      if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 400 });
    }

    const project = await prisma.project.create({
      data,
      include: { lead: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o projeto.";
    const status = message.includes("obrigatório") || message.includes("inválido") || message.includes("não pode") ? 400 : 500;
    console.error("POST /api/projetos", error);
    return NextResponse.json({ error: message }, { status });
  }
}
