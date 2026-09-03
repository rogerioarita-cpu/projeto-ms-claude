import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/server/require-admin";
import { getTenantId, handleTenantError } from "@/server/tenant";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const tenantId = await getTenantId();
    // Tenant não tem RLS (não é tenant-scoped em si) — leitura direta pelo id resolvido.
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    return NextResponse.json({
      smtpHost: tenant?.smtpHost ?? "",
      smtpPort: tenant?.smtpPort ?? 587,
      smtpUser: tenant?.smtpUser ?? "",
      smtpPassSet: Boolean(tenant?.smtpPass),
      smtpFrom: tenant?.smtpFrom ?? "",
    });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("GET /api/settings/smtp", error);
    return NextResponse.json({ error: "Não foi possível carregar as configurações de SMTP." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const tenantId = await getTenantId();
    const body = await request.json();

    const smtpHost = body.smtpHost ? String(body.smtpHost).trim() : null;
    const smtpPort = body.smtpPort ? Number(body.smtpPort) : null;
    const smtpUser = body.smtpUser ? String(body.smtpUser).trim() : null;
    const smtpPass = body.smtpPass ? String(body.smtpPass) : undefined; // undefined = não mexe na senha já salva
    const smtpFrom = body.smtpFrom ? String(body.smtpFrom).trim() : null;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        smtpHost,
        smtpPort,
        smtpUser,
        ...(smtpPass !== undefined ? { smtpPass } : {}),
        smtpFrom,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("PUT /api/settings/smtp", error);
    return NextResponse.json({ error: "Não foi possível salvar as configurações de SMTP." }, { status: 500 });
  }
}
