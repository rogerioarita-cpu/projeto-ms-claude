import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { WorkflowAccordion, type WorkflowItem } from "@/components/workflow/WorkflowAccordion";

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

  const accordionItems: WorkflowItem[] = items.map(
    ({ lead, complete, currentPhase, nextPhase, daysInPipeline, prescriptionRisk, slaBreach, latestByType }) => ({
      id: lead.id,
      companyName: lead.companyName,
      cnpj: lead.cnpj,
      status: lead.status,
      daysInPipeline,
      complete,
      currentPhase,
      nextPhase,
      prescriptionRisk,
      slaBreach,
      latestByType,
    })
  );

  return (
    <AppShell title="Workflow e acompanhamento" subtitle="Timeline de 7 fases por lead e acompanhamento de Procuração, NDA, Contrato e Aditivo.">
      <WorkflowAccordion items={accordionItems} />
    </AppShell>
  );
}
