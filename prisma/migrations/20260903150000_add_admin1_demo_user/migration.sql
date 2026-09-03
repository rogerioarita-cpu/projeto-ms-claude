-- Cria o usuário de demonstração "admin1@projeto-ms.local", exibido na tela
-- de login como o login "Demo" comum (não super-admin) — em contraste com
-- admin@projeto-ms.local, exibido como "Demo Super Adm".
-- Senha: Admin@123456 (hash bcrypt, custo 10 — mesmo padrão do restante do sistema).

INSERT INTO "users" ("id", "name", "email", "passwordHash", "status", "tenantId", "isPlatformSuperAdmin", "createdAt", "updatedAt")
VALUES (
  'user-admin1-demo',
  'Administrador (Demo)',
  'admin1@projeto-ms.local',
  '$2a$10$UZxWRqQ9ApRoS.Sj9fgCeuWuBjr7lER.7ghn.4zg1140BAXq64LSW',
  'ativo',
  'tenant-ms-malerba-sessa',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash";

-- Papel: apenas admin do tenant (não é super-admin de plataforma).
INSERT INTO "user_roles" ("id", "userId", "role")
SELECT 'user-role-admin1-admin', u."id", 'admin'
FROM "users" u
WHERE u."email" = 'admin1@projeto-ms.local'
  AND NOT EXISTS (SELECT 1 FROM "user_roles" ur WHERE ur."userId" = u."id" AND ur."role" = 'admin');
