export { default } from "next-auth/middleware";

export const config = {
  // Protege todas as rotas do painel autenticado (páginas e suas respectivas
  // rotas de API). NÃO inclui /api/auth/*, que precisa ficar acessível para
  // o próprio fluxo de login funcionar.
  matcher: [
    "/inicio/:path*",
    "/dashboard/:path*",
    "/projetos/:path*",
    "/leads/:path*",
    "/importacao/:path*",
    "/auditoria/:path*",
    "/creditos/:path*",
    "/workflow/:path*",
    "/documentos/:path*",
    "/usuarios/:path*",
    "/analise/:path*",
    "/aprovacoes/:path*",
    "/plataforma/:path*",

    "/api/projetos/:path*",
    "/api/sped/:path*",
    "/api/auditoria/:path*",
    "/api/documentos/:path*",
    "/api/users/:path*",
    "/api/leads/:path*",
    "/api/analises/:path*",
    "/api/aprovacoes/:path*",
    "/api/checklist/:path*",
    "/api/plataforma/:path*",
  ],
};
