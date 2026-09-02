import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPlatformBypass } from "@/server/tenant-db";
import { requirePlatformSuperAdminSession } from "@/server/require-platform-admin";
import { ROLE_LABELS } from "@/lib/role-options";
import { sendWelcomeEmail } from "@/server/mail";

const createTenantSchema = z.object({
  tenantName: z.string().min(1, "O nome da organização é obrigatório"),
  tenantSlug: z
    .string()
    .min(1, "O identificador (slug) é obrigatório")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  adminName: z.string().min(1, "O nome do administrador é obrigatório"),
  adminEmail: z.string().email("E-mail inválido"),
  adminPassword: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").optional().or(z.literal("")),
  sendWelcomeEmail: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    // Tenant é o topo da hierarquia (não tem tenantId, não passa por RLS/forTenant).
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, leads: true } } },
    });

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("GET /api/plataforma/tenants", error);
    return NextResponse.json({ error: "Não foi possível carregar as organizações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      return NextResponse.json({ error: firstError ?? "Dados inválidos." }, { status: 400 });
    }
    const { tenantName, tenantSlug, adminName, adminEmail, adminPassword, sendWelcomeEmail: shouldSendEmail } = parsed.data;

    const existingSlug = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingSlug) {
      return NextResponse.json({ error: "Já existe uma organização com esse identificador (slug)." }, { status: 409 });
    }

    // E-mail é único globalmente entre tenants (PRD 6.3) — checagem cross-tenant via bypass.
    const existingEmail = await withPlatformBypass((tx) => tx.user.findUnique({ where: { email: adminEmail } }));
    if (existingEmail) {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }

    const passwordHash = adminPassword ? await bcrypt.hash(adminPassword, 10) : null;

    // Cria o tenant e seu primeiro admin numa única transação com bypass de RLS:
    // o novo usuário pertence a um tenant que ainda não existia no início da
    // requisição, então não há como usar `forTenant()` (que sempre escopa a
    // um único tenant já conhecido) — e queremos as duas gravações atômicas.
    const result = await withPlatformBypass(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName, slug: tenantSlug, status: "ativo" },
      });
      const admin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          status: "ativo",
          tenantId: tenant.id,
          roles: { create: [{ role: "admin" }] },
        },
      });
      return { tenant, admin };
    });

    // E-mail de boas-vindas (best-effort) para o admin recém-criado.
    if (shouldSendEmail) {
      await sendWelcomeEmail({
        name: result.admin.name,
        email: result.admin.email,
        roleLabels: [ROLE_LABELS.admin],
        password: adminPassword || null,
        tenantName: result.tenant.name,
      });
    }

    return NextResponse.json(
      {
        tenant: result.tenant,
        admin: { id: result.admin.id, name: result.admin.name, email: result.admin.email },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/plataforma/tenants", error);
    return NextResponse.json({ error: "Não foi possível criar a organização." }, { status: 500 });
  }
}
