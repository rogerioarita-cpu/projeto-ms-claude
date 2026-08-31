-- Substitui o modelo "Client" (tabela "clients") por "Lead" (tabela "leads")
-- em todo o sistema. Passos:
--   1) adiciona as colunas leadId em projects/sped_files;
--   2) migra cada registro de "clients" para um novo registro em "leads"
--      (reaproveitando o mesmo id, para não perder o vínculo);
--   3) copia os vínculos existentes de clientId para leadId;
--   4) remove as colunas/õ constraints antigas de clientId;
--   5) remove a tabela "clients".
--
-- ATENÇÃO: migração destrutiva — a tabela "clients" é removida ao final.
-- Um backup já existe em backup/projeto_ms_backup.dump; recomenda-se tirar
-- um novo backup do banco de produção antes de aplicar esta migration.

-- 1) Novas colunas (nullable por enquanto, para permitir o backfill)
ALTER TABLE "projects" ADD COLUMN "leadId" TEXT;
ALTER TABLE "sped_files" ADD COLUMN "leadId" TEXT;

-- 2) Migra cada cliente existente para um lead equivalente, mantendo o id.
--    Clientes sem projeto/arquivo algum vinculado também são migrados, para
--    preservar o cadastro (nome/CNPJ) como um lead já aprovado.
INSERT INTO "leads" ("id", "companyName", "cnpj", "status", "estimatedValue", "procurationSigned", "ndaSigned", "createdAt", "updatedAt")
SELECT c."id", c."name", c."cnpj", 'aprovado', 0, false, false, c."createdAt", c."updatedAt"
FROM "clients" c
WHERE NOT EXISTS (SELECT 1 FROM "leads" l WHERE l."id" = c."id");

-- 3) Copia os vínculos existentes de clientId para leadId (mesmo id, pois o
--    lead foi criado reaproveitando o id do cliente original).
UPDATE "projects" SET "leadId" = "clientId" WHERE "clientId" IS NOT NULL;
UPDATE "sped_files" SET "leadId" = "clientId";

-- 4) Remove a FK/coluna antiga de projects e adiciona a nova apontando para leads
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_clientId_fkey";
ALTER TABLE "projects" DROP COLUMN "clientId";
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "leads"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Remove a FK/coluna/índice antigos de sped_files e adiciona os novos apontando para leads
ALTER TABLE "sped_files" DROP CONSTRAINT IF EXISTS "sped_files_clientId_fkey";
DROP INDEX IF EXISTS "sped_files_clientId_idx";
ALTER TABLE "sped_files" ALTER COLUMN "leadId" SET NOT NULL;
ALTER TABLE "sped_files"
  ADD CONSTRAINT "sped_files_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "leads"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "sped_files_leadId_idx" ON "sped_files"("leadId");
ALTER TABLE "sped_files" DROP COLUMN "clientId";

-- 6) Remove a tabela "clients" — todas as funcionalidades do sistema agora
--    usam exclusivamente "leads".
DROP TABLE "clients";
