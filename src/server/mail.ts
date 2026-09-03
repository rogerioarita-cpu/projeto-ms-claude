import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

/**
 * Envio de e-mails do sistema (boas-vindas, esqueci minha senha, confirmação
 * de troca de senha). O envio é "best-effort": se não houver nenhuma
 * configuração de SMTP disponível, ou se o envio falhar, isso NUNCA bloqueia
 * a operação que disparou o e-mail — só fica registrado no log do servidor.
 *
 * Resolução da configuração de SMTP a usar, em cascata (primeira que estiver
 * completa vence):
 *   1) SMTP específico do tenant (Tenant.smtp*), se `tenantId` for informado;
 *   2) Configuração geral do sistema (tabela system_settings);
 *   3) Variáveis de ambiente (.env): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 */

// Linha única/singleton de configurações gerais do sistema — sempre o mesmo id.
export const SYSTEM_SETTINGS_ID = "system-settings-singleton";

type SmtpConfig = { host: string; port: number; user: string; pass: string; from: string };

function isCompleteSmtp(cfg: { host?: string | null; user?: string | null; pass?: string | null; from?: string | null }) {
  return Boolean(cfg.host && cfg.user && cfg.pass && cfg.from);
}

async function resolveSmtpConfig(tenantId?: string | null): Promise<SmtpConfig | null> {
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant && isCompleteSmtp({ host: tenant.smtpHost, user: tenant.smtpUser, pass: tenant.smtpPass, from: tenant.smtpFrom })) {
      return { host: tenant.smtpHost!, port: tenant.smtpPort ?? 587, user: tenant.smtpUser!, pass: tenant.smtpPass!, from: tenant.smtpFrom! };
    }
  }

  const system = await prisma.systemSettings.findUnique({ where: { id: SYSTEM_SETTINGS_ID } });
  if (system && isCompleteSmtp({ host: system.smtpHost, user: system.smtpUser, pass: system.smtpPass, from: system.smtpFrom })) {
    return { host: system.smtpHost!, port: system.smtpPort ?? 587, user: system.smtpUser!, pass: system.smtpPass!, from: system.smtpFrom! };
  }

  const envHost = process.env.SMTP_HOST;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envFrom = process.env.SMTP_FROM || envUser;
  if (isCompleteSmtp({ host: envHost, user: envUser, pass: envPass, from: envFrom })) {
    return { host: envHost!, port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587, user: envUser!, pass: envPass!, from: envFrom! };
  }

  return null;
}

type WelcomeEmailInput = {
  name: string | null;
  email: string;
  roleLabels: string[];
  password?: string | null;
  tenantName?: string | null;
  /** Tenant cujo SMTP (se configurado) deve ser usado para este envio. */
  tenantId?: string | null;
  /** Corpo customizado (texto simples), definido pelo super-admin na tela de
   * criação de organização. Quando informado, substitui o corpo padrão —
   * o token {{LOGIN_URL}} dentro dele é trocado pelo link real de login. */
  customBody?: string | null;
};

function loginUrl() {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  return base ? `${base}/login` : "/login";
}

function textToSimpleHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

