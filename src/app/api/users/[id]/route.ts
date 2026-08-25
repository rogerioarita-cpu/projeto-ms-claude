import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/server/require-admin";

const ROLE_VALUES = [
  "admin",
  "gestor",
  "analista_fiscal",
  "juridico",
  "comercial",
  "cliente",
  "auditor",
] as const;

const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8).optional().or(z.literal("")),
  roles: z.array(z.enum(ROLE_VALUES)).min(1, "Selecione ao menos um papel"),
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: { roles: true },
    });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    });
  } catch (error) {
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
    const { name, email, password, roles } = parsed.data;

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== params.id) {
      return NextResponse.json({ error: "Esse e-mail já está em uso por outro usuário." }, { status: 409 });
    }

    // Impede o admin de remover o próprio papel de admin (evita se auto-bloquear).
    const currentUserId = (session.user as { id?: string }).id;
    if (currentUserId === params.id && !roles.includes("admin")) {
      return NextResponse.json(
        { error: "Você não pode remover seu próprio papel de admin." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.id },
        data: {
          name,
          email,
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

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/users/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o usuário." }, { status: 500 });
  }
}
