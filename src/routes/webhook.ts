import { Router, Request, Response } from 'express';
import { validateHotmartWebhook, extractPurchaseData } from '../utils/hotmartValidator';
import { createLicense } from '../services/licenseService';
import { sendLicenseEmail } from '../services/emailService';

const router = Router();

// POST /api/webhook/hotmart
router.post('/hotmart', async (req: Request, res: Response) => {
  // Sempre retornar 200 para o Hotmart nao retentar
  // Processar de forma assincrona

  const hottok = req.headers['x-hotmart-hottok'] as string;

  if (!validateHotmartWebhook(hottok)) {
    console.warn(`Webhook Hotmart rejeitado - hottok invalido. IP: ${req.ip}`);
    res.status(200).json({ received: true }); // 200 mesmo assim
    return;
  }

  const purchaseData = extractPurchaseData(req.body);

  if (!purchaseData) {
    console.warn('Webhook Hotmart: payload invalido ou incompleto');
    res.status(200).json({ received: true });
    return;
  }

  // Processar apenas compras aprovadas
  if (purchaseData.status !== 'APPROVED' && purchaseData.status !== 'COMPLETE') {
    console.log(`Webhook Hotmart ignorado - status: ${purchaseData.status}`);
    res.status(200).json({ received: true });
    return;
  }

  console.log(`Nova compra Hotmart: ${purchaseData.customerEmail} - txn: ${purchaseData.transactionId}`);

  // Responder imediatamente e processar em background
  res.status(200).json({ received: true });

  // Processar de forma assincrona (nao bloqueia a resposta)
  setImmediate(async () => {
    try {
      const result = await createLicense(
        purchaseData.customerEmail,
        purchaseData.customerName,
        purchaseData.transactionId
      );

      if (!result.success || !result.licenseKey) {
        console.error('Falha ao criar licenca para:', purchaseData.customerEmail);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const emailSent = await sendLicenseEmail(
        purchaseData.customerEmail,
        purchaseData.customerName,
        result.licenseKey,
        expiresAt
      );

      if (!emailSent) {
        console.error(`ATENCAO: Email nao enviado para ${purchaseData.customerEmail} - chave: ${result.licenseKey}`);
      } else {
        console.log(`Licenca criada e email enviado: ${result.licenseKey} -> ${purchaseData.customerEmail}`);
      }
    } catch (err) {
      console.error('Erro no processamento do webhook:', err);
    }
  });
});

export default router;
