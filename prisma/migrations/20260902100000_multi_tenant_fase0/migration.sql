-- PRD — Implantação de Multi-Tenancy — Fase 0
-- Objetivo desta migração:
--   1) Criar o model Tenant.
--   2) Adicionar "tenantId" (opcional/nullable) em todas as tabelas de negócio.
--   3) Criar um tenant padrão representando o escritório que já usa o sistema hoje.
--   4) Fazer o backfill de "tenantId" em 100% das linhas já existentes.
--
-- IMPORTANTE: nesta fase, "tenantId" continua OPCIONAL (nullable) em todas as
-- tabelas — a aplicação ainda não impõe o isolamento por tenant (isso é a
-- Fase 1 do PRD). Esta migração é puramente de schema + backfill de dados,
-- sem qualquer mudança de comportamento visível para o usuário final.

-- 1) Enum e tabela de tenants
CREATE TYPE "tenant_status" AS ENUM ('ativo', 'suspenso', 'cancelado');

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "tenant_status" NOT NULL DEFAULT 'ativo',
    "plan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- 2) Tenant padrão, representando a organização que já usa o sistema hoje.
--    Id fixo e legível (não segue o formato cuid() do Prisma, mas é uma string
--    qualquer válida para a coluna TEXT — não há conflito).
INSERT INTO "tenants" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES ('tenant-default', 'Organização padrão (migração)', 'default', 'ativo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3) Coluna "tenantId" (nullable) + índice em cada tabela de negócio
ALTER TABLE "users" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "leads" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "lead_client_flag_logs" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "projects" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "documents" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "inconsistencies" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "tax_credits" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "sped_files" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "analises_fiscais" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "aprovacoes" ADD COLUMN "tenantId" TEXT;

-- 4) Foreign keys para "tenants" (ON DELETE SET NULL enquanto a coluna for
--    opcional — será revisado para RESTRICT na Fase 1, quando tenantId virar
--    obrigatório).
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_client_flag_logs" ADD CONSTRAINT "lead_client_flag_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inconsistencies" ADD CONSTRAINT "inconsistencies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tax_credits" ADD CONSTRAINT "tax_credits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sped_files" ADD CONSTRAINT "sped_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "analises_fiscais" ADD CONSTRAINT "analises_fiscais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "aprovacoes" ADD CONSTRAINT "aprovacoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) Índices de "tenantId" (e composto tenantId+status em "leads", conforme o PRD)
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX "leads_tenantId_idx" ON "leads"("tenantId");
CREATE INDEX "leads_tenantId_status_idx" ON "leads"("tenantId", "status");
CREATE INDEX "lead_client_flag_logs_tenantId_idx" ON "lead_client_flag_logs"("tenantId");
CREATE INDEX "projects_tenantId_idx" ON "projects"("tenantId");
CREATE INDEX "documents_tenantId_idx" ON "documents"("tenantId");
CREATE INDEX "inconsistencies_tenantId_idx" ON "inconsistencies"("tenantId");
CREATE INDEX "tax_credits_tenantId_idx" ON "tax_credits"("tenantId");
CREATE INDEX "sped_files_tenantId_idx" ON "sped_files"("tenantId");
CREATE INDEX "analises_fiscais_tenantId_idx" ON "analises_fiscais"("tenantId");
CREATE INDEX "aprovacoes_tenantId_idx" ON "aprovacoes"("tenantId");

-- 6) Backfill: 100% das linhas já existentes passam a apontar para o tenant padrão.
UPDATE "users" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "leads" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "lead_client_flag_logs" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "projects" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "documents" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "inconsistencies" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "tax_credits" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "sped_files" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "analises_fiscais" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;
UPDATE "aprovacoes" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;

-- Checagem de sanidade (não falha a migração, é só um lembrete via comentário):
-- Antes de avançar para a Fase 1 (tenantId NOT NULL), rode em cada tabela acima:
--   SELECT count(*) FROM "<tabela>" WHERE "tenantId" IS NULL;
-- O resultado deve ser 0 em todas.
