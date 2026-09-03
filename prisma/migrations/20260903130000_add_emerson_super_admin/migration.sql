-- Cria o super-administrador de plataforma emerson@softecnologia.com.br.
-- Senha: Admin@123456 (hash bcrypt, custo 10 — mesmo padrão usado pela
-- aplicação em src/server/auth.ts e prisma/seed.ts).
--
-- Os outros dois usuários pedidos (rogerio.arita@cc.com.br e
-- admin@projeto-ms.local) já tinham isPlatformSuperAdmin = true antes desta
-- migração — o backfill da migração 20260903120000_super_admin_role já
-- atribuiu o papel "super_admin" a eles automaticamente. Nada a fazer aqui
-- para esses dois.

INSERT INTO "users" ("id", "name", "email", "passwordHash", "status", "tenantId", "isPlatformSuperAdmin", "createdAt", "updatedAt")
VALUES (
  'user-emerson-capreti',
  'Emerson Capreti',
  'emerson@softecnologia.com.br',
  '$2a$10$UZxWRqQ9ApRoS.Sj9fgCeuWuBjr7lER.7ghn.4zg1140BAXq64LSW',
  'ativo',
  'tenant-ms-malerba-sessa',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "isPlatformSuperAdmin" = true;

-- Papéis: admin (dentro do tenant de origem) + super_admin (plataforma).
INSERT INTO "user_roles" ("id", "userId", "role")
SELECT 'user-role-emerson-admin', u."id", 'admin'
FROM "users" u
WHERE u."email" = 'emerson@softecnologia.com.br'
  AND NOT EXISTS (SELECT 1 FROM "user_roles" ur WHERE ur."userId" = u."id" AND ur."role" = 'admin');

INSERT INTO "user_roles" ("id", "userId", "role")
SELECT 'user-role-emerson-super-admin', u."id", 'super_admin'
FROM "users" u
WHERE u."email" = 'emerson@softecnologia.com.br'
  AND NOT EXISTS (SELECT 1 FROM "user_roles" ur WHERE ur."userId" = u."id" AND ur."role" = 'super_admin');
