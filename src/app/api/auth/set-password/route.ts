import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email) return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    if (user.passwordHash) {
      return NextResponse.json({ error: "Este usuário já possui senha cadastrada. Peça a um administrador para redefinir." }, { status: 400 });
    }
    if (user.status === "bloqueado") return NextResponse.json({ error: "Este usuário está bloqueado." }, { status: 403 });
    if (user.status === "inativo") return NextResponse.json({ error: "Este usuário está inativo." }, { status: 403 });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/set-password", error);
    return NextResponse.json({ error: "Não foi possível cadastrar a senha." }, { status: 500 });
  }
}
