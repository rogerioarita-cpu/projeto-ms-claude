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
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[value] ?? "bg-gray-100 text-gray-700"}`}>
      {LABELS[value] ?? value}
    </span>
  );
}
