export { default } from "next-auth/middleware";

export const config = {
  // Protege todas as rotas do painel autenticado.
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/auditoria/:path*",
    "/creditos/:path*",
    "/workflow/:path*",
    "/documentos/:path*",
  ],
};
