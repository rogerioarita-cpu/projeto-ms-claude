-- Alinhamento ao PRD: RBAC final, gestão documental por lead, Análise Fiscal (6.7)
-- e Aprovações Multidisciplinares (6.9).

-- ======================================================================
-- 1) RBAC — troca 'cliente'/'auditor' por 'cliente_consulta'/'aprovador'
-- ======================================================================
CREATE TYPE "AppRole_new" AS ENUM ('admin', 'gestor', 'analista_fiscal', 'juridico', 'comercial', 'aprovador', 'cliente_consulta');

ALTER TABLE "user_roles" ALTER COLUMN "role" TYPE "AppRole_new" USING (
  CASE "role"::text
    WHEN 'cliente' THEN 'cliente_consulta'
    WHEN 'auditor' THEN 'gestor'
    ELSE "role"::text
  END
)::"AppRole_new";

DROP TYPE "AppRole";
ALTER TYPE "AppRole_new" RENAME TO "AppRole";

-- ======================================================================
-- 2) Usuário — status, último acesso, empresa vinculada (lead)
-- ======================================================================
CREATE TYPE "user_status" AS ENUM ('ativo', 'inativo', 'bloqueado');

ALTER TABLE "users"
  ADD COLUMN "status" "user_status" NOT NULL DEFAULT 'ativo',
  ADD COLUMN "lastAccessAt" TIMESTAMP(3),
  ADD COLUMN "linkedLeadId" TEXT;

ALTER TABLE "users" ADD CONSTRAINT "users_linkedLeadId_fkey" FOREIGN KEY ("linkedLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ======================================================================
-- 3) Documento — passa a poder ser vinculado a um Lead (PRD 6.4),
--    com tipo fixo, status de revisão, tamanho e observação.
--    `projectId` é mantido (nullable) apenas por compatibilidade com dados
--    do MVP inicial.
-- ======================================================================
CREATE TYPE "doc_type" AS ENUM ('procuracao', 'nda', 'contrato', 'aditivo', 'outro');
CREATE TYPE "doc_status" AS ENUM ('enviado', 'pendente', 'validado', 'rejeitado');

ALTER TABLE "documents"
  ADD COLUMN "leadId" TEXT,
  ADD COLUMN "type" "doc_type" NOT NULL DEFAULT 'outro',
  ADD COLUMN "status" "doc_status" NOT NULL DEFAULT 'enviado',
  ADD COLUMN "sizeKb" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "note" TEXT;

-- Migra o valor livre "docType" (texto) para o enum, quando reconhecível.
UPDATE "documents" SET "type" = CASE lower(coalesce("docType", ''))
  WHEN 'procuracao'  THEN 'procuracao'
  WHEN 'procuração'  THEN 'procuracao'
  WHEN 'nda'         THEN 'nda'
  WHEN 'contrato'    THEN 'contrato'
  WHEN 'aditivo'     THEN 'aditivo'
  ELSE 'outro'
END::"doc_type";

ALTER TABLE "documents" ADD CONSTRAINT "documents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "documents_leadId_idx" ON "documents"("leadId");

-- ======================================================================
-- 4) Análise Fiscal (PRD 6.7 / 7.2)
-- ======================================================================
CREATE TYPE "tax_type" AS ENUM ('pis_cofins', 'icms', 'ipi', 'irpj_csll', 'outros');
CREATE TYPE "analise_status" AS ENUM ('em_andamento', 'concluida', 'aprovada', 'rejeitada');

CREATE TABLE "analises_fiscais" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "taxType" "tax_type" NOT NULL,
    "thesis" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "estimatedCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "analise_status" NOT NULL DEFAULT 'em_andamento',
    "diagnosis" TEXT,
    "analystId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analises_fiscais_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analises_fiscais_leadId_idx" ON "analises_fiscais"("leadId");

ALTER TABLE "analises_fiscais" ADD CONSTRAINT "analises_fiscais_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analises_fiscais" ADD CONSTRAINT "analises_fiscais_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "analiseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "checklist_items_analiseId_idx" ON "checklist_items"("analiseId");

ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_analiseId_fkey" FOREIGN KEY ("analiseId") REFERENCES "analises_fiscais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ======================================================================
-- 5) Aprovações Multidisciplinares (PRD 6.9 / 7.4)
-- ======================================================================
CREATE TYPE "approval_area" AS ENUM ('juridico', 'financeiro', 'comercial', 'concorrencia');
CREATE TYPE "approval_status" AS ENUM ('pendente', 'aprovado', 'rejeitado');

CREATE TABLE "aprovacoes" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "analiseId" TEXT NOT NULL,
    "area" "approval_area" NOT NULL,
    "status" "approval_status" NOT NULL DEFAULT 'pendente',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aprovacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "aprovacoes_analiseId_area_key" ON "aprovacoes"("analiseId", "area");
CREATE INDEX "aprovacoes_leadId_idx" ON "aprovacoes"("leadId");

ALTER TABLE "aprovacoes" ADD CONSTRAINT "aprovacoes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aprovacoes" ADD CONSTRAINT "aprovacoes_analiseId_fkey" FOREIGN KEY ("analiseId") REFERENCES "analises_fiscais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
