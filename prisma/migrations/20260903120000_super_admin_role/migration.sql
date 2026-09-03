-- Adiciona o papel "super_admin" ao RBAC (AppRole). Diferente dos demais
-- papéis (que são por tenant), este é um marcador de plataforma: indica que
-- o usuário tem isPlatformSuperAdmin = true, e passa a ser a origem de
-- verdade usada pela tela (menu) para decidir se mostra "Cadastro de
-- Organizações" — em vez de depender só do flag booleano na sessão.

-- 1) Recria o enum AppRole incluindo o novo valor.
CREATE TYPE "AppRole_new" AS ENUM ('admin', 'gestor', 'analista_fiscal', 'juridico', 'comercial', 'aprovador', 'lead_cliente', 'super_admin');

ALTER TABLE "user_roles" ALTER COLUMN "role" TYPE "AppRole_new" USING ("role"::text::"AppRole_new");

DROP TYPE "AppRole";
ALTER TYPE "AppRole_new" RENAME TO "AppRole";

-- 2) Backfill: todo usuário que já é super-admin de plataforma (isPlatformSuperAdmin = true)
--    recebe o papel "super_admin", se ainda não tiver.
INSERT INTO "user_roles" ("id", "userId", "role")
SELECT md5(random()::text || clock_timestamp()::text || u."id"), u."id", 'super_admin'
FROM "users" u
WHERE u."isPlatformSuperAdmin" = true
  AND NOT EXISTS (
    SELECT 1 FROM "user_roles" ur WHERE ur."userId" = u."id" AND ur."role" = 'super_admin'
  );
