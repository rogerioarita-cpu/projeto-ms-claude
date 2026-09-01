-- Remove o papel "cliente_consulta" do RBAC e o campo "linkedLeadId" (empresa
-- vinculada) da tabela "users", já que essa coluna existia exclusivamente
-- para suportar o escopo de acesso desse papel.
--
-- ATENÇÃO: migração destrutiva.
--   - Qualquer usuário que hoje tenha APENAS o papel "cliente_consulta"
--     ficará sem nenhum papel atribuído após esta migração (o papel é
--     removido da linha em "user_roles", a linha não é substituída).
--   - O valor de "linkedLeadId" desses usuários será perdido (a coluna é
--     removida da tabela "users").
-- Recomenda-se revisar quais usuários possuem esse papel antes de aplicar
-- em produção, e tirar um backup do banco.

-- 1) Remove as linhas de user_roles que usam o papel 'cliente_consulta'
--    (precisa ser feito antes de remover o valor do enum).
DELETE FROM "user_roles" WHERE "role" = 'cliente_consulta';

-- 2) Recria o enum AppRole sem o valor 'cliente_consulta'.
CREATE TYPE "AppRole_new" AS ENUM ('admin', 'gestor', 'analista_fiscal', 'juridico', 'comercial', 'aprovador');

ALTER TABLE "user_roles" ALTER COLUMN "role" TYPE "AppRole_new" USING ("role"::text::"AppRole_new");

DROP TYPE "AppRole";
ALTER TYPE "AppRole_new" RENAME TO "AppRole";

-- 3) Remove a coluna "linkedLeadId" (e sua FK) da tabela "users".
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_linkedLeadId_fkey";
ALTER TABLE "users" DROP COLUMN IF EXISTS "linkedLeadId";
