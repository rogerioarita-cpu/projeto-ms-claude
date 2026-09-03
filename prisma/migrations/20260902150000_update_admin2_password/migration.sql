-- Atualiza a senha do usuário admin2@projeto-ms.local para "Admin@123456"
-- (hash bcrypt, custo 10 — mesmo padrão usado pela aplicação em
-- src/server/auth.ts e prisma/seed.ts).
--
-- Não faz nada se o e-mail não existir na base (UPDATE sem linha correspondente).

UPDATE "users"
SET "passwordHash" = '$2a$10$UZxWRqQ9ApRoS.Sj9fgCeuWuBjr7lER.7ghn.4zg1140BAXq64LSW'
WHERE "email" = 'admin2@projeto-ms.local';
