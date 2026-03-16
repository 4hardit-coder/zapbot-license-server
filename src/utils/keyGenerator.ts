import { randomBytes } from 'crypto';

/**
 * Gera uma chave de licenca unica no formato ZAPB-XXXX-XXXX-XXXX
 * Usa apenas caracteres sem ambiguidade (sem 0, O, I, L)
 */
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SEGMENT_LENGTH = 4;
const SEGMENTS = 3;

export function generateLicenseKey(): string {
  const segments: string[] = [];

  for (let s = 0; s < SEGMENTS; s++) {
    let segment = '';
    const bytes = randomBytes(SEGMENT_LENGTH * 2);
    let byteIndex = 0;

    while (segment.length < SEGMENT_LENGTH) {
      const byte = bytes[byteIndex++];
      // Rejeitar bytes que causariam bias (modulo bias)
      if (byte < 256 - (256 % CHARSET.length)) {
        segment += CHARSET[byte % CHARSET.length];
      }
    }
    segments.push(segment);
  }

  return `ZAPB-${segments.join('-')}`;
}

/**
 * Valida o formato de uma chave antes de buscar no banco
 */
export function isValidKeyFormat(key: string): boolean {
  return /^ZAPB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(key);
}
