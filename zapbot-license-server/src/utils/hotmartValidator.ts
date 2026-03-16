/**
 * Valida a autenticidade de um webhook do Hotmart
 * usando o hottok configurado no painel do Hotmart
 */
export function validateHotmartWebhook(
  receivedHottok: string | undefined
): boolean {
  const expectedHottok = process.env.HOTMART_HOTTOK;

  if (!expectedHottok) {
    console.error('HOTMART_HOTTOK nao configurado nas variaveis de ambiente');
    return false;
  }

  if (!receivedHottok) {
    return false;
  }

  // Comparacao segura contra timing attacks
  return timingSafeEqual(receivedHottok, expectedHottok);
}

/**
 * Comparacao de strings resistente a timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extrai dados relevantes do payload do Hotmart
 * Compativel com o formato de webhook v2 do Hotmart
 */
export interface HotmartPurchaseData {
  transactionId: string;
  customerEmail: string;
  customerName: string;
  productName: string;
  status: string;
}

export function extractPurchaseData(payload: Record<string, unknown>): HotmartPurchaseData | null {
  try {
    const data = payload.data as Record<string, unknown>;
    const buyer = data?.buyer as Record<string, unknown>;
    const purchase = data?.purchase as Record<string, unknown>;
    const product = data?.product as Record<string, unknown>;

    if (!buyer || !purchase || !product) return null;

    return {
      transactionId: purchase.transaction as string,
      customerEmail: buyer.email as string,
      customerName:  buyer.name as string,
      productName:   product.name as string,
      status:        purchase.status as string,
    };
  } catch {
    return null;
  }
}
