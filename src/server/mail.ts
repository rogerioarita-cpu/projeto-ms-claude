import nodemailer from "nodemailer";

/**
 * Envio de e-mail de boas-vindas ao criar um usuário ou super-administrador.
 * O envio é "best-effort": se as variáveis de ambiente de SMTP não estiverem
 * configuradas, ou se o envio falhar, isso NUNCA bloqueia a criação do
 * usuário — só fica registrado no log do servidor.
 *
 * Variáveis de ambiente esperadas (.env):
 *   SMTP_HOST, SMTP_PORT (opcional, padrão 587), SMTP_USER, SMTP_PASS, SMTP_FROM
 */

type WelcomeEmailInput = {
  name: string | null;
  email: string;
  roleLabels: string[];
  password?: string | null;
  tenantName?: string | null;
};

function loginUrl() {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  return base ? `${base}/login` : "/login";
}

/** Monta o assunto e o corpo (texto simples e HTML) do e-mail de boas-vindas. */
export function buildWelcomeEmail({ name, email, roleLabels, password, tenantName }: WelcomeEmailInput) {
  const subject = "Bem-vindo ao sistema de Análise Fiscal";
  const greeting = name || email;
  const roles = roleLabels.length ? roleLabels.join(", ") : "—";
  const org = tenantName ? ` na organização ${tenantName}` : "";
  const url = loginUrl();

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

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;

  if (!host || !user || !pass || !from) {
    console.warn(`[mail] Envio não configurado (defina SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM no .env) — e-mail para ${to} não foi enviado.`);
    return { sent: false as const, reason: "not_configured" as const };
  }

  try {
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transporter.sendMail({ from, to, subject, text, html });
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
  return sendMail({ to: input.email, subject, text, html });
}
