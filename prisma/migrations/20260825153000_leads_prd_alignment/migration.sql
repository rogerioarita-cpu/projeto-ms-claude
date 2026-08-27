-- Alinha o módulo de Leads ao PRD (seção 6.3 "Gestão de Leads" / 7.1 "Modelo de Dados").
-- Adiciona os campos de cadastro (CNPJ, tipo de empresa, telefone, observações,
-- procuração/NDA assinados) e substitui o pipeline genérico de 9 fases do MVP
-- inicial pelo pipeline específico descrito no PRD: Novo → Qualificação →
-- Reunião Agendada → Documentação → Análise Fiscal → Proposta → Contrato →
-- Aprovado → Cancelado.

-- CreateEnum
CREATE TYPE "company_type" AS ENUM ('industria', 'comercio', 'revenda', 'servicos');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('novo', 'qualificacao', 'reuniao_agendada', 'documentacao', 'analise_fiscal', 'proposta', 'contrato', 'aprovado', 'cancelado');

-- AlterTable: novas colunas de cadastro
ALTER TABLE "leads"
  ADD COLUMN "cnpj" TEXT,
  ADD COLUMN "companyType" "company_type",
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "procurationSigned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ndaSigned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "lead_status" NOT NULL DEFAULT 'novo';

-- Migração de dados: mapeia o pipeline antigo (LeadStage) para o novo (lead_status)
-- best-effort, para não perder o estágio de leads já cadastrados.
UPDATE "leads" SET "status" = CASE "stage"::text
  WHEN 'prospeccao'  THEN 'novo'
  WHEN 'qualificacao' THEN 'qualificacao'
  WHEN 'diagnostico'  THEN 'analise_fiscal'
  WHEN 'proposta'     THEN 'proposta'
  WHEN 'negociacao'   THEN 'proposta'
  WHEN 'contrato'     THEN 'contrato'
  WHEN 'onboarding'   THEN 'aprovado'
  WHEN 'execucao'     THEN 'aprovado'
  WHEN 'encerrado'    THEN 'aprovado'
  ELSE 'novo'
END::"lead_status";

-- Remove a coluna e o tipo antigos (substituídos por "status" / "lead_status")
ALTER TABLE "leads" DROP COLUMN "stage";
DROP TYPE "LeadStage";
