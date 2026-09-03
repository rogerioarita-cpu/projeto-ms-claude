import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withPlatformBypass } from "@/server/tenant-db";
import { requirePlatformSuperAdminSession } from "@/server/require-platform-admin";
import { sendPasswordChangedEmail } from "@/server/mail";

const STATUS_VALUES = ["ativo", "inativo", "bloqueado"] as const;

const updateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").optional().or(z.literal("")),
  status: z.enum(STATUS_VALUES).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return NextResponse.json({ error: firstError ?? "Dados inválidos." }, { status: 400 });
    }
    const { name, email, password, status } = parsed.data;

    // Bypass de propósito: um super-admin pode pertencer a um tenant diferente
    // do que o admin logado está acessando no momento (ver seletor de organização).
    // Considera tanto o flag quanto o papel "super_admin" (ver nota em GET /api/plataforma/super-admins).
    const target = await withPlatformBypass((tx) => tx.user.findUnique({ where: { id: params.id }, include: { roles: true } }));
    const targetIsSuperAdmin = target && (target.isPlatformSuperAdmin || target.roles.some((r) => r.role === "super_admin"));
    if (!target || !targetIsSuperAdmin) {
      return NextResponse.json({ error: "Super-administrador não encontrado." }, { status: 404 });
    }

    // E-mail é único globalmente (PRD 6.3).
    const emailOwner = await withPlatformBypass((tx) => tx.user.findUnique({ where: { email } }));
    if (emailOwner && emailOwner.id !== params.id) {
      return NextResponse.json({ error: "Esse e-mail já está em uso por outro usuário." }, { status: 409 });
    }

    const currentUserId = (session.user as { id?: string }).id;
    if (currentUserId === params.id && status && status !== "ativo") {
      return NextResponse.json({ error: "Você não pode bloquear ou desativar seu próprio usuário." }, { status: 400 });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    const updated = await withPlatformBypass((tx) =>
      tx.user.update({
        where: { id: params.id },
        data: {
          name,
          email,
          status: status ?? target.status,
          isPlatformSuperAdmin: true, // reforça a sincronia com o papel "super_admin" a cada edição
          ...(passwordHash ? { passwordHash } : {}),
          ...(passwordHash && target.passwordResetRequestedAt ? { passwordResetRequestedAt: null } : {}),
        },
      })
    );

    // Fora da transação (best-effort): responde ao solicitante confirmando a alteração.
    if (passwordHash && target.passwordResetRequestedAt) {
      await sendPasswordChangedEmail({ name, email, tenantId: target.tenantId });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
    });
  } catch (error) {
    console.error("PATCH /api/plataforma/super-admins/[id]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o super-administrador." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const currentUserId = (session.user as { id?: string }).id;
    if (currentUserId === params.id) {
      return NextResponse.json({ error: "Você não pode remover seu próprio acesso de super-administrador." }, { status: 400 });
    }

    const totalAdmins = await withPlatformBypass((tx) =>
      tx.user.count({ where: { OR: [{ isPlatformSuperAdmin: true }, { roles: { some: { role: "super_admin" } } }] } })
    );
    if (totalAdmins <= 1) {
      return NextResponse.json({ error: "Não é possível remover o último super-administrador da plataforma." }, { status: 400 });
    }

    const existing = await withPlatformBypass((tx) => tx.user.findUnique({ where: { id: params.id }, include: { roles: true } }));
    const existingIsSuperAdmin = existing && (existing.isPlatformSuperAdmin || existing.roles.some((r) => r.role === "super_admin"));
    if (!existing || !existingIsSuperAdmin) {
      return NextResponse.json({ error: "Super-administrador não encontrado." }, { status: 404 });
    }

    await withPlatformBypass((tx) =>
      tx.user.update({
        where: { id: params.id },
        data: {
          isPlatformSuperAdmin: false,
          roles: { deleteMany: { role: "super_admin" } },
        },
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/plataforma/super-admins/[id]", error);
    return NextResponse.json({ error: "Não foi possível remover o super-administrador." }, { status: 500 });
  }
}
