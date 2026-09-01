import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { parseLeadPayload } from "@/lib/leads/validate";
import { isReadOnlySession } from "@/server/session-scope";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const body = await request.json();
    const data = parseLeadPayload(body);
    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

    // "Cliente" não é editável manualmente: uma vez marcado permanece marcado,
    // e passa a ser true automaticamente quando o status muda para "contrato".
    const isClient = existing.isClient || data.status === "contrato" || data.status === "aprovado";
    const clientFlagChanged = existing.isClient !== isClient;

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...data,
        isClient,
        // Registra a alteração do campo "Cliente", com quem alterou (via mudança de status) e quando.
        ...(clientFlagChanged
          ? { clientFlagLogs: { create: { value: isClient, changedById: userId } } }
          : {}),
      },
      include: { owner: true, clientFlagLogs: { orderBy: { changedAt: "desc" }, take: 5, include: { changedBy: { select: { name: true, email: true } } } } },
    });
    return NextResponse.json(lead);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o lead.";
    const status = /obrigatóri|inválid|deve ter|deve ser/.test(message) ? 400 : 500;
    console.error("PUT /api/leads/[id]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    await prisma.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/leads/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o lead." }, { status: 500 });
  }
}
