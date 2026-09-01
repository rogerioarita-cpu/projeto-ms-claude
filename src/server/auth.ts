import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { roles: true },
        });
        // Mensagens de erro específicas (lidas pela tela de login via `result.error`)
        // para suportar o fluxo de primeiro acesso e os estados ativo/inativo/bloqueado (PRD 6.1/6.10).
        if (!user) throw new Error("invalido");
        if (user.status === "bloqueado") throw new Error("bloqueado");
        if (user.status === "inativo") throw new Error("inativo");
        if (!user.passwordHash) throw new Error("sem_senha");

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) throw new Error("invalido");

        await prisma.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles.map((r) => r.role),
        };
      },
    }),
    // Login com Google — só é ativado se as variáveis de ambiente estiverem preenchidas
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-expect-error -- roles é adicionado no authorize()
        token.roles = user.roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { roles?: string[] }).roles = (token.roles as string[]) ?? [];
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await prisma.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } });
    },
  },
};
