-- Backfill: a regra "Cliente = true quando status = Contrato ou Aprovado" só
-- passou a ser aplicada automaticamente a partir de uma alteração recente do
-- sistema. Leads que já estavam com status "contrato" ou "aprovado" antes
-- dessa mudança não foram recalculados (a regra só roda ao salvar o lead).
-- Esta migração corrige esses registros existentes de uma vez, e registra a
-- alteração no log de auditoria do campo Cliente (changedById NULL = sistema).

CREATE TEMP TABLE "_leads_to_backfill" AS
SELECT "id" FROM "leads" WHERE "status" IN ('contrato', 'aprovado') AND "isClient" = false;

UPDATE "leads" SET "isClient" = true WHERE "id" IN (SELECT "id" FROM "_leads_to_backfill");

INSERT INTO "lead_client_flag_logs" ("id", "leadId", "value", "changedById", "changedAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", true, NULL, CURRENT_TIMESTAMP
FROM "_leads_to_backfill";

DROP TABLE "_leads_to_backfill";
