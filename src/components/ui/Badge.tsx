const COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  critica: "bg-red-100 text-red-800",

  identificado: "bg-gray-100 text-gray-700",
  em_analise: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-blue-100 text-blue-800",
  protocolado: "bg-purple-100 text-purple-800",
  recuperado: "bg-green-100 text-green-800",
  rejeitado: "bg-red-100 text-red-800",

  planejamento: "bg-gray-100 text-gray-700",
  importacao: "bg-blue-100 text-blue-800",
  auditoria: "bg-yellow-100 text-yellow-800",
  analise: "bg-orange-100 text-orange-800",
  aprovacao: "bg-purple-100 text-purple-800",
  protocolo: "bg-indigo-100 text-indigo-800",
  concluido: "bg-green-100 text-green-800",

  sucesso: "bg-green-100 text-green-800",
  aviso: "bg-yellow-100 text-yellow-800",
  erro: "bg-red-100 text-red-800",
  duplicado: "bg-gray-200 text-gray-700",

  efd_icms_ipi: "bg-blue-100 text-blue-800",
  efd_contribuicoes: "bg-purple-100 text-purple-800",

  novo: "bg-gray-100 text-gray-700",
  qualificacao: "bg-yellow-100 text-yellow-800",
  reuniao_agendada: "bg-blue-100 text-blue-800",
  documentacao: "bg-yellow-100 text-yellow-800",
  analise_fiscal: "bg-orange-100 text-orange-800",
  proposta: "bg-indigo-100 text-indigo-800",
  contrato: "bg-purple-100 text-purple-800",
  cancelado: "bg-red-100 text-red-800",
  // "aprovado" já mapeado acima (CreditStatus).

  industria: "bg-slate-100 text-slate-700",
  comercio: "bg-teal-100 text-teal-800",
  revenda: "bg-cyan-100 text-cyan-800",
  servicos: "bg-violet-100 text-violet-800",

  procuracao: "bg-blue-100 text-blue-800",
  nda: "bg-purple-100 text-purple-800",
  aditivo: "bg-indigo-100 text-indigo-800",
  outro: "bg-gray-100 text-gray-700",

  enviado: "bg-blue-100 text-blue-800",
  validado: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  // "rejeitado" já mapeado acima (CreditStatus).

  em_andamento: "bg-yellow-100 text-yellow-800",
  concluida: "bg-blue-100 text-blue-800",
  aprovada: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",

  juridico: "bg-indigo-100 text-indigo-800",
  financeiro: "bg-teal-100 text-teal-800",
  comercial: "bg-cyan-100 text-cyan-800",
  concorrencia: "bg-violet-100 text-violet-800",

  ativo: "bg-green-100 text-green-800",
  inativo: "bg-gray-100 text-gray-700",
  bloqueado: "bg-red-100 text-red-800",
};

const LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
  identificado: "Identificado",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  protocolado: "Protocolado",
  recuperado: "Recuperado",
  rejeitado: "Rejeitado",
  planejamento: "Planejamento",
  importacao: "Importação",
  auditoria: "Auditoria",
  analise: "Análise",
  aprovacao: "Aprovação",
  protocolo: "Protocolo",
  concluido: "Concluído",

  sucesso: "Processado com sucesso",
  aviso: "Processado com avisos",
  erro: "Erro no processamento",
  duplicado: "Já importado",

  efd_icms_ipi: "EFD ICMS/IPI",
  efd_contribuicoes: "EFD Contribuições",

  novo: "Novo",
  qualificacao: "Qualificação",
  reuniao_agendada: "Reunião agendada",
  documentacao: "Documentação",
  analise_fiscal: "Análise fiscal",
  proposta: "Proposta",
  contrato: "Contrato",
  cancelado: "Cancelado",

  industria: "Indústria",
  comercio: "Comércio",
  revenda: "Revenda",
  servicos: "Serviços",

  procuracao: "Procuração",
  nda: "NDA",
  aditivo: "Aditivo",
  outro: "Outros",

  enviado: "Enviado",
  validado: "Validado",

  em_andamento: "Em andamento",
  concluida: "Concluída",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",

  pendente: "Pendente",
  juridico: "Jurídico",
  financeiro: "Financeiro",
  comercial: "Comercial",
  concorrencia: "Concorrência",

  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[value] ?? "bg-gray-100 text-gray-700"}`}>
      {LABELS[value] ?? value}
    </span>
  );
}