/** Monta o assunto e o corpo (texto simples e HTML) do e-mail de boas-vindas. */
export function buildWelcomeEmail({ name, email, roleLabels, password, tenantName, customBody }: WelcomeEmailInput) {
  const subject = "Bem-vindo ao sistema de Análise Fiscal";
  const url = loginUrl();

  if (customBody && customBody.trim()) {
    const text = customBody.replaceAll("{{LOGIN_URL}}", url);
    const html = textToSimpleHtml(text);
    return { subject, text, html };
  }

  const greeting = name || email;
  const roles = roleLabels.length ? roleLabels.join(", ") : "—";
  const org = tenantName ? ` na organização ${tenantName}` : "";

  const passwordLineText = password
    ? `Senha: ${password}\n\nRecomendamos alterar sua senha após o primeiro acesso.`
    : `Senha: ainda não definida — acesse o link abaixo e cadastre sua senha antes do primeiro login.`;

  const text = `Olá, ${greeting},

Sua conta no sistema de Análise Fiscal e Recuperação de Créditos (Projeto MS) foi criada com sucesso${org}.

Seus dados de acesso:
Usuário (e-mail): ${email}
Perfil(is): ${roles}
${passwordLineText}

Acesse o sistema em: ${url}

Qualquer dúvida, fale com o administrador da sua organização.

Atenciosamente,
Equipe Projeto MS`;

  const passwordLineHtml = password
    ? `<li><strong>Senha:</strong> ${password}</li>`
    : `<li><strong>Senha:</strong> ainda não definida — acesse o link abaixo e cadastre sua senha antes do primeiro login.</li>`;

  const html = `
<p>Olá, ${greeting},</p>
<p>Sua conta no sistema de <strong>Análise Fiscal e Recuperação de Créditos (Projeto MS)</strong> foi criada com sucesso${org}.</p>
<p><strong>Seus dados de acesso:</strong></p>
<ul>
  <li><strong>Usuário (e-mail):</strong> ${email}</li>
  <li><strong>Perfil(is):</strong> ${roles}</li>
  ${passwordLineHtml}
</ul>
${password ? "<p>Recomendamos alterar sua senha após o primeiro acesso.</p>" : ""}
<p><a href="${url}">Acessar o sistema</a></p>
<p>Qualquer dúvida, fale com o administrador da sua organização.</p>
<p>Atenciosamente,<br/>Equipe Projeto MS</p>`.trim();

  return { subject, text, html };
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  from: fromOverride,
  replyTo,
  tenantId,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Sobrepõe o remetente resolvido — usado no fluxo "Esqueci minha senha",
   * onde o e-mail vai com o próprio usuário solicitante como remetente.
   * ATENÇÃO: muitos provedores de SMTP rejeitam ou marcam como spam mensagens
   * cujo remetente não bate com a conta autenticada (alinhamento SPF/DKIM).
   * Se isso acontecer no seu provedor, use `replyTo` no lugar de `from`. */
  from?: string;
  replyTo?: string;
  /** Tenant cujo SMTP (se configurado) deve ser usado — ver `resolveSmtpConfig`. */
  tenantId?: string | null;
}) {
  const config = await resolveSmtpConfig(tenantId);
  if (!config) {
    console.warn(
      `[mail] Envio não configurado (nem SMTP do tenant, nem geral do sistema, nem variáveis de ambiente) — e-mail para ${to} não foi enviado.`
    );
    return { sent: false as const, reason: "not_configured" as const };
  }

  const from = fromOverride || config.from;

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({ from, to, subject, text, html, ...(replyTo ? { replyTo } : {}) });
    return { sent: true as const };
  } catch (error) {
    console.error(`[mail] Falha ao enviar e-mail para ${to}`, error);
    return { sent: false as const, reason: "send_failed" as const };
  }
}

/** Atalho: monta e envia o e-mail de boas-vindas numa chamada só. Nunca lança —
 * falhas de envio só ficam registradas no log (ver `sendMail`). */
export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const { subject, text, html } = buildWelcomeEmail(input);
  return sendMail({ to: input.email, subject, text, html, tenantId: input.tenantId });
}

/**
 * "Esqueci minha senha": monta o e-mail enviado aos administradores do tenant
 * do solicitante, com o texto fixo pedido e a identificação de quem solicitou.
 */
export function buildForgotPasswordRequestEmail({ requesterName, requesterEmail }: { requesterName: string | null; requesterEmail: string }) {
  const subject = "Esqueci minha senha";
  const name = requesterName || requesterEmail;

  const text = `Alterar minha senha para o Projeto MS - Auditoria fiscal SPED e recuperação de créditos.

Solicitante: ${name} (${requesterEmail})`;

  const html = `
<p>Alterar minha senha para o <strong>Projeto MS - Auditoria fiscal SPED e recuperação de créditos</strong>.</p>
<p><strong>Solicitante:</strong> ${name} (${requesterEmail})</p>`.trim();

  return { subject, text, html };
}

/** Confirmação enviada de volta ao solicitante quando um admin salva a nova senha. */
export function buildPasswordChangedEmail({ name }: { name: string | null }) {
  const subject = "Sua senha foi alterada";
  const greeting = name || "Olá";

  const text = `${greeting},

Sua senha de acesso ao Projeto MS - Auditoria fiscal SPED e recuperação de créditos foi alterada por um administrador, atendendo à sua solicitação de "Esqueci minha senha".

Se você não reconhece esta solicitação, entre em contato com o administrador da sua organização imediatamente.

Atenciosamente,
Equipe Projeto MS`;

  return { subject, text, html: textToSimpleHtml(text) };
}

/** Atalho: monta e envia a confirmação de troca de senha numa chamada só. */
export async function sendPasswordChangedEmail(input: { name: string | null; email: string; tenantId?: string | null }) {
  const { subject, text, html } = buildPasswordChangedEmail(input);
  return sendMail({ to: input.email, subject, text, html, tenantId: input.tenantId });
}
