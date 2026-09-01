import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReadOnlySession } from "@/server/session-scope";

const DOC_STATUSES = ["enviado", "pendente", "validado", "rejeitado"] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // Usado pelo accordion de documentos para revisar o status (Enviado → Pendente → Validado/Rejeitado).
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const body = await request.json();
    const status = String(body.status ?? "");
    if (!DOC_STATUSES.includes(status as (typeof DOC_STATUSES)[number])) {
      return NextResponse.json({ error: "Status de documento inválido." }, { status: 400 });
    }
    const existing = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    const document = await prisma.document.update({
      where: { id: params.id },
      data: { status: status as (typeof DOC_STATUSES)[number] },
      include: { lead: true, uploadedBy: true },
    });
    return NextResponse.json(document);
  } catch (error) {
    console.error("PATCH /api/documentos/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o status do documento." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const existing = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    await prisma.document.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documentos/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o documento." }, { status: 500 });
  }
}
