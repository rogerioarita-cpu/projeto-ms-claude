-- Remove os arquivos SPED importados sem cliente vinculado (registros antigos,
-- de antes do campo Cliente se tornar obrigatório na tela de importação).
-- ATENÇÃO: exclusão definitiva — confira antes de aplicar em produção se algum
-- desses arquivos ainda é necessário.
DELETE FROM "sped_files" WHERE "clientId" IS NULL;

-- Torna o vínculo com o cliente obrigatório a partir de agora.
ALTER TABLE "sped_files" ALTER COLUMN "clientId" SET NOT NULL;

-- Ajusta a FK: ao excluir um cliente, os arquivos SPED dele são excluídos em
-- cascata (mesmo comportamento já usado em Client -> Project).
ALTER TABLE "sped_files" DROP CONSTRAINT "sped_files_clientId_fkey";
ALTER TABLE "sped_files"
  ADD CONSTRAINT "sped_files_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
