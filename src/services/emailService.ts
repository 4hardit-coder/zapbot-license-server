import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLicenseEmail(
  customerEmail: string,
  customerName:  string,
  licenseKey:    string,
  expiresAt:     Date
): Promise<boolean> {
  const firstName   = customerName.split(' ')[0];
  const expiryFormatted = expiresAt.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  try {
    const { error } = await resend.emails.send({
      from:    process.env.EMAIL_FROM    || '4Hard Zap-Marketing <onboarding@resend.dev>',
      replyTo: process.env.EMAIL_REPLY_TO || '4hard.it@gmail.com',
      to:      customerEmail,
      subject: '🔑 Sua licenca 4Hard Zap-Marketing chegou!',
      html:    buildEmailHtml(firstName, licenseKey, expiryFormatted),
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }

    console.log(`Email enviado para ${customerEmail}`);
    return true;
  } catch (err) {
    console.error('Erro no servico de email:', err);
    return false;
  }
}

function buildEmailHtml(
  firstName:        string,
  licenseKey:       string,
  expiryFormatted:  string
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sua licenca 4Hard Zap-Marketing</title>
</head>
<body style="margin:0;padding:0;background:#090d13;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#141b26;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#00C853,#00A844);padding:32px;text-align:center;">
      <h1 style="margin:0;color:#030b05;font-size:1.6rem;font-weight:800;letter-spacing:-0.03em;">
        4Hard Zap-Marketing
      </h1>
      <p style="margin:8px 0 0;color:rgba(0,0,0,0.7);font-size:0.9rem;">
        Sua licenca foi ativada com sucesso
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#e2e8f0;font-size:1rem;margin:0 0 24px;">
        Ola, <strong>${firstName}</strong>! 👋
      </p>
      <p style="color:#94a3b8;font-size:0.9rem;line-height:1.6;margin:0 0 24px;">
        Obrigado pela sua compra! Abaixo esta a sua chave de licenca exclusiva.
        Guarde este email em local seguro.
      </p>

      <!-- Chave -->
      <div style="background:#0f1621;border:2px dashed rgba(0,200,83,0.4);border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;">
          Sua chave de licenca
        </p>
        <p style="margin:0;color:#00E676;font-size:1.4rem;font-weight:800;letter-spacing:0.15em;font-family:monospace;">
          ${licenseKey}
        </p>
      </div>

      <!-- Validade -->
      <div style="background:rgba(0,200,83,0.05);border-left:3px solid #00C853;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 24px;">
        <p style="margin:0;color:#94a3b8;font-size:0.85rem;">
          📅 Valida ate: <strong style="color:#e2e8f0;">${expiryFormatted}</strong>
        </p>
      </div>

      <!-- Instrucoes -->
      <p style="color:#64748b;font-size:0.85rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">
        Como ativar
      </p>
      <ol style="color:#94a3b8;font-size:0.875rem;line-height:1.8;padding-left:20px;margin:0 0 24px;">
        <li>Abra o <strong style="color:#e2e8f0;">ZapBot.exe</strong> no seu computador</li>
        <li>Na tela de ativacao, cole a chave acima</li>
        <li>Clique em <strong style="color:#e2e8f0;">Ativar Licenca</strong></li>
        <li>Pronto! O sistema sera liberado automaticamente</li>
      </ol>

      <!-- Aviso -->
      <div style="background:rgba(255,193,7,0.08);border-radius:8px;padding:12px 16px;margin:0 0 24px;">
        <p style="margin:0;color:#fbbf24;font-size:0.8rem;">
          ⚠️ Esta licenca e valida para <strong>1 computador</strong> apenas.
          Em caso de troca de maquina, entre em contato com o suporte.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;color:#475569;font-size:0.75rem;">
        Suporte: <a href="mailto:4hard.it@gmail.com" style="color:#00C853;text-decoration:none;">4hard.it@gmail.com</a>
      </p>
      <p style="margin:8px 0 0;color:#334155;font-size:0.7rem;">
        &copy; 2026 4Hard Zap-Marketing. Todos os direitos reservados.
      </p>
    </div>

  </div>
</body>
</html>`;
}
