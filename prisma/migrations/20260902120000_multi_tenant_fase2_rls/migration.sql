-- PRD — Implantação de Multi-Tenancy — Fase 2 (Row-Level Security)
--
-- Habilita RLS em todas as 10 tabelas com "tenantId", como defesa em
-- profundidade: mesmo que uma query da aplicação esqueça o filtro de tenant
-- (bug futuro, endpoint novo, etc.), o próprio Postgres recusa retornar ou
-- alterar linhas de um tenant diferente do que está marcado na sessão da
-- conexão (variável `app.current_tenant_id`, definida pela aplicação em
-- `src/server/tenant.ts` a cada operação).
--
-- IMPORTANTE — pré-requisitos operacionais para isto funcionar de verdade:
--   1) A role de banco usada em DATABASE_URL NÃO PODE ter o atributo
--      BYPASSRLS, e superusuários SEMPRE ignoram RLS mesmo com FORCE — ou
--      seja, se a aplicação conectar como superusuário (comum em alguns
--      provedores gerenciados por padrão), RLS não protege nada. Verifique
--      com: SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE
--      rolname = current_user; — se rolsuper ou rolbypassrls forem true,
--      é necessário criar uma role de aplicação dedicada, sem esses
--      atributos, e usá-la em DATABASE_URL antes desta proteção ter efeito real.
--   2) FORCE ROW LEVEL SECURITY é usado abaixo para que a política valha
--      mesmo para o dono da tabela (que por padrão ficaria isento de RLS).
--   3) A política inclui um valor de bypass (`__platform_bypass__`) usado
--      apenas por `withPlatformBypass()` em `src/server/tenant.ts`, para as
--      poucas operações genuinamente globais do sistema (login, checagem de
--      e-mail único entre tenants, primeiro acesso). Esse valor nunca é
--      composto a partir de entrada do usuário.

DO $$
DECLARE
  tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'users', 'leads', 'lead_client_flag_logs', 'projects', 'documents',
    'inconsistencies', 'tax_credits', 'sped_files', 'analises_fiscais', 'aprovacoes'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.current_tenant_id'', true) OR current_setting(''app.current_tenant_id'', true) = ''__platform_bypass__'')',
      tabela
    );
  END LOOP;
END $$;
