import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSuperAdminSession } from "@/server/require-platform-admin";
import { SYSTEM_SETTINGS_ID } from "@/server/mail";

export async function GET() {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const settings = await prisma.systemSettings.findUnique({ where: { id: SYSTEM_SETTINGS_ID } });

    return NextResponse.json({
      smtpHost: settings?.smtpHost ?? "",
      smtpPort: settings?.smtpPort ?? 587,
      smtpUser: settings?.smtpUser ?? "",
      smtpPassSet: Boolean(settings?.smtpPass),
      smtpFrom: settings?.smtpFrom ?? "",
    });
  } catch (error) {
    console.error("GET /api/plataforma/settings/smtp", error);
    return NextResponse.json({ error: "Não foi possível carregar as configurações de SMTP." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requirePlatformSuperAdminSession();
    if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const body = await request.json();

    const smtpHost = body.smtpHost ? String(body.smtpHost).trim() : null;
    const smtpPort = body.smtpPort ? Number(body.smtpPort) : null;
    const smtpUser = body.smtpUser ? String(body.smtpUser).trim() : null;
    const smtpPass = body.smtpPass ? String(body.smtpPass) : undefined; // undefined = não mexe na senha já salva
    const smtpFrom = body.smtpFrom ? String(body.smtpFrom).trim() : null;

    await prisma.systemSettings.upsert({
      where: { id: SYSTEM_SETTINGS_ID },
      update: {
        smtpHost,
        smtpPort,
        smtpUser,
        ...(smtpPass !== undefined ? { smtpPass } : {}),
        smtpFrom,
      },
      create: {
        id: SYSTEM_SETTINGS_ID,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass: smtpPass ?? null,
        smtpFrom,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/plataforma/settings/smtp", error);
    return NextResponse.json({ error: "Não foi possível salvar as configurações de SMTP." }, { status: 500 });
  }
}
