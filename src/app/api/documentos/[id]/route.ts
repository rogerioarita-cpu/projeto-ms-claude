import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const docType = body.docType ? String(body.docType).trim() : null;
    const storagePath = body.storagePath ? String(body.storagePath).trim() : null;
    const projectId = body.projectId ? String(body.projectId) : null;
    const version = Number(body.version ?? 1);
    if (!name) return NextResponse.json({ error: "O nome do documento é obrigatório." }, { status: 400 });
    if (!Number.isInteger(version) || version < 1) return NextResponse.json({ error: "A versão deve ser um número inteiro maior que zero." }, { status: 400 });
    const existing = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 400 });
    }
    const document = await prisma.document.update({
      where: { id: params.id },
      data: { name, docType, storagePath, version, projectId },
      include: { project: { include: { client: true } }, uploadedBy: true },
    });
    return NextResponse.json(document);
  } catch (error) {
    console.error("PUT /api/documentos/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o documento." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    await prisma.document.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documentos/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o documento." }, { status: 500 });
  }
}
