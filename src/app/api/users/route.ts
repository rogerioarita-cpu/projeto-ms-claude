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

const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
  roles: z.array(z.enum(ROLE_VALUES)).min(1, "Selecione ao menos um papel"),
});

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { roles: true },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        roles: u.roles.map((r) => r.role),
      }))
    );
  } catch (error) {
    console.error("GET /api/users", error);
    return NextResponse.json({ error: "Não foi possível carregar os usuários." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return NextResponse.json({ error: firstError ?? "Dados inválidos." }, { status: 400 });
    }
    const { name, email, password, roles } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roles: { create: roles.map((role) => ({ role })) },
      },
      include: { roles: true },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles.map((r) => r.role),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o usuário." }, { status: 500 });
  }
}
