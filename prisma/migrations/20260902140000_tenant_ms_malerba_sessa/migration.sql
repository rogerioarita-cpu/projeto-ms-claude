-- Migração de dados (não de schema): cria a organização "MS - Malerba & Sessa"
-- e move todos os dados que hoje pertencem ao tenant padrão (criado na Fase 0
-- do PRD de multi-tenancy) para essa nova organização — encerrando o uso do
-- tenant "tenant-default". Também cria o super usuário de plataforma
-- rogerio.arita@cc.com.br, já pertencente a essa organização.

-- 1) Nova organização.
INSERT INTO "tenants" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES ('tenant-ms-malerba-sessa', 'MS - Malerba & Sessa', 'ms-malerba-sessa', 'ativo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2) Move todos os dados hoje associados ao tenant padrão para a nova organização.
UPDATE "users" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "leads" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "lead_client_flag_logs" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "projects" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "documents" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "inconsistencies" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "tax_credits" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "sped_files" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "analises_fiscais" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';
UPDATE "aprovacoes" SET "tenantId" = 'tenant-ms-malerba-sessa' WHERE "tenantId" = 'tenant-default';

-- 3) Super usuário de plataforma, já na nova organização, com papel admin
--    dentro dela. Senha: Admin@123456 (hash bcrypt, custo 10 — mesmo padrão
--    usado pela aplicação em src/server/auth.ts e prisma/seed.ts).
INSERT INTO "users" ("id", "name", "email", "passwordHash", "status", "tenantId", "isPlatformSuperAdmin", "createdAt", "updatedAt")
VALUES (
  'user-rogerio-arita',
  'Rogério Arita',
  'rogerio.arita@cc.com.br',
  '$2a$10$UZxWRqQ9ApRoS.Sj9fgCeuWuBjr7lER.7ghn.4zg1140BAXq64LSW',
  'ativo',
  'tenant-ms-malerba-sessa',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "user_roles" ("id", "userId", "role")
VALUES ('user-role-rogerio-admin', 'user-rogerio-arita', 'admin');

-- 4) Remove o tenant padrão, agora sem nenhuma linha associada (a FK RESTRICT
--    garante que este DELETE só é bem-sucedido se, de fato, não sobrar nada
--    apontando para ele — o que confirma que o passo 2 migrou tudo).
DELETE FROM "tenants" WHERE "id" = 'tenant-default';
