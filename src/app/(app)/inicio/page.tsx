import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

const MODULES: { title: string; description: string; href: string }[] = [
  {
    title: "Gestão de Leads",
    description: "Cadastro, qualificação e acompanhamento de leads ao longo do pipeline.",
    href: "/leads",
  },
  {
    title: "Gestão Documental",
    description: "Upload e versionamento de Procuração, NDA, Contratos e Aditivos.",
    href: "/documentos",
  },
  {
    title: "EFD Contribuições — PIS/COFINS",
    description: "Importação e análise de arquivos SPED EFD Contribuições com apuração de PIS/Pasep e COFINS.",
    href: "/importacao",
  },
  {
    title: "Motor de Análise Fiscal",
    description: "Diagnóstico automático com regras parametrizáveis por empresa, imposto e tese.",
    href: "/analise",
  },
  {
    title: "Workflow e Notificações",
    description: "Controle de fases, SLA, alertas de prazo e risco de prescrição (5 anos).",
    href: "/workflow",
  },
  {
    title: "Aprovações",
    description: "Fluxo de aprovação multidisciplinar: Jurídico, Financeiro, Comercial e Concorrência.",
    href: "/aprovacoes",
  },
  {
    title: "Dashboard e KPIs",
    description: "Indicadores de créditos, pendências, tempo médio e evolução do pipeline.",
    href: "/dashboard",
  },
  {
    title: "Cadastro de Usuários",
    description: "Gerenciamento de usuários, perfis RBAC e controle de acesso por empresa.",
    href: "/usuarios",
  },
];

export default function InicioPage() {
  return (
    <AppShell
      title="Bem-vindo ao sistema de Análise Fiscal"
      subtitle="Plataforma para estruturar, automatizar e centralizar o fluxo de análise de recuperação de créditos tributários. Selecione um módulo para começar."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="block rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="font-semibold text-navy">{m.title}</h2>
              <p className="mt-2 text-sm text-muted">{m.description}</p>
            </Link>
          ))}
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Prazo de prescrição:</strong> O prazo legal para recuperação de créditos tributários é de{" "}
          <strong>5 anos</strong>. Cada mês sem ação pode significar crédito prescrito. O sistema alertará
          proativamente sobre esse risco no módulo de Workflow.
        </div>
      </div>
    </AppShell>
  );
}
