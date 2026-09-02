import { NextResponse } from "next/server";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const inconsistencies = await db.inconsistency.findMany({
      orderBy: [{ resolved: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
      include: { project: { include: { lead: true } } },
    });
    return NextResponse.json(inconsistencies);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("GET /api/auditoria", error);
    return NextResponse.json({ error: "Não foi possível carregar as inconsistências." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const db = forTenant(tenantId);

    const body = await request.json();
    const code = String(body.code ?? "").trim();
    const description = String(body.description ?? "").trim();
    const severity = String(body.severity ?? "media");
    const projectId = body.projectId ? String(body.projectId) : null;

    if (!code || !description) {
      return NextResponse.json({ error: "Código e descrição são obrigatórios." }, { status: 400 });
    }
    if (!["baixa", "media", "alta", "critica"].includes(severity)) {
      return NextResponse.json({ error: "Severidade inválida." }, { status: 400 });
    }
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const inconsistency = await db.inconsistency.create({
      data: { code, description, severity: severity as "baixa" | "media" | "alta" | "critica", projectId, tenantId },
      include: { project: { include: { lead: true } } },
    });
    return NextResponse.json(inconsistency, { status: 201 });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("POST /api/auditoria", error);
    return NextResponse.json({ error: "Não foi possível criar a inconsistência." }, { status: 500 });
  }
}
