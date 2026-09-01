import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Usuário admin de demonstração
  const passwordHash = await bcrypt.hash("trocar-esta-senha", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@projeto-ms.local" },
    update: {},
    create: {
      email: "admin@projeto-ms.local",
      name: "Administrador",
      passwordHash,
      status: "ativo",
      roles: { create: [{ role: "admin" }] },
    },
  });

  const analista = await prisma.user.upsert({
    where: { email: "analista@projeto-ms.local" },
    update: {},
    create: {
      email: "analista@projeto-ms.local",
      name: "Beatriz Fontoura",
      passwordHash: await bcrypt.hash("trocar-esta-senha", 10),
      status: "ativo",
      roles: { create: [{ role: "analista_fiscal" }] },
    },
  });

  const auroraLead = await prisma.lead.create({
    data: { companyName: "Indústria Aurora S/A", cnpj: "12.345.678/0001-90", companyType: "industria", status: "aprovado" },
  });
  const valeNorteLead = await prisma.lead.create({
    data: { companyName: "Distribuidora Vale Norte", cnpj: "98.765.432/0001-10", companyType: "revenda", status: "aprovado" },
  });
  const tecnoLead = await prisma.lead.create({
    data: { companyName: "TecnoServiços Ltda", cnpj: "45.678.912/0001-55", companyType: "servicos", status: "aprovado" },
  });

  const projAurora = await prisma.project.create({
    data: {
      leadId: auroraLead.id,
      name: "Auditoria EFD Contribuições 2021-2024",
      status: "auditoria",
      periodStart: new Date("2021-01-01"),
      periodEnd: new Date("2024-12-31"),
      prescriptionDate: new Date("2026-11-30"),
    },
  });
  const projVale = await prisma.project.create({
    data: {
      leadId: valeNorteLead.id,
      name: "Recuperação ICMS-ST",
      status: "analise",
      periodStart: new Date("2022-01-01"),
      periodEnd: new Date("2025-06-30"),
      prescriptionDate: new Date("2027-03-15"),
    },
  });
  const projTecno = await prisma.project.create({
    data: {
      leadId: tecnoLead.id,
      name: "Diagnóstico PIS/COFINS",
      status: "importacao",
      periodStart: new Date("2023-01-01"),
      periodEnd: new Date("2025-12-31"),
      prescriptionDate: new Date("2028-01-20"),
    },
  });

  await prisma.lead.createMany({
    data: [
      { companyName: "Metalúrgica Sul", cnpj: "11.222.333/0001-44", companyType: "industria", contactName: "Carla Menezes", contactEmail: "carla@metalsul.com.br", phone: "(11) 98888-1234", status: "novo", estimatedValue: 180000, procurationSigned: false, ndaSigned: false },
      { companyName: "Rede Farma Plus", cnpj: "22.333.444/0001-55", companyType: "comercio", contactName: "João Ribeiro", contactEmail: "joao@farmaplus.com.br", phone: "(11) 97777-2345", status: "qualificacao", estimatedValue: 320000, procurationSigned: true, ndaSigned: false },
      { companyName: "AgroCampo Cooperativa", cnpj: "33.444.555/0001-66", companyType: "revenda", contactName: "Marina Alves", contactEmail: "marina@agrocampo.coop", phone: "(19) 96666-3456", status: "analise_fiscal", estimatedValue: 540000, procurationSigned: true, ndaSigned: true },
      { companyName: "Transportes Ipê", cnpj: "44.555.666/0001-77", companyType: "servicos", contactName: "Rui Santos", contactEmail: "rui@ipelog.com.br", phone: "(41) 95555-4567", status: "proposta", estimatedValue: 260000, procurationSigned: true, ndaSigned: true },
      { companyName: "Construtora Horizonte", cnpj: "55.666.777/0001-88", companyType: "servicos", contactName: "Ana Paula Dias", contactEmail: "ana@horizonte.eng.br", phone: "(31) 94444-5678", status: "documentacao", estimatedValue: 410000, procurationSigned: true, ndaSigned: false },
      { companyName: "Supermercados Bela Vista", cnpj: "66.777.888/0001-99", companyType: "comercio", contactName: "Tiago Lopes", contactEmail: "tiago@belavista.com.br", phone: "(21) 93333-6789", status: "contrato", estimatedValue: 150000, procurationSigned: true, ndaSigned: true },
    ],
  });
  const leads = await prisma.lead.findMany();
  const leadByName = (name: string) => leads.find((l) => l.companyName === name)!;

  await prisma.inconsistency.createMany({
    data: [
      { projectId: projAurora.id, code: "C100-017", description: "CFOP incompatível com CST de PIS/COFINS", severity: "alta", resolved: false },
      { projectId: projAurora.id, code: "M200-004", description: "Divergência entre apuração e créditos escriturados", severity: "critica", resolved: false },
      { projectId: projVale.id, code: "C170-032", description: "Base de cálculo ICMS-ST sem redução aplicável", severity: "media", resolved: false },
      { projectId: projVale.id, code: "0200-009", description: "NCM inválido no cadastro de itens", severity: "baixa", resolved: true },
      { projectId: projTecno.id, code: "C100-021", description: "Nota cancelada considerada na apuração", severity: "alta", resolved: false },
    ],
  });

  await prisma.taxCredit.createMany({
    data: [
      { projectId: projAurora.id, taxType: "PIS/COFINS", thesis: "Exclusão do ICMS da base de cálculo", amount: 1250000, status: "em_analise", competence: new Date("2023-06-01") },
      { projectId: projAurora.id, taxType: "PIS/COFINS", thesis: "Créditos sobre insumos essenciais", amount: 480000, status: "aprovado", competence: new Date("2024-02-01") },
      { projectId: projVale.id, taxType: "ICMS", thesis: "Restituição de ICMS-ST pago a maior", amount: 890000, status: "protocolado", competence: new Date("2024-09-01") },
      { projectId: projVale.id, taxType: "ICMS", thesis: "Crédito de energia elétrica industrial", amount: 215000, status: "identificado", competence: new Date("2025-01-01") },
      { projectId: projTecno.id, taxType: "PIS/COFINS", thesis: "Insumos de serviços terceirizados", amount: 320000, status: "recuperado", competence: new Date("2024-11-01") },
    ],
  });

  // Documentos (PRD 6.4) — vinculados a leads, com tipo, status e versionamento.
  await prisma.document.createMany({
    data: [
      { leadId: leadByName("AgroCampo Cooperativa").id, name: "Procuracao_AgroCampo.pdf", type: "procuracao", status: "validado", version: 1, sizeKb: 220, uploadedById: admin.id },
      { leadId: leadByName("AgroCampo Cooperativa").id, name: "NDA_AgroCampo.pdf", type: "nda", status: "validado", version: 1, sizeKb: 140, uploadedById: admin.id },
      { leadId: leadByName("Transportes Ipê").id, name: "Procuracao_Ipe.pdf", type: "procuracao", status: "validado", version: 1, sizeKb: 190, uploadedById: admin.id },
      { leadId: leadByName("Transportes Ipê").id, name: "NDA_Ipe.pdf", type: "nda", status: "pendente", version: 1, sizeKb: 110, uploadedById: admin.id },
      { leadId: leadByName("Construtora Horizonte").id, name: "Procuracao_Horizonte.pdf", type: "procuracao", status: "enviado", version: 1, sizeKb: 200, uploadedById: admin.id },
    ],
  });

  // Análise fiscal (PRD 6.7) — com checklist.
  const analiseAgro = await prisma.analiseFiscal.create({
    data: {
      leadId: leadByName("AgroCampo Cooperativa").id,
      taxType: "icms",
      thesis: "Crédito de ICMS sobre energia elétrica na atividade agroindustrial",
      periodStart: "2021-01",
      periodEnd: "2025-06",
      estimatedCredit: 540000,
      status: "concluida",
      diagnosis: "Identificado crédito relevante em três das cinco unidades produtivas.",
      analystId: analista.id,
      checklist: {
        create: [
          { description: "Coletar EFD ICMS/IPI do período", done: true, order: 0 },
          { description: "Validar apuração por unidade", done: true, order: 1 },
          { description: "Calcular crédito recuperável", done: false, order: 2 },
        ],
      },
    },
  });
  await prisma.aprovacao.createMany({
    data: [
      { leadId: analiseAgro.leadId, analiseId: analiseAgro.id, area: "juridico", status: "aprovado", decidedBy: "Dr. Malerba", decidedAt: new Date() },
      { leadId: analiseAgro.leadId, analiseId: analiseAgro.id, area: "financeiro", status: "pendente" },
      { leadId: analiseAgro.leadId, analiseId: analiseAgro.id, area: "comercial", status: "pendente" },
      { leadId: analiseAgro.leadId, analiseId: analiseAgro.id, area: "concorrencia", status: "pendente" },
    ],
  });

  await prisma.analiseFiscal.create({
    data: {
      leadId: leadByName("Transportes Ipê").id,
      taxType: "pis_cofins",
      thesis: "Exclusão do ICMS da base de cálculo do PIS/COFINS",
      periodStart: "2020-01",
      periodEnd: "2025-12",
      estimatedCredit: 260000,
      status: "em_andamento",
      diagnosis: null,
      analystId: analista.id,
      checklist: {
        create: [
          { description: "Coletar EFD Contribuições do período", done: false, order: 0 },
          { description: "Levantar guias de recolhimento", done: false, order: 1 },
        ],
      },
    },
  });

  console.log("Seed concluído. Login de demonstração: admin@projeto-ms.local / trocar-esta-senha");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
