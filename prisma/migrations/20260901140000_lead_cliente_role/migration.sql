-- Adiciona o papel "lead_cliente" ao RBAC: um usuário com esse papel só pode
-- consultar os dados do Lead/Cliente ao qual está vinculado (linkedLeadId).

-- 1) Recria o enum AppRole incluindo o novo valor 'lead_cliente'.
CREATE TYPE "AppRole_new" AS ENUM ('admin', 'gestor', 'analista_fiscal', 'juridico', 'comercial', 'aprovador', 'lead_cliente');

ALTER TABLE "user_roles" ALTER COLUMN "role" TYPE "AppRole_new" USING ("role"::text::"AppRole_new");

DROP TYPE "AppRole";
ALTER TYPE "AppRole_new" RENAME TO "AppRole";

-- 2) Campo "Lead/Cliente vinculado" em users (obrigatório apenas quando o
--    usuário tem o papel lead_cliente — validado na aplicação).
ALTER TABLE "users" ADD COLUMN "linkedLeadId" TEXT;

ALTER TABLE "users"
  ADD CONSTRAINT "users_linkedLeadId_fkey" FOREIGN KEY ("linkedLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
