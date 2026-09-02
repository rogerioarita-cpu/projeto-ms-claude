import { NextResponse } from "next/server";
import { isReadOnlySession } from "@/server/session-scope";
import { getTenantId, forTenant, handleTenantError } from "@/server/tenant";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const spedFile = await db.spedFile.findUnique({
      where: { id: params.id },
      include: {
        lead: true,
        project: { include: { lead: true } },
        uploadedBy: true,
      },
    });
    if (!spedFile) return NextResponse.json({ error: "Arquivo SPED não encontrado." }, { status: 404 });
    return NextResponse.json(spedFile);
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("GET /api/sped/[id]", error);
    return NextResponse.json({ error: "Não foi possível carregar o arquivo SPED." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (await isReadOnlySession()) {
      return NextResponse.json({ error: "Seu perfil (Lead/Cliente) tem acesso somente de consulta." }, { status: 403 });
    }

    const tenantId = await getTenantId();
    const db = forTenant(tenantId);
    const existing = await db.spedFile.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Arquivo SPED não encontrado." }, { status: 404 });
    await db.spedFile.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const tenantErr = handleTenantError(error);
    if (tenantErr) return tenantErr;
    console.error("DELETE /api/sped/[id]", error);
    return NextResponse.json({ error: "Não foi possível excluir o arquivo SPED." }, { status: 500 });
  }
}
