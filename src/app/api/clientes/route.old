import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanCnpj(value: unknown) {
  if (!value) return null;
  return String(value).replace(/\D/g, "");
}

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true } } },
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clientes", error);
    return NextResponse.json({ error: "Não foi possível carregar os clientes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const cnpj = cleanCnpj(body.cnpj);
    const segment = body.segment ? String(body.segment).trim() : null;

    if (!name) return NextResponse.json({ error: "Nome / Razão social é obrigatório." }, { status: 400 });
    if (cnpj && cnpj.length !== 14) return NextResponse.json({ error: "O CNPJ deve possuir 14 dígitos." }, { status: 400 });

    const client = await prisma.client.create({ data: { name, cnpj, segment } });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("POST /api/clientes", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o cliente." }, { status: 500 });
  }
}
