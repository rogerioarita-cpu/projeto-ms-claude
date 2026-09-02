-- PRD — Implantação de Multi-Tenancy — Fase 3 (Provisionamento)
-- Adiciona o flag global "isPlatformSuperAdmin" (fora do RBAC por tenant),
-- que habilita a tela de criação/gestão de tenants (/plataforma/tenants).
-- Não precisa de backfill: o default (false) já cobre os usuários existentes.

ALTER TABLE "users" ADD COLUMN "isPlatformSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
