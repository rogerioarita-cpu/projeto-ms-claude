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
      roles: { create: [{ role: "admin" }] },
    },
  });

  const auroraClient = await prisma.client.create({
    data: { name: "Indústria Aurora S/A", cnpj: "12.345.678/0001-90", segment: "Indústria" },
  });
  const valeNorteClient = await prisma.client.create({
    data: { name: "Distribuidora Vale Norte", cnpj: "98.765.432/0001-10", segment: "Atacado" },
  });
  const tecnoClient = await prisma.client.create({
    data: { name: "TecnoServiços Ltda", cnpj: "45.678.912/0001-55", segment: "Serviços" },
  });

  const projAurora = await prisma.project.create({
    data: {
      clientId: auroraClient.id,
      name: "Auditoria EFD Contribuições 2021-2024",
      status: "auditoria",
      periodStart: new Date("2021-01-01"),
      periodEnd: new Date("2024-12-31"),
      prescriptionDate: new Date("2026-11-30"),
    },
  });
  const projVale = await prisma.project.create({
    data: {
      clientId: valeNorteClient.id,
      name: "Recuperação ICMS-ST",
      status: "analise",
      periodStart: new Date("2022-01-01"),
      periodEnd: new Date("2025-06-30"),
      prescriptionDate: new Date("2027-03-15"),
    },
  });
  const projTecno = await prisma.project.create({
    data: {
      clientId: tecnoClient.id,
      name: "Diagnóstico PIS/COFINS",
      status: "importacao",
      periodStart: new Date("2023-01-01"),
      periodEnd: new Date("2025-12-31"),
      prescriptionDate: new Date("2028-01-20"),
    },
  });

  await prisma.lead.createMany({
    data: [
      { companyName: "Metalúrgica Sul", contactName: "Carla Menezes", contactEmail: "carla@metalsul.com.br", stage: "prospeccao", estimatedValue: 180000 },
      { companyName: "Rede Farma Plus", contactName: "João Ribeiro", contactEmail: "joao@farmaplus.com.br", stage: "qualificacao", estimatedValue: 320000 },
      { companyName: "AgroCampo Cooperativa", contactName: "Marina Alves", contactEmail: "marina@agrocampo.coop", stage: "diagnostico", estimatedValue: 540000 },
      { companyName: "Transportes Ipê", contactName: "Rui Santos", contactEmail: "rui@ipelog.com.br", stage: "proposta", estimatedValue: 260000 },
      { companyName: "Construtora Horizonte", contactName: "Ana Paula Dias", contactEmail: "ana@horizonte.eng.br", stage: "negociacao", estimatedValue: 410000 },
      { companyName: "Supermercados Bela Vista", contactName: "Tiago Lopes", contactEmail: "tiago@belavista.com.br", stage: "contrato", estimatedValue: 150000 },
    ],
  });

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

  await prisma.document.createMany({
    data: [
      { projectId: projAurora.id, name: "EFD_Contribuicoes_2023.txt", docType: "SPED", version: 2, uploadedById: admin.id },
      { projectId: projAurora.id, name: "Procuracao_Aurora.pdf", docType: "Jurídico", version: 1, uploadedById: admin.id },
      { projectId: projVale.id, name: "EFD_ICMS_IPI_2024.txt", docType: "SPED", version: 1, uploadedById: admin.id },
      { projectId: projTecno.id, name: "Contrato_TecnoServicos.pdf", docType: "Contrato", version: 3, uploadedById: admin.id },
    ],
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
