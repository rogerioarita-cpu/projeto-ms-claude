import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withPlatformBypass } from "@/server/tenant-db";
import { requirePlatformSuperAdminSession } from "@/server/require-platform-admin";
import { resolveActiveTenantId } from "@/server/tenant";

export async function GET() {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    // Bypass de propósito: super-admins podem existir em qualquer tenant —
    // esta listagem é, por natureza, cross-tenant.
    const admins = await withPlatformBypass((tx) =>
      tx.user.findMany({
        where: { isPlatformSuperAdmin: true },
        orderBy: { createdAt: "asc" },
        include: { tenant: true },
      })
    );

    return NextResponse.json(
      admins.map((u) => ({ id: u.id, name: u.name, email: u.email, status: u.status, tenantName: u.tenant.name }))
    );
  } catch (error) {
    console.error("GET /api/plataforma/super-admins", error);
    return NextResponse.json({ error: "Não foi possível carregar os super-administradores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const password = body.password ? String(body.password) : "";

    if (!email) return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });

    const existing = await withPlatformBypass((tx) => tx.user.findUnique({ where: { email }, include: { tenant: true } }));

    // Usuário já existe em algum tenant: apenas promove (mesmo comportamento de antes).
    if (existing) {
      if (existing.isPlatformSuperAdmin) {
        return NextResponse.json({ error: "Este usuário já é super-administrador." }, { status: 409 });
      }
      const updated = await withPlatformBypass((tx) =>
        tx.user.update({ where: { id: existing.id }, data: { isPlatformSuperAdmin: true }, include: { tenant: true } })
      );
      return NextResponse.json(
        { id: updated.id, name: updated.name, email: updated.email, tenantName: updated.tenant.name },
        { status: 201 }
      );
    }

    // Usuário não existe: cria do zero. Precisa de nome e, se for logar por
    // e-mail/senha, de senha com pelo menos 8 caracteres (se não informada, o
    // usuário cadastra no primeiro acesso, como no cadastro normal de usuários).
    if (!name) return NextResponse.json({ error: "Informe o nome do novo super-administrador." }, { status: 400 });
    if (password && password.length < 8) {
      return NextResponse.json({ error: "A senha precisa ter ao menos 8 caracteres." }, { status: 400 });
    }

    // O novo super-admin precisa de um tenant "de origem" (a coluna é obrigatória
    // no banco) — usamos a organização que o super-admin que está criando está
    // acessando no momento; isso não limita, na prática, o acesso dele depois
    // (super-admins escolhem a organização no seletor no topo do menu).
    const tenantId = await resolveActiveTenantId();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const created = await withPlatformBypass((tx) =>
      tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          status: "ativo",
          tenantId,
          isPlatformSuperAdmin: true,
          roles: { create: [{ role: "admin" }] },
        },
        include: { tenant: true },
      })
    );

    return NextResponse.json(
      { id: created.id, name: created.name, email: created.email, tenantName: created.tenant.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/plataforma/super-admins", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o super-administrador." }, { status: 500 });
  }
}
