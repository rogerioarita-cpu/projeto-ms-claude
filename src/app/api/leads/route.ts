import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLeadPayload } from "@/lib/leads/validate";

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: true },
    });
    return NextResponse.json(leads);
  } catch (error) {
    console.error("GET /api/leads", error);
    return NextResponse.json({ error: "Não foi possível carregar os leads." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = parseLeadPayload(body);
    const lead = await prisma.lead.create({ data, include: { owner: true } });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível cadastrar o lead.";
    const status = /obrigatóri|inválid|deve ter|deve ser/.test(message) ? 400 : 500;
    console.error("POST /api/leads", error);
    return NextResponse.json({ error: message }, { status });
  }
}
