import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLeadPayload } from "@/lib/leads/validate";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const data = parseLeadPayload(body);
    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    const lead = await prisma.lead.update({ where: { id: params.id }, data, include: { owner: true } });
    return NextResponse.json(lead);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o lead.";
    const status = /obrigatóri|inválid|deve ter|deve ser/.test(message) ? 400 : 500;
    console.error("PUT /api/leads/[id]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    await prisma.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/leads/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o lead." }, { status: 500 });
  }
}
