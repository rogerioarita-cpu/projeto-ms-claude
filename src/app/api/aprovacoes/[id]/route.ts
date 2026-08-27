import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AREAS = ["juridico", "financeiro", "comercial", "concorrencia"] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const status = String(body.status ?? "");
    const decidedBy = body.decidedBy ? String(body.decidedBy).trim() : null;
    const note = body.note ? String(body.note).trim() : null;

    if (!["aprovado", "rejeitado"].includes(status)) {
      return NextResponse.json({ error: "Decisão inválida." }, { status: 400 });
    }
    if (!decidedBy) return NextResponse.json({ error: "Informe o responsável pela decisão." }, { status: 400 });
    if (status === "rejeitado" && !note) {
      return NextResponse.json({ error: "A observação é obrigatória em caso de rejeição." }, { status: 400 });
    }

    const existing = await prisma.aprovacao.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Aprovação não encontrada." }, { status: 404 });

    await prisma.aprovacao.update({
      where: { id: params.id },
      data: { status: status as "aprovado" | "rejeitado", decidedBy, note, decidedAt: new Date() },
    });

    // Regra do PRD 6.9: aprovação final requer unanimidade das 4 áreas.
    // Qualquer rejeição reprova a análise; unanimidade de aprovação a aprova.
    const allApprovals = await prisma.aprovacao.findMany({ where: { analiseId: existing.analiseId } });
    const hasRejection = allApprovals.some((a) => a.status === "rejeitado");
    const allApproved = AREAS.every((area) => allApprovals.find((a) => a.area === area)?.status === "aprovado");

    if (hasRejection) {
      await prisma.analiseFiscal.update({ where: { id: existing.analiseId }, data: { status: "rejeitada" } });
    } else if (allApproved) {
      await prisma.analiseFiscal.update({ where: { id: existing.analiseId }, data: { status: "aprovada" } });
    }

    const refreshed = await prisma.aprovacao.findUnique({
      where: { id: params.id },
      include: { lead: true, analise: true },
    });

    return NextResponse.json(refreshed);
  } catch (error) {
    console.error("PATCH /api/aprovacoes/[id]", error);
    return NextResponse.json({ error: "Não foi possível registrar a decisão." }, { status: 500 });
  }
}
