import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { isReadOnlySession, getLeadScopeFilter } from "@/server/session-scope";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";

const DOC_TYPES = ["procuracao", "nda", "contrato", "aditivo", "outro"] as const;

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const leadScope = await getLeadScopeFilter();
    const { searchParams } = new URL(request.url);
    const leadIdParam = searchParams.get("leadId");
    // Se o usuário tiver escopo (perfil Lead/Cliente), ignora o filtro da querystring
    // e força a restrição ao lead vinculado.
    const leadId = leadScope ?? leadIdParam;
    const documents = await db.document.findMany({
      where: leadId ? { leadId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { lead: true, uploadedBy: true },
    });
    return NextResponse.json(documents);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("GET /api/documentos", error);
    return NextResponse.json({ error: "Não foi possível carregar os documentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
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

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 400 });

    // Versionamento automático: v1, v2, v3... por tipo de documento, por lead (PRD 6.4).
    const lastVersion = await db.document.findFirst({
      where: { leadId, type: type as (typeof DOC_TYPES)[number] },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    const uploadedById = (session?.user as { id?: string } | undefined)?.id;
    const document = await db.document.create({
      data: { name, type: type as (typeof DOC_TYPES)[number], storagePath, sizeKb: Number.isFinite(sizeKb) ? sizeKb : 0, note, version, leadId, uploadedById, status: "enviado", tenantId },
      include: { lead: true, uploadedBy: true },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("POST /api/documentos", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o documento." }, { status: 500 });
  }
}
