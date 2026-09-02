import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSuperAdminSession } from "@/server/require-platform-admin";

const TENANT_STATUSES = ["ativo", "suspenso", "cancelado"] as const;
const SLUG_RE = /^[a-z0-9-]+$/;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const existing = await prisma.tenant.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });

    const data: { name?: string; slug?: string; status?: (typeof TENANT_STATUSES)[number] } = {};

    // Suporta tanto a troca de status isolada (botões Suspender/Reativar)
    // quanto a edição de nome/slug (formulário de edição), no mesmo endpoint.
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!TENANT_STATUSES.includes(status as (typeof TENANT_STATUSES)[number])) {
        return NextResponse.json({ error: "Status de organização inválido." }, { status: 400 });
      }
      data.status = status as (typeof TENANT_STATUSES)[number];
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "O nome da organização é obrigatório." }, { status: 400 });
      data.name = name;
    }

    if (body.slug !== undefined) {
      const slug = String(body.slug).trim();
      if (!slug) return NextResponse.json({ error: "O identificador (slug) é obrigatório." }, { status: 400 });
      if (!SLUG_RE.test(slug)) {
        return NextResponse.json({ error: "Use apenas letras minúsculas, números e hífen no identificador." }, { status: 400 });
      }
      if (slug !== existing.slug) {
        const slugOwner = await prisma.tenant.findUnique({ where: { slug } });
        if (slugOwner && slugOwner.id !== params.id) {
          return NextResponse.json({ error: "Já existe uma organização com esse identificador (slug)." }, { status: 409 });
        }
      }
      data.slug = slug;
    }

    const tenant = await prisma.tenant.update({ where: { id: params.id }, data });

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("PATCH /api/plataforma/tenants/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar a organização." }, { status: 500 });
  }
}
