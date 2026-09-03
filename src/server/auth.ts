import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { withPlatformBypass } from "@/server/tenant-db";

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

        try {
          // Login acontece ANTES de sabermos o tenant do usuário — por isso usa
          // bypass de RLS aqui (a única forma de encontrar o usuário para, só
          // então, descobrir a que tenant ele pertence).
          const user = await withPlatformBypass((tx) =>
            tx.user.findUnique({
              where: { email: credentials.email },
              include: { roles: true, tenant: true },
            })
          );
          // Mensagens de erro específicas (lidas pela tela de login via `result.error`)
          // para suportar o fluxo de primeiro acesso e os estados ativo/inativo/bloqueado (PRD 6.1/6.10).
          if (!user) throw new Error("invalido");
          if (user.status === "bloqueado") throw new Error("bloqueado");
          if (user.status === "inativo") throw new Error("inativo");
          // PRD — Fase 3: um tenant suspenso/cancelado bloqueia o login de todos os seus usuários.
          if (user.tenant.status !== "ativo") throw new Error("tenant_suspenso");
          if (!user.passwordHash) throw new Error("sem_senha");

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) throw new Error("invalido");

          await withPlatformBypass((tx) => tx.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } }));

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles.map((r) => r.role),
            linkedLeadId: user.linkedLeadId,
            tenantId: user.tenantId,
            tenantName: user.tenant.name,
            isPlatformSuperAdmin: user.isPlatformSuperAdmin,
          };
        } catch (error) {
          // Log explícito: garante que QUALQUER falha (esperada — "invalido" etc. —
          // ou inesperada — erro de banco, RLS, etc.) apareça no terminal, já que o
          // NextAuth nem sempre exibe o erro real de authorize() no console.
          console.error("[auth] Falha no login:", error);
          throw error;
        }
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
        // @ts-expect-error -- roles/linkedLeadId/tenantId/isPlatformSuperAdmin são adicionados no authorize()
        token.roles = user.roles ?? [];
        // @ts-expect-error -- idem
        token.linkedLeadId = user.linkedLeadId ?? null;
        // @ts-expect-error -- idem
        token.tenantId = user.tenantId ?? null;
        // @ts-expect-error -- idem
        token.tenantName = user.tenantName ?? null;
        // @ts-expect-error -- idem
        token.isPlatformSuperAdmin = user.isPlatformSuperAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { roles?: string[] }).roles = (token.roles as string[]) ?? [];
        (session.user as { linkedLeadId?: string | null }).linkedLeadId = (token.linkedLeadId as string | null) ?? null;
        (session.user as { tenantId?: string | null }).tenantId = (token.tenantId as string | null) ?? null;
        (session.user as { tenantName?: string | null }).tenantName = (token.tenantName as string | null) ?? null;
        (session.user as { isPlatformSuperAdmin?: boolean }).isPlatformSuperAdmin = (token.isPlatformSuperAdmin as boolean) ?? false;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      // Evento de ciclo de vida do NextAuth: também roda fora do contexto de uma
      // sessão com tenant já resolvido, por isso usa bypass de RLS.
      await withPlatformBypass((tx) => tx.user.update({ where: { id: user.id }, data: { lastAccessAt: new Date() } }));
    },
  },
};
