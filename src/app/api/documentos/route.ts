import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      include: { project: { include: { client: true } }, uploadedBy: true },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET /api/documentos", error);
    return NextResponse.json({ error: "Não foi possível carregar os documentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const docType = body.docType ? String(body.docType).trim() : null;
    const storagePath = body.storagePath ? String(body.storagePath).trim() : null;
    const projectId = body.projectId ? String(body.projectId) : null;
    const version = Number(body.version ?? 1);

    if (!name) return NextResponse.json({ error: "O nome do documento é obrigatório." }, { status: 400 });
    if (!Number.isInteger(version) || version < 1) return NextResponse.json({ error: "A versão deve ser um número inteiro maior que zero." }, { status: 400 });

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 400 });
    }

    const uploadedById = (session?.user as { id?: string } | undefined)?.id;
    const document = await prisma.document.create({
      data: { name, docType, storagePath, version, projectId, uploadedById },
      include: { project: { include: { client: true } }, uploadedBy: true },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("POST /api/documentos", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o documento." }, { status: 500 });
  }
}
