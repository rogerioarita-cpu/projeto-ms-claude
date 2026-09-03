-- Corrige a dessincronização entre o papel "super_admin" (RBAC, tabela
-- user_roles) e o flag booleano "isPlatformSuperAdmin" (tabela users): todo
-- usuário que já tem o papel, mas ainda não tem o flag marcado, passa a ter
-- os dois em sincronia — cobre casos como um papel atribuído manualmente
-- direto no banco (ex.: via Prisma Studio) sem passar pelo flag.

UPDATE "users" u
SET "isPlatformSuperAdmin" = true
WHERE u."isPlatformSuperAdmin" = false
  AND EXISTS (
    SELECT 1 FROM "user_roles" ur WHERE ur."userId" = u."id" AND ur."role" = 'super_admin'
  );
