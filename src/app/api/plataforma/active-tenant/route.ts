import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requirePlatformSuperAdminSession } from "@/server/require-platform-admin";
import { ACTIVE_TENANT_COOKIE, resolveActiveTenantId } from "@/server/tenant";

export async function GET() {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const tenantId = await resolveActiveTenantId();
    return NextResponse.json({ tenantId });
  } catch (error) {
    console.error("GET /api/plataforma/active-tenant", error);
    return NextResponse.json({ error: "Não foi possível resolver a organização atual." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();
    const tenantId = String(body.tenantId ?? "");
    if (!tenantId) return NextResponse.json({ error: "Informe a organização." }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });

    cookies().set(ACTIVE_TENANT_COOKIE, tenant.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return NextResponse.json({ tenantId: tenant.id });
  } catch (error) {
    console.error("POST /api/plataforma/active-tenant", error);
    return NextResponse.json({ error: "Não foi possível trocar de organização." }, { status: 500 });
  }
}
