import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanCnpj(value: unknown) {
  if (!value) return null;
  return String(value).replace(/\D/g, "");
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const cnpj = cleanCnpj(body.cnpj);
    const segment = body.segment ? String(body.segment).trim() : null;

    if (!name) return NextResponse.json({ error: "Nome / Razão social é obrigatório." }, { status: 400 });
    if (cnpj && cnpj.length !== 14) return NextResponse.json({ error: "O CNPJ deve possuir 14 dígitos." }, { status: 400 });

    const existing = await prisma.client.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const client = await prisma.client.update({ where: { id: params.id }, data: { name, cnpj, segment } });
    return NextResponse.json(client);
  } catch (error) {
    console.error("PUT /api/clientes/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o cliente." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.client.findUnique({
      where: { id: params.id },
      include: { _count: { select: { projects: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    if (existing._count.projects > 0) {
      return NextResponse.json({ error: "Não é possível excluir este cliente porque existem projetos vinculados." }, { status: 409 });
    }
    await prisma.client.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/clientes/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o cliente." }, { status: 500 });
  }
}
