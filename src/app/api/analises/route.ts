import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLeadScopeFilter, isReadOnlySession } from "@/server/session-scope";

const TAX_TYPES = ["pis_cofins", "icms", "ipi", "irpj_csll", "outros"] as const;
const STATUSES = ["em_andamento", "concluida", "aprovada", "rejeitada"] as const;

export async function GET() {
  try {
    const leadScope = await getLeadScopeFilter();
    const analises = await prisma.analiseFiscal.findMany({
      where: leadScope ? { leadId: leadScope } : undefined,
      orderBy: { createdAt: "desc" },
      include: { lead: true, analyst: true, checklist: { orderBy: { order: "asc" } }, approvals: true },
    });
    return NextResponse.json(analises);
  } catch (error) {
    console.error("GET /api/analises", error);
    return NextResponse.json({ error: "Não foi possível carregar as análises fiscais." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const body = await request.json();
    const leadId = String(body.leadId ?? "");
    const taxType = String(body.taxType ?? "");
    const thesis = String(body.thesis ?? "").trim();
    const periodStart = String(body.periodStart ?? "").trim();
    const periodEnd = String(body.periodEnd ?? "").trim();
    const estimatedCredit = body.estimatedCredit !== undefined && body.estimatedCredit !== "" ? Number(body.estimatedCredit) : 0;
    const status = body.status ? String(body.status) : "em_andamento";
    const diagnosis = body.diagnosis ? String(body.diagnosis).trim() : null;
    const analystId = body.analystId ? String(body.analystId) : null;
    const checklist: string[] = Array.isArray(body.checklist) ? body.checklist.filter((c: unknown) => typeof c === "string" && c.trim()) : [];

    if (!leadId) return NextResponse.json({ error: "Selecione o lead." }, { status: 400 });
    if (!TAX_TYPES.includes(taxType as (typeof TAX_TYPES)[number])) return NextResponse.json({ error: "Tipo de imposto inválido." }, { status: 400 });
    if (!thesis) return NextResponse.json({ error: "A tese tributária é obrigatória." }, { status: 400 });
    if (!periodStart || !periodEnd) return NextResponse.json({ error: "Informe o período de início e fim." }, { status: 400 });
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    if (!Number.isFinite(estimatedCredit) || estimatedCredit < 0) return NextResponse.json({ error: "O crédito estimado deve ser um número maior ou igual a zero." }, { status: 400 });

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 400 });

    const analise = await prisma.analiseFiscal.create({
      data: {
        leadId,
        taxType: taxType as (typeof TAX_TYPES)[number],
        thesis,
        periodStart,
        periodEnd,
        estimatedCredit,
        status: status as (typeof STATUSES)[number],
        diagnosis,
        analystId,
        checklist: { create: checklist.map((description, order) => ({ description: description.trim(), order })) },
      },
      include: { lead: true, analyst: true, checklist: { orderBy: { order: "asc" } }, approvals: true },
    });

    return NextResponse.json(analise, { status: 201 });
  } catch (error) {
    console.error("POST /api/analises", error);
    return NextResponse.json({ error: "Não foi possível cadastrar a análise fiscal." }, { status: 500 });
  }
}
