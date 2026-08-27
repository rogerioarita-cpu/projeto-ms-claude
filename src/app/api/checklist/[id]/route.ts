import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const done = Boolean(body.done);
    const existing = await prisma.checklistItem.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Item de checklist não encontrado." }, { status: 404 });
    const item = await prisma.checklistItem.update({ where: { id: params.id }, data: { done } });
    return NextResponse.json(item);
  } catch (error) {
    console.error("PATCH /api/checklist/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o item." }, { status: 500 });
  }
}
