import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReadOnlySession } from "@/server/session-scope";
import { getTenantId, handleTenantError } from "@/server/tenant";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    // ChecklistItem não tem coluna própria de tenantId (herda o isolamento via
    // AnaliseFiscal) — por isso a checagem de tenant é feita manualmente aqui,
    // via o tenantId da análise à qual o item pertence.
    const tenantId = await getTenantId();

    const body = await request.json();
    const done = Boolean(body.done);
    const existing = await prisma.checklistItem.findUnique({
      where: { id: params.id },
      include: { analise: { select: { tenantId: true } } },
    });
    if (!existing || existing.analise.tenantId !== tenantId) {
      return NextResponse.json({ error: "Item de checklist não encontrado." }, { status: 404 });
    }
    const item = await prisma.checklistItem.update({ where: { id: params.id }, data: { done } });
    return NextResponse.json(item);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("PATCH /api/checklist/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o item." }, { status: 500 });
  }
}
