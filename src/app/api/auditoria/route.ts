import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const inconsistencies = await prisma.inconsistency.findMany({
      orderBy: [{ resolved: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
      include: { project: { include: { lead: true } } },
    });
    return NextResponse.json(inconsistencies);
  } catch (error) {
    console.error("GET /api/auditoria", error);
    return NextResponse.json({ error: "Não foi possível carregar as inconsistências." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim();
    const description = String(body.description ?? "").trim();
    const severity = String(body.severity ?? "media");
    const projectId = body.projectId ? String(body.projectId) : null;

    if (!code || !description) {
      return NextResponse.json({ error: "Código e descrição são obrigatórios." }, { status: 400 });
    }
    if (!["baixa", "media", "alta", "critica"].includes(severity)) {
      return NextResponse.json({ error: "Severidade inválida." }, { status: 400 });
    }
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const inconsistency = await prisma.inconsistency.create({
      data: { code, description, severity: severity as "baixa" | "media" | "alta" | "critica", projectId },
      include: { project: { include: { lead: true } } },
    });
    return NextResponse.json(inconsistency, { status: 201 });
  } catch (error) {
    console.error("POST /api/auditoria", error);
    return NextResponse.json({ error: "Não foi possível criar a inconsistência." }, { status: 500 });
  }
}
