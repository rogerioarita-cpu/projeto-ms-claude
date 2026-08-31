import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const validSeverities = ["baixa", "media", "alta", "critica"] as const;

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim();
    const description = String(body.description ?? "").trim();
    const severity = String(body.severity ?? "media");
    const projectId = body.projectId ? String(body.projectId) : null;
    const resolved = Boolean(body.resolved);

    if (!code || !description) return NextResponse.json({ error: "Código e descrição são obrigatórios." }, { status: 400 });
    if (!validSeverities.includes(severity as (typeof validSeverities)[number])) return NextResponse.json({ error: "Severidade inválida." }, { status: 400 });
    const existing = await prisma.inconsistency.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Inconsistência não encontrada." }, { status: 404 });
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const inconsistency = await prisma.inconsistency.update({
      where: { id: params.id },
      data: { code, description, severity: severity as (typeof validSeverities)[number], projectId, resolved },
      include: { project: { include: { lead: true } } },
    });
    return NextResponse.json(inconsistency);
  } catch (error) {
    console.error("PUT /api/auditoria/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar a inconsistência." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.inconsistency.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Inconsistência não encontrada." }, { status: 404 });
    await prisma.inconsistency.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/auditoria/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir a inconsistência." }, { status: 500 });
  }
}
