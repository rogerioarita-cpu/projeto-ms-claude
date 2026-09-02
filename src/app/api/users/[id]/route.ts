import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAdminSession } from "@/server/require-admin";
import { ROLE_VALUES } from "@/lib/role-options";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";
import { withPlatformBypass } from "@/server/tenant-db";

const STATUS_VALUES = ["ativo", "inativo", "bloqueado"] as const;

const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8).optional().or(z.literal("")),
  roles: z.array(z.enum(ROLE_VALUES)).min(1, "Selecione ao menos um papel"),
  status: z.enum(STATUS_VALUES).optional(),
  linkedLeadId: z.string().nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const user = await db.user.findUnique({
      where: { id: params.id },
      include: { roles: true, linkedLead: true },
    });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      lastAccessAt: user.lastAccessAt,
      linkedLeadId: user.linkedLeadId,
      roles: user.roles.map((r) => r.role),
    });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("GET /api/users/[id]", error);
    return NextResponse.json({ error: "Não foi possível carregar o usuário." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return NextResponse.json({ error: firstError ?? "Dados inválidos." }, { status: 400 });
    }
    const { name, email, password, roles, status, linkedLeadId } = parsed.data;

    if (roles.includes("lead_cliente") && !linkedLeadId) {
      return NextResponse.json({ error: "Selecione o Lead/Cliente vinculado para o perfil Lead/Cliente." }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);

    const target = await db.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    // E-mail é único globalmente (ver PRD seção 6.3) — usa bypass de RLS de propósito.
    const emailOwner = await withPlatformBypass((tx) => tx.user.findUnique({ where: { email } }));
    if (emailOwner && emailOwner.id !== params.id) {
      return NextResponse.json({ error: "Esse e-mail já está em uso por outro usuário." }, { status: 409 });
    }

    if (roles.includes("lead_cliente") && linkedLeadId) {
      const linkedLead = await db.lead.findUnique({ where: { id: linkedLeadId } });
      if (!linkedLead) return NextResponse.json({ error: "Lead/Cliente vinculado não encontrado." }, { status: 400 });
    }

    // Impede o admin de remover o próprio papel de admin, se bloquear ou desativar a si mesmo.
    const currentUserId = (session.user as { id?: string }).id;
    if (currentUserId === params.id) {
      if (!roles.includes("admin")) {
        return NextResponse.json({ error: "Você não pode remover seu próprio papel de admin." }, { status: 400 });
      }
      if (status && status !== "ativo") {
        return NextResponse.json({ error: "Você não pode bloquear ou desativar seu próprio usuário." }, { status: 400 });
      }
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.id },
        data: {
          name,
          email,
          status: status ?? target.status,
          linkedLeadId: roles.includes("lead_cliente") ? linkedLeadId || null : null,
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        },
      });

      await tx.userRole.deleteMany({ where: { userId: params.id } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({ userId: params.id, role })),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("PATCH /api/users/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o usuário." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const currentUserId = (session.user as { id?: string }).id;
    if (currentUserId === params.id) {
      return NextResponse.json({ error: "Você não pode excluir seu próprio usuário." }, { status: 400 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const target = await db.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    await db.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("DELETE /api/users/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o usuário." }, { status: 500 });
  }
}
