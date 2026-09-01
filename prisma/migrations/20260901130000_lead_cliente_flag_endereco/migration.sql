-- Adiciona o campo booleano "Cliente" (isClient) ao lead, com uma tabela de
-- log para registrar cada alteração (quem alterou e quando), e os campos de
-- endereço completo usados na nova aba de cadastro/edição de leads.

-- 1) Campo "Cliente" (isClient)
ALTER TABLE "leads" ADD COLUMN "isClient" BOOLEAN NOT NULL DEFAULT false;

-- 2) Endereço completo
ALTER TABLE "leads"
  ADD COLUMN "addressZip" TEXT,
  ADD COLUMN "addressStreet" TEXT,
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "addressNeighborhood" TEXT,
  ADD COLUMN "addressCity" TEXT,
  ADD COLUMN "addressState" TEXT;

-- 3) Tabela de log das alterações do campo "Cliente"
CREATE TABLE "lead_client_flag_logs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_client_flag_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_client_flag_logs_leadId_idx" ON "lead_client_flag_logs"("leadId");

ALTER TABLE "lead_client_flag_logs"
  ADD CONSTRAINT "lead_client_flag_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_client_flag_logs"
  ADD CONSTRAINT "lead_client_flag_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
