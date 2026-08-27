import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PHASES = ["Lead Cadastrado", "Documentação", "Arquivos Importados", "Análise Fiscal", "Proposta Gerada", "Contrato Assinado", "Aprovação Final"];

// Tipos de documento acompanhados nesta tela (PRD 6.8) — "Outros" fica de fora,
// pois não é um documento obrigatório do fluxo.
const TRACKED_DOC_TYPES: { value: "procuracao" | "nda" | "contrato" | "aditivo"; label: string }[] = [
  { value: "procuracao", label: "Procuração" },
  { value: "nda", label: "NDA" },
  { value: "contrato", label: "Contrato" },
  { value: "aditivo", label: "Aditivo" },
];

// SLA simplificado: dias sem avanço de fase considerados aceitáveis por etapa (MVP —
// futuramente pode virar um campo configurável por lead).
const SLA_DAYS = 30;
const PRESCRICAO_DAYS = 5 * 365;

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function onlyDigits(v: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

export default async function WorkflowPage() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  const linkedLeadId = (session?.user as { linkedLeadId?: string | null } | undefined)?.linkedLeadId;
  const isClienteConsulta = roles.includes("cliente_consulta");

  const leads = await prisma.lead.findMany({
    where: isClienteConsulta ? { id: linkedLeadId ?? "__nenhum__" } : undefined,
    orderBy: { createdAt: "desc" },
  });
  const spedFiles = await prisma.spedFile.findMany({ select: { cnpj: true } });
  const analises = await prisma.analiseFiscal.findMany({ select: { leadId: true, status: true } });
  const documents = await prisma.document.findMany({
    where: {
      type: { in: TRACKED_DOC_TYPES.map((t) => t.value) },
      ...(isClienteConsulta ? { leadId: linkedLeadId ?? "__nenhum__" } : {}),
    },
    select: { leadId: true, type: true, status: true, version: true },
  });

  const now = new Date();

  const items = leads.map((lead) => {
    const leadCnpj = onlyDigits(lead.cnpj);
    const hasImportedFiles = leadCnpj.length > 0 && spedFiles.some((f) => onlyDigits(f.cnpj) === leadCnpj);
    const leadAnalises = analises.filter((a) => a.leadId === lead.id);
    const hasFinishedAnalise = leadAnalises.some((a) => a.status !== "em_andamento");

    // Última versão de cada tipo de documento acompanhado, para este lead.
    const leadDocuments = documents.filter((d) => d.leadId === lead.id);
    const latestByType = TRACKED_DOC_TYPES.map((t) => {
      const versions = leadDocuments.filter((d) => d.type === t.value);
      const latest = versions.reduce<(typeof versions)[number] | null>((acc, d) => (!acc || d.version > acc.version ? d : acc), null);
      return { type: t.value, label: t.label, status: latest?.status ?? null };
    });

    const complete = [
      true, // 1. Lead Cadastrado — sempre completo, o lead existe
      lead.procurationSigned && lead.ndaSigned, // 2. Documentação
      hasImportedFiles, // 3. Arquivos Importados
      hasFinishedAnalise, // 4. Análise Fiscal
      ["proposta", "contrato", "aprovado"].includes(lead.status), // 5. Proposta Gerada
      ["contrato", "aprovado"].includes(lead.status), // 6. Contrato Assinado
      lead.status === "aprovado", // 7. Aprovação Final
    ];
    const currentIndex = complete.findIndex((c) => !c);
    const currentPhase = currentIndex === -1 ? PHASES.length - 1 : currentIndex;
    const nextPhase = lead.status === "aprovado" || lead.status === "cancelado" ? null : PHASES[Math.min(currentPhase + (complete[currentPhase] ? 1 : 0), PHASES.length - 1)];

    const daysInPipeline = daysBetween(lead.createdAt, now);
    const daysSinceUpdate = daysBetween(lead.updatedAt, now);
    const isTerminal = lead.status === "aprovado" || lead.status === "cancelado";
    const prescriptionRisk = !isTerminal && daysInPipeline > PRESCRICAO_DAYS;
    const slaBreach = !isTerminal && daysSinceUpdate > SLA_DAYS;

    return { lead, complete, currentPhase, nextPhase, daysInPipeline, daysSinceUpdate, prescriptionRisk, slaBreach, latestByType };
  });

  return (
    <AppShell title="Workflow e acompanhamento" subtitle="Timeline de 7 fases por lead e acompanhamento de Procuração, NDA, Contrato e Aditivo.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 && <p className="text-sm text-muted">Nenhum lead para acompanhar.</p>}
        {items.map(({ lead, complete, currentPhase, nextPhase, daysInPipeline, prescriptionRisk, slaBreach, latestByType }) => (
          <Card key={lead.id}>
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{lead.companyName}</CardTitle>
              <Badge value={lead.status} />
            </div>
            <p className="mt-1 text-xs text-muted">{daysInPipeline} dia(s) no pipeline</p>

            <ol className="mt-4 space-y-2">
              {PHASES.map((phase, idx) => {
                const done = complete[idx];
                const isCurrent = idx === currentPhase && lead.status !== "aprovado" && lead.status !== "cancelado";
                return (
                  <li key={phase} className="flex items-center gap-2 text-sm">
                    <span
                      className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        done ? "bg-green-500" : isCurrent ? "bg-blue-500" : "bg-gray-200"
                      }`}
                    />
                    <span className={done ? "text-muted line-through" : isCurrent ? "font-medium text-navy" : "text-muted"}>{phase}</span>
                  </li>
                );
              })}
            </ol>

            {nextPhase && (
              <p className="mt-3 text-xs text-muted">
                Próxima etapa: <span className="font-medium text-navy">{nextPhase}</span>
              </p>
            )}

            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-medium text-muted">Documentos</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {latestByType.map((d) => (
                  <span key={d.type} className="flex items-center gap-1 text-xs">
                    <span className="text-muted">{d.label}:</span>
                    <Badge value={d.status ?? "pendente"} />
                  </span>
                ))}
              </div>
            </div>

            {prescriptionRisk && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                ⚠ Risco de prescrição — mais de 5 anos no pipeline sem conclusão
              </p>
            )}
            {slaBreach && !prescriptionRisk && (
              <p className="mt-3 rounded-md bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700">
                ⚠ SLA estourado — mais de {SLA_DAYS} dias sem atualização
              </p>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
