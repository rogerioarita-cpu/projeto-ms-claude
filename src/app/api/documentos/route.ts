import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { isReadOnlySession, getLeadScopeFilter } from "@/server/session-scope";

const DOC_TYPES = ["procuracao", "nda", "contrato", "aditivo", "outro"] as const;

export async function GET(request: Request) {
  try {
    const leadScope = await getLeadScopeFilter();
    const { searchParams } = new URL(request.url);
    const leadIdParam = searchParams.get("leadId");
    // Se o usuário tiver escopo (perfil Lead/Cliente), ignora o filtro da querystring
    // e força a restrição ao lead vinculado.
    const leadId = leadScope ?? leadIdParam;
    const documents = await prisma.document.findMany({
      where: leadId ? { leadId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { lead: true, uploadedBy: true },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET /api/documentos", error);
    return NextResponse.json({ error: "Não foi possível carregar os documentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const type = String(body.type ?? "outro");
    const leadId = body.leadId ? String(body.leadId) : null;
    const storagePath = body.storagePath ? String(body.storagePath).trim() : null;
    const sizeKb = body.sizeKb !== undefined && body.sizeKb !== "" ? Number(body.sizeKb) : 0;
    const note = body.note ? String(body.note).trim() : null;

    if (!name) return NextResponse.json({ error: "O nome do documento é obrigatório." }, { status: 400 });
    if (!DOC_TYPES.includes(type as (typeof DOC_TYPES)[number])) {
      return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
    }
    if (!leadId) return NextResponse.json({ error: "Selecione o lead ao qual o documento pertence." }, { status: 400 });

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 400 });

    // Versionamento automático: v1, v2, v3... por tipo de documento, por lead (PRD 6.4).
    const lastVersion = await prisma.document.findFirst({
      where: { leadId, type: type as (typeof DOC_TYPES)[number] },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    const uploadedById = (session?.user as { id?: string } | undefined)?.id;
    const document = await prisma.document.create({
      data: { name, type: type as (typeof DOC_TYPES)[number], storagePath, sizeKb: Number.isFinite(sizeKb) ? sizeKb : 0, note, version, leadId, uploadedById, status: "enviado" },
      include: { lead: true, uploadedBy: true },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("POST /api/documentos", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o documento." }, { status: 500 });
  }
}
