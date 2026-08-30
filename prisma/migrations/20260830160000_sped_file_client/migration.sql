-- Vincula cada arquivo SPED importado a um cliente (necessário para tornar o
-- campo "Cliente" obrigatório na tela de importação e agrupar a listagem por cliente).
-- Mantido nullable no banco (registros antigos não têm cliente); a obrigatoriedade
-- para novas importações é validada na API (POST /api/sped).

ALTER TABLE "sped_files" ADD COLUMN "clientId" TEXT;

CREATE INDEX "sped_files_clientId_idx" ON "sped_files"("clientId");

ALTER TABLE "sped_files"
  ADD CONSTRAINT "sped_files_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
