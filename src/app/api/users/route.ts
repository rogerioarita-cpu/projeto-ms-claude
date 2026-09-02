import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/server/auth";
import { requireAdminSession } from "@/server/require-admin";
import { ROLE_VALUES } from "@/lib/role-options";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";
import { withPlatformBypass } from "@/server/tenant-db";

const STATUS_VALUES = ["ativo", "inativo", "bloqueado"] as const;

const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").optional().or(z.literal("")),
  roles: z.array(z.enum(ROLE_VALUES)).min(1, "Selecione ao menos um papel"),
  status: z.enum(STATUS_VALUES).optional(),
  linkedLeadId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    // Lista básica de usuários (id/nome/e-mail/papéis) — usada em seletores (ex.: Analista
    // responsável em Análise Fiscal). Qualquer usuário autenticado pode ler; edição continua
    // restrita a administradores (ver PATCH/DELETE em /api/users/[id]).
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { roles: true, linkedLead: true },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        lastAccessAt: u.lastAccessAt,
        createdAt: u.createdAt,
        roles: u.roles.map((r) => r.role),
        linkedLeadId: u.linkedLeadId,
        linkedLead: u.linkedLead ? { id: u.linkedLead.id, companyName: u.linkedLead.companyName } : null,
      }))
    );
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
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
    const { name, email, password, roles, status, linkedLeadId } = parsed.data;

    if (roles.includes("lead_cliente") && !linkedLeadId) {
      return NextResponse.json({ error: "Selecione o Lead/Cliente vinculado para o perfil Lead/Cliente." }, { status: 400 });
    }

    // E-mail é único globalmente (não por tenant — ver PRD seção 6.3), então
    // esta checagem usa bypass de RLS de propósito (precisa enxergar todos os tenants).
    const existing = await withPlatformBypass((tx) => tx.user.findUnique({ where: { email } }));
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);

    if (roles.includes("lead_cliente") && linkedLeadId) {
      // Garante que o Lead/Cliente vinculado pertence ao mesmo tenant do admin.
      const linkedLead = await db.lead.findUnique({ where: { id: linkedLeadId } });
      if (!linkedLead) return NextResponse.json({ error: "Lead/Cliente vinculado não encontrado." }, { status: 400 });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        status: status ?? "ativo",
        linkedLeadId: roles.includes("lead_cliente") ? linkedLeadId || null : null,
        tenantId,
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
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("POST /api/users", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o usuário." }, { status: 500 });
  }
}
