import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export interface LicenseTokenPayload {
  licenseKey:  string;
  hardwareId:  string;
  customerEmail: string;
  plan:        string;
  expiresAt:   string; // ISO string da expiracao da licenca
  iat?:        number;
  exp?:        number;
}

let privateKey: string;
let publicKey: string;

function loadKeys(): void {
  if (privateKey && publicKey) return;

  const privatePath = path.resolve(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem');
  const publicPath  = path.resolve(process.env.JWT_PUBLIC_KEY_PATH  || './keys/public.pem');

  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
    throw new Error(
      'Chaves RSA nao encontradas. Execute: npm run generate-keys\n' +
      `Esperado em: ${privatePath} e ${publicPath}`
    );
  }

  privateKey = fs.readFileSync(privatePath, 'utf8');
  publicKey  = fs.readFileSync(publicPath,  'utf8');
}

/**
 * Gera um JWT assinado com a chave privada RSA
 * Validade de 25h — forca validacao diaria mas cobre instabilidades
 */
export function generateLicenseToken(payload: LicenseTokenPayload): string {
  loadKeys();

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: (process.env.LICENSE_TOKEN_EXPIRY || '25h') as jwt.SignOptions['expiresIn'],
    issuer:    '4hard-zapmarketing',
    audience:  'zapbot-desktop',
  });
}

/**
 * Verifica um JWT com a chave publica RSA
 * Pode ser executado offline no desktop
 */
export function verifyLicenseToken(token: string): LicenseTokenPayload {
  loadKeys();

  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer:     '4hard-zapmarketing',
    audience:   'zapbot-desktop',
  });

  return decoded as LicenseTokenPayload;
}

/**
 * Retorna apenas a chave publica em formato string
 * Para embutir no executavel desktop
 */
export function getPublicKey(): string {
  loadKeys();
  return publicKey;
}

/**
 * Gera JWT para sessao do admin (HS256 e suficiente aqui)
 */
export function generateAdminToken(adminId: string, email: string): string {
  const secret = process.env.JWT_ADMIN_SECRET;
  if (!secret) throw new Error('JWT_ADMIN_SECRET nao configurado');

  return jwt.sign(
    { adminId, email },
    secret,
    { algorithm: 'HS256', expiresIn: '8h' }
  );
}

/**
 * Verifica JWT do admin
 */
export function verifyAdminToken(token: string): { adminId: string; email: string } {
  const secret = process.env.JWT_ADMIN_SECRET;
  if (!secret) throw new Error('JWT_ADMIN_SECRET nao configurado');

  return jwt.verify(token, secret) as { adminId: string; email: string };
}
