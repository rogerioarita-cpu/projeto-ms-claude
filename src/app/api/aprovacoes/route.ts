import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const approvals = await prisma.aprovacao.findMany({
      orderBy: { createdAt: "desc" },
      include: { lead: true, analise: true },
    });
    return NextResponse.json(approvals);
  } catch (error) {
    console.error("GET /api/aprovacoes", error);
    return NextResponse.json({ error: "Não foi possível carregar as aprovações." }, { status: 500 });
  }
}
