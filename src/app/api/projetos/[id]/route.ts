import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const clientId = body.clientId ? String(body.clientId) : null;
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

  return { name, clientId, status: status as (typeof validStatuses)[number], periodStart, periodEnd, prescriptionDate };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = parsePayload(body);

    const existing = await prisma.project.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

    if (data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: data.clientId } });
      if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data,
      include: { client: true },
    });

    return NextResponse.json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o projeto.";
    const status = message.includes("obrigatório") || message.includes("inválido") || message.includes("não pode") ? 400 : 500;
    console.error("PUT /api/projetos/[id]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.project.findUnique({
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

    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projetos/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o projeto." }, { status: 500 });
  }
}
