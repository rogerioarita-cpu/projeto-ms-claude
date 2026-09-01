import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { parseSpedFile, sniffSpedFileType, toSpedFileRecord } from "@/lib/sped/parse";
import type { SpedFileTypeValue } from "@/lib/sped/types";
import { isReadOnlySession, getLeadScopeFilter } from "@/server/session-scope";

const LABELS: Record<SpedFileTypeValue, string> = {
  efd_icms_ipi: "EFD ICMS/IPI",
  efd_contribuicoes: "EFD Contribuições (PIS/COFINS)",
};

const VALID_TYPES: SpedFileTypeValue[] = ["efd_icms_ipi", "efd_contribuicoes"];
// Limite defensivo de tamanho de upload no MVP (requisito do PRD: arquivos podem ser > 100 MB;
// aqui usamos um teto de segurança para a rota síncrona — arquivos maiores exigem upload
// direto para storage + processamento assíncrono, previsto para a Fase 2).
const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;

function onlyDigits(v: string | null | undefined) {
  return (v ?? "").replace(/\D/g, "");
}

export async function GET(request: Request) {
  try {
    const leadScope = await getLeadScopeFilter();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const leadIdParam = searchParams.get("leadId");
    const leadId = leadScope ?? leadIdParam;
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const files = await prisma.spedFile.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(leadId ? { leadId } : {}),
        ...(type && VALID_TYPES.includes(type as SpedFileTypeValue) ? { type: type as SpedFileTypeValue } : {}),
        ...(status && ["sucesso", "aviso", "erro", "duplicado"].includes(status) ? { status: status as "sucesso" | "aviso" | "erro" | "duplicado" } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        lead: true,
        project: { include: { lead: true } },
        uploadedBy: true,
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("GET /api/sped", error);
    return NextResponse.json({ error: "Não foi possível carregar os arquivos SPED importados." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Estado da tentativa de importação, preenchido conforme o parsing avança —
  // usado por `recordFailedImport` para gravar a ocorrência assim que os dados
  // mínimos (lead + arquivo) estiverem disponíveis, mesmo que a importação falhe depois.
  let leadIdAttempt: string | null = null;
  let projectIdAttempt: string | null = null;
  let typeAttempt: SpedFileTypeValue | null = null;
  let fileNameAttempt: string | null = null;
  let fileSizeKbAttempt: number | null = null;
  let uploadedByIdAttempt: string | null | undefined = null;
  let partialRecord: ReturnType<typeof toSpedFileRecord> | null = null;

  // Grava a tentativa de importação como "erro", com o lead, o nome do arquivo,
  // a mensagem de erro e os dados de log (quem tentou importar e quando —
  // este último via `createdAt`, automático). Só grava quando já temos lead e
  // arquivo identificados; falhas antes disso (ex.: nenhum lead selecionado)
  // não geram registro, pois não há o que auditar.
  async function recordFailedImport(errorMessage: string) {
    if (!leadIdAttempt || !fileNameAttempt) return;
    try {
      await prisma.spedFile.create({
        data: {
          type: typeAttempt ?? "efd_icms_ipi",
          status: "erro",
          fileName: fileNameAttempt,
          fileSizeKb: fileSizeKbAttempt ?? 0,
          companyName: partialRecord?.companyName ?? null,
          cnpj: partialRecord?.cnpj ?? null,
          ie: partialRecord?.ie ?? null,
          uf: partialRecord?.uf ?? null,
          periodStart: partialRecord?.periodStart ?? null,
          periodEnd: partialRecord?.periodEnd ?? null,
          totalRecords: partialRecord?.totalRecords ?? 0,
          warningsCount: partialRecord?.warningsCount ?? 0,
          errorsCount: (partialRecord?.errorsCount ?? 0) || 1,
          extracted: { importError: errorMessage, ...(partialRecord?.extracted ? { parsed: JSON.parse(JSON.stringify(partialRecord.extracted)) } : {}) },
          leadId: leadIdAttempt,
          projectId: projectIdAttempt,
          uploadedById: uploadedByIdAttempt ?? null,
        },
      });
    } catch (logError) {
      // Não deixa uma falha ao registrar o log mascarar o erro original de importação.
      console.error("Falha ao gravar tentativa de importação com erro", logError);
    }
  }

  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Envie o arquivo como multipart/form-data (campo 'file')." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "");
    const leadId = formData.get("leadId") ? String(formData.get("leadId")) : "";
    const projectId = formData.get("projectId") ? String(formData.get("projectId")) : null;

    leadIdAttempt = leadId || null;
    projectIdAttempt = projectId;
    typeAttempt = VALID_TYPES.includes(type as SpedFileTypeValue) ? (type as SpedFileTypeValue) : null;
    if (file instanceof File) {
      fileNameAttempt = file.name;
      fileSizeKbAttempt = Math.round(file.size / 1024);
    }

    const session = await getServerSession(authOptions);
    uploadedByIdAttempt = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (!leadId) {
      return NextResponse.json({ error: "Selecione o lead antes de importar o arquivo." }, { status: 400 });
    }

    // Confirma a existência do lead ANTES de qualquer outra validação: as demais
    // checagens abaixo podem gravar um registro de "importação com erro", que
    // exige um leadId válido (chave estrangeira obrigatória).
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo foi enviado." }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type as SpedFileTypeValue)) {
      const msg = "Tipo de arquivo SPED inválido. Use 'efd_icms_ipi' ou 'efd_contribuicoes'.";
      await recordFailedImport(msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (file.size === 0) {
      const msg = "O arquivo enviado está vazio.";
      await recordFailedImport(msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const msg = `Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). O limite atual é ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`;
      await recordFailedImport(msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        const msg = "Projeto não encontrado.";
        await recordFailedImport(msg);
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      if (project.leadId && project.leadId !== leadId) {
        const msg = "O projeto selecionado não pertence ao lead selecionado.";
        await recordFailedImport(msg);
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    const content = await file.text();

    // Valida se o conteúdo do arquivo realmente corresponde ao tipo selecionado
    // (EFD ICMS/IPI vs EFD Contribuições) antes de processar — evita parsing
    // incorreto (campos desalinhados) e ignora a importação com mensagem clara.
    const sniff = sniffSpedFileType(content);
    if (sniff.detected && sniff.detected !== type) {
      const msg = `Tipo de arquivo incompatível: o arquivo enviado parece ser ${LABELS[sniff.detected]}, mas foi selecionado ${LABELS[type as SpedFileTypeValue]}. Selecione o tipo correto e importe novamente.`;
      await recordFailedImport(msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const parseResult = parseSpedFile(type as SpedFileTypeValue, content);
    const record = toSpedFileRecord(parseResult);
    partialRecord = record;

    // Confere se o CNPJ identificado no arquivo (registro 0000) bate com o CNPJ
    // cadastrado no Lead/Cliente selecionado — evita importar o arquivo de uma
    // empresa diferente da que está sendo processada.
    const fileCnpjDigits = onlyDigits(record.cnpj);
    const leadCnpjDigits = onlyDigits(lead.cnpj);
    if (fileCnpjDigits && leadCnpjDigits && fileCnpjDigits !== leadCnpjDigits) {
      const msg = "CNPJ do arquivo é diferente do cliente";
      await recordFailedImport(msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const uploadedById = uploadedByIdAttempt;

    // Verifica se já existe uma importação bem-sucedida do mesmo arquivo: mesmo CNPJ,
    // mesmo tipo (EFD ICMS/IPI ou Contribuições) e mesmo período de apuração.
    const recordCnpjDigits = onlyDigits(record.cnpj);
    if (recordCnpjDigits) {
      const candidates = await prisma.spedFile.findMany({
        where: {
          type: type as SpedFileTypeValue,
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          status: { not: "duplicado" },
          leadId,
          ...(projectId ? { projectId } : {}),
        },
        select: { id: true, cnpj: true, fileName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      const existing = candidates.find((c) => onlyDigits(c.cnpj) === recordCnpjDigits);

      if (existing) {
        // Registra a tentativa como "já importado", sem duplicar os dados extraídos.
        await prisma.spedFile.create({
          data: {
            type: type as SpedFileTypeValue,
            status: "duplicado",
            fileName: file.name,
            fileSizeKb: Math.round(file.size / 1024),
            companyName: record.companyName,
            cnpj: record.cnpj,
            ie: record.ie,
            uf: record.uf,
            periodStart: record.periodStart,
            periodEnd: record.periodEnd,
            leadId,
            projectId,
            uploadedById,
            duplicateOfId: existing.id,
          },
        });

        return NextResponse.json(
          {
            error: `Este arquivo já foi importado anteriormente (${existing.fileName}, em ${existing.createdAt.toLocaleDateString("pt-BR")}). O novo upload foi bloqueado.`,
            duplicateOfId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    const spedFile = await prisma.spedFile.create({
      data: {
        ...record,
        extracted: record.extracted ? JSON.parse(JSON.stringify(record.extracted)) : null,
        type: type as SpedFileTypeValue,
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        leadId,
        projectId,
        uploadedById,
      },
      include: {
        lead: true,
        project: { include: { lead: true } },
        uploadedBy: true,
      },
    });

    return NextResponse.json(spedFile, { status: 201 });
  } catch (error) {
    console.error("POST /api/sped", error);
    const msg = error instanceof Error ? error.message : "Não foi possível importar o arquivo SPED.";
    await recordFailedImport(msg);
    return NextResponse.json({ error: "Não foi possível importar o arquivo SPED." }, { status: 500 });
  }
}
