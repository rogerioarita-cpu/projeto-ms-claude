-- PRD — Implantação de Multi-Tenancy — Fase 1 (enforcement)
-- Pré-requisito: a migração 20260902100000_multi_tenant_fase0 já deve ter
-- rodado (cria o tenant padrão e faz o backfill de "tenantId" em 100% das
-- linhas existentes).
--
-- Esta migração:
--   1) Verifica, antes de qualquer alteração, que não existe nenhuma linha
--      com "tenantId" nulo em nenhuma das 10 tabelas de negócio — se existir,
--      a migração inteira falha (ROLLBACK automático) em vez de silenciosamente
--      corromper dados. Rode o backfill da Fase 0 antes de tentar de novo.
--   2) Torna "tenantId" NOT NULL em todas as tabelas.
--   3) Troca a ação de FK de ON DELETE SET NULL para ON DELETE RESTRICT —
--      agora que o campo é obrigatório, não faz sentido "zerar" o tenant de
--      um registro ao excluir o tenant; a exclusão de um tenant com dados
--      associados deve ser bloqueada (ou tratada por um fluxo de arquivamento
--      dedicado, fora do escopo desta migração).

DO $$
DECLARE
  tabela TEXT;
  total_nulos INTEGER;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'users', 'leads', 'lead_client_flag_logs', 'projects', 'documents',
    'inconsistencies', 'tax_credits', 'sped_files', 'analises_fiscais', 'aprovacoes'
  ]
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE "tenantId" IS NULL', tabela) INTO total_nulos;
    IF total_nulos > 0 THEN
      RAISE EXCEPTION 'Migração abortada: a tabela "%" tem % linha(s) com tenantId nulo. Rode o backfill da Fase 0 (20260902100000_multi_tenant_fase0) antes de aplicar esta migração.', tabela, total_nulos;
    END IF;
  END LOOP;
END $$;

-- Troca das FKs (DROP + ADD, pois Postgres não permite ALTER na ação de FK)
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";
ALTER TABLE "leads" DROP CONSTRAINT "leads_tenantId_fkey";
ALTER TABLE "lead_client_flag_logs" DROP CONSTRAINT "lead_client_flag_logs_tenantId_fkey";
ALTER TABLE "projects" DROP CONSTRAINT "projects_tenantId_fkey";
ALTER TABLE "documents" DROP CONSTRAINT "documents_tenantId_fkey";
ALTER TABLE "inconsistencies" DROP CONSTRAINT "inconsistencies_tenantId_fkey";
ALTER TABLE "tax_credits" DROP CONSTRAINT "tax_credits_tenantId_fkey";
ALTER TABLE "sped_files" DROP CONSTRAINT "sped_files_tenantId_fkey";
ALTER TABLE "analises_fiscais" DROP CONSTRAINT "analises_fiscais_tenantId_fkey";
ALTER TABLE "aprovacoes" DROP CONSTRAINT "aprovacoes_tenantId_fkey";

-- NOT NULL
ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "leads" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "lead_client_flag_logs" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "inconsistencies" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "tax_credits" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "sped_files" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "analises_fiscais" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "aprovacoes" ALTER COLUMN "tenantId" SET NOT NULL;

-- Recriação das FKs com ON DELETE RESTRICT
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_client_flag_logs" ADD CONSTRAINT "lead_client_flag_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inconsistencies" ADD CONSTRAINT "inconsistencies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_credits" ADD CONSTRAINT "tax_credits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sped_files" ADD CONSTRAINT "sped_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analises_fiscais" ADD CONSTRAINT "analises_fiscais_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "aprovacoes" ADD CONSTRAINT "aprovacoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
