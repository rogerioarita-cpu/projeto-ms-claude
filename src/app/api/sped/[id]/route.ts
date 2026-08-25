import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const spedFile = await prisma.spedFile.findUnique({
      where: { id: params.id },
      include: {
        project: { include: { client: true } },
        uploadedBy: true,
      },
    });
    if (!spedFile) return NextResponse.json({ error: "Arquivo SPED não encontrado." }, { status: 404 });
    return NextResponse.json(spedFile);
  } catch (error) {
    console.error("GET /api/sped/[id]", error);
    return NextResponse.json({ error: "Não foi possível carregar o arquivo SPED." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.spedFile.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Arquivo SPED não encontrado." }, { status: 404 });
    await prisma.spedFile.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sped/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o arquivo SPED." }, { status: 500 });
  }
}
