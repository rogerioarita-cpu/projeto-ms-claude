export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { parseSpedFile, toSpedFileRecord } from "@/lib/sped/parse";
import type { SpedFileTypeValue } from "@/lib/sped/types";

const VALID_TYPES: SpedFileTypeValue[] = ["efd_icms_ipi", "efd_contribuicoes"];
// Limite defensivo de tamanho de upload no MVP (requisito do PRD: arquivos podem ser > 100 MB;
// aqui usamos um teto de segurança para a rota síncrona — arquivos maiores exigem upload
// direto para storage + processamento assíncrono, previsto para a Fase 2).
const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const files = await prisma.spedFile.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(type && VALID_TYPES.includes(type as SpedFileTypeValue) ? { type: type as SpedFileTypeValue } : {}),
        ...(status && ["sucesso", "aviso", "erro"].includes(status) ? { status: status as "sucesso" | "aviso" | "erro" } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        project: { include: { client: true } },
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
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Envie o arquivo como multipart/form-data (campo 'file')." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "");
    const projectId = formData.get("projectId") ? String(formData.get("projectId")) : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo foi enviado." }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type as SpedFileTypeValue)) {
      return NextResponse.json({ error: "Tipo de arquivo SPED inválido. Use 'efd_icms_ipi' ou 'efd_contribuicoes'." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "O arquivo enviado está vazio." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). O limite atual é ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` }, { status: 400 });
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 400 });
    }

    const content = await file.text();
    const parseResult = parseSpedFile(type as SpedFileTypeValue, content);
   const record = toSpedFileRecord(parseResult);

const extracted = JSON.parse(
  JSON.stringify(record.extracted)
) as Prisma.InputJsonValue;

    const session = await getServerSession(authOptions);
    const uploadedById = (session?.user as { id?: string } | undefined)?.id;

const spedFile = await prisma.spedFile.create({
  data: {
    ...record,
    extracted,
    type: type as SpedFileTypeValue,
    fileName: file.name,
    fileSizeKb: Math.round(file.size / 1024),
    projectId,
    uploadedById,
  },
      include: {
        project: { include: { client: true } },
        uploadedBy: true,
      },
    });

    return NextResponse.json(spedFile, { status: 201 });
  } catch (error) {
    console.error("POST /api/sped", error);
    return NextResponse.json({ error: "Não foi possível importar o arquivo SPED." }, { status: 500 });
  }
}
