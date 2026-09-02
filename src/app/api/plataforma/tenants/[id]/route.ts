import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSuperAdminSession } from "@/server/require-platform-admin";

const TENANT_STATUSES = ["ativo", "suspenso", "cancelado"] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const status = String(body.status ?? "");
    if (!TENANT_STATUSES.includes(status as (typeof TENANT_STATUSES)[number])) {
      return NextResponse.json({ error: "Status de organização inválido." }, { status: 400 });
    }

    const existing = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: { status: status as (typeof TENANT_STATUSES)[number] },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("PATCH /api/plataforma/tenants/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar a organização." }, { status: 500 });
  }
}
