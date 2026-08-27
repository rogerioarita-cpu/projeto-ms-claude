import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TAX_TYPES = ["pis_cofins", "icms", "ipi", "irpj_csll", "outros"] as const;
const STATUSES = ["em_andamento", "concluida", "aprovada", "rejeitada"] as const;
const APPROVAL_AREAS = ["juridico", "financeiro", "comercial", "concorrencia"] as const;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const analise = await prisma.analiseFiscal.findUnique({
      where: { id: params.id },
      include: { lead: true, analyst: true, checklist: { orderBy: { order: "asc" } }, approvals: true },
    });
    if (!analise) return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });
    return NextResponse.json(analise);
  } catch (error) {
    console.error("GET /api/analises/[id]", error);
    return NextResponse.json({ error: "Não foi possível carregar a análise." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const taxType = String(body.taxType ?? "");
    const thesis = String(body.thesis ?? "").trim();
    const periodStart = String(body.periodStart ?? "").trim();
    const periodEnd = String(body.periodEnd ?? "").trim();
    const estimatedCredit = body.estimatedCredit !== undefined && body.estimatedCredit !== "" ? Number(body.estimatedCredit) : 0;
    const status = String(body.status ?? "em_andamento");
    const diagnosis = body.diagnosis ? String(body.diagnosis).trim() : null;
    const analystId = body.analystId ? String(body.analystId) : null;

    if (!TAX_TYPES.includes(taxType as (typeof TAX_TYPES)[number])) return NextResponse.json({ error: "Tipo de imposto inválido." }, { status: 400 });
    if (!thesis) return NextResponse.json({ error: "A tese tributária é obrigatória." }, { status: 400 });
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    if (!Number.isFinite(estimatedCredit) || estimatedCredit < 0) return NextResponse.json({ error: "O crédito estimado deve ser um número maior ou igual a zero." }, { status: 400 });

    const existing = await prisma.analiseFiscal.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });

    const analise = await prisma.analiseFiscal.update({
      where: { id: params.id },
      data: { taxType: taxType as (typeof TAX_TYPES)[number], thesis, periodStart, periodEnd, estimatedCredit, status: status as (typeof STATUSES)[number], diagnosis, analystId },
      include: { lead: true, analyst: true, checklist: { orderBy: { order: "asc" } }, approvals: true },
    });

    // PRD 6.9: ao concluir a análise, abre-se automaticamente a votação das 4 áreas.
    if (status === "concluida" && existing.status !== "concluida") {
      await prisma.aprovacao.createMany({
        data: APPROVAL_AREAS.map((area) => ({ leadId: analise.leadId, analiseId: analise.id, area })),
        skipDuplicates: true,
      });
    }

    const refreshed = await prisma.analiseFiscal.findUnique({
      where: { id: params.id },
      include: { lead: true, analyst: true, checklist: { orderBy: { order: "asc" } }, approvals: true },
    });

    return NextResponse.json(refreshed);
  } catch (error) {
    console.error("PUT /api/analises/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar a análise." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.analiseFiscal.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });
    await prisma.analiseFiscal.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/analises/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir a análise." }, { status: 500 });
  }
}
