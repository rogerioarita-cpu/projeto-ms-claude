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
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

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
    // Equivalente ao trigger handle_new_user() do Supabase:
    // ao logar pela primeira vez via OAuth, cria o papel padrão 'cliente'.
    async signIn({ user }) {
      if (!user.id) return;
      const existing = await prisma.userRole.findFirst({ where: { userId: user.id } });
      if (!existing) {
        await prisma.userRole.create({ data: { userId: user.id, role: "cliente" } });
      }
    },
  },
};
