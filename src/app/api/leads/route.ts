import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { parseLeadPayload } from "@/lib/leads/validate";
import { getLeadScopeFilter, isReadOnlySession } from "@/server/session-scope";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const leadScope = await getLeadScopeFilter();
    const leads = await db.lead.findMany({
      where: leadScope ? { id: leadScope } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        owner: true,
        clientFlagLogs: {
          orderBy: { changedAt: "desc" },
          take: 5,
          include: { changedBy: { select: { name: true, email: true } } },
        },
      },
    });
    return NextResponse.json(leads);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("GET /api/leads", error);
    return NextResponse.json({ error: "Não foi possível carregar os leads." }, { status: 500 });
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
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const body = await request.json();
    const data = parseLeadPayload(body);
    // "Cliente" não é editável manualmente: passa a ser true automaticamente
    // quando o lead já nasce com status "contrato".
    const isClient = data.status === "contrato" || data.status === "aprovado";
    const lead = await db.lead.create({
      data: {
        ...data,
        isClient,
        tenantId,
        // Escrita aninhada: a extensão tenant-aware não intercepta sub-operações,
        // por isso o tenantId é incluído manualmente aqui.
        ...(isClient
          ? { clientFlagLogs: { create: { value: true, changedById: userId, tenantId } } }
          : {}),
      },
      include: { owner: true, clientFlagLogs: { orderBy: { changedAt: "desc" }, include: { changedBy: { select: { name: true, email: true } } } } },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    const message = error instanceof Error ? error.message : "Não foi possível cadastrar o lead.";
    const status = /obrigatóri|inválid|deve ter|deve ser/.test(message) ? 400 : 500;
    console.error("POST /api/leads", error);
    return NextResponse.json({ error: message }, { status });
  }
}
