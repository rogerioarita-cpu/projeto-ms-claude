import { NextResponse } from "next/server";
import { withPlatformBypass } from "@/server/tenant-db";
import { buildForgotPasswordRequestEmail, sendMail } from "@/server/mail";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });

    // Rota pública (sem sessão) — o próprio usuário ainda não conseguiu logar,
    // por isso usa bypass de RLS para encontrá-lo e para listar os admins do
    // tenant dele.
    const requester = await withPlatformBypass((tx) => tx.user.findUnique({ where: { email } }));
    if (!requester) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const admins = await withPlatformBypass((tx) =>
      tx.user.findMany({
        where: { tenantId: requester.tenantId, roles: { some: { role: "admin" } } },
      })
    );

    if (admins.length === 0) {
      return NextResponse.json(
        { error: "Nenhum administrador foi encontrado na sua organização para atender essa solicitação." },
        { status: 404 }
      );
    }

    // Marca a solicitação — usado para saber, quando um admin salvar uma nova
    // senha para este usuário, se deve responder confirmando por e-mail.
    await withPlatformBypass((tx) => tx.user.update({ where: { id: requester.id }, data: { passwordResetRequestedAt: new Date() } }));

    const { subject, text, html } = buildForgotPasswordRequestEmail({ requesterName: requester.name, requesterEmail: requester.email });

    // "com o usuário como remetente": o e-mail do próprio solicitante vai no
    // campo De (ver aviso sobre SPF/DKIM em src/server/mail.ts).
    await Promise.all(admins.map((admin) => sendMail({ to: admin.email, subject, text, html, from: requester.email })));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/forgot-password", error);
    return NextResponse.json({ error: "Não foi possível enviar a solicitação." }, { status: 500 });
  }
}
