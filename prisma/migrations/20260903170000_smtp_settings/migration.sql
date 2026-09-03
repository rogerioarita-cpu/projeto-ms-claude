-- SMTP por tenant (opcional) e configuração geral do sistema (fallback).

ALTER TABLE "tenants"
  ADD COLUMN "smtpHost" TEXT,
  ADD COLUMN "smtpPort" INTEGER,
  ADD COLUMN "smtpUser" TEXT,
  ADD COLUMN "smtpPass" TEXT,
  ADD COLUMN "smtpFrom" TEXT;

CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFrom" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
