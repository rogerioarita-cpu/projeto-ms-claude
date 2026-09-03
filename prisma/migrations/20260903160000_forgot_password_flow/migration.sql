-- Adiciona "passwordResetRequestedAt", usado pelo fluxo "Esqueci minha senha":
-- marca quando o usuário pediu a redefinição, para saber se deve responder
-- por e-mail confirmando quando um admin salvar uma nova senha para ele.
-- Sem backfill necessário (nullable, default implícito NULL).

ALTER TABLE "users" ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3);
