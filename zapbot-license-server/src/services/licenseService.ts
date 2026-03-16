import { PrismaClient, LicenseStatus, LogAction } from '@prisma/client';
import { generateLicenseKey, isValidKeyFormat } from '../utils/keyGenerator';
import { generateLicenseToken, LicenseTokenPayload } from './jwtService';

const prisma = new PrismaClient();

// ─── Tipos de retorno ────────────────────────────────────

export interface ActivateResult {
  success: boolean;
  token?:  string;
  expiresAt?: string;
  error?:  'INVALID_KEY' | 'INVALID_FORMAT' | 'ALREADY_ACTIVATED' | 'REVOKED' | 'EXPIRED' | 'SERVER_ERROR';
}

export interface ValidateResult {
  success:  boolean;
  token?:   string;
  expiresAt?: string;
  status?:  LicenseStatus;
  error?:   'INVALID_KEY' | 'HARDWARE_MISMATCH' | 'REVOKED' | 'EXPIRED' | 'SERVER_ERROR';
}

export interface CreateLicenseResult {
  success:     boolean;
  licenseKey?: string;
  error?:      string;
}

// ─── Ativacao ────────────────────────────────────────────

export async function activateLicense(
  licenseKey: string,
  hardwareId: string,
  ipAddress:  string
): Promise<ActivateResult> {
  // Validar formato antes de buscar no banco
  if (!isValidKeyFormat(licenseKey)) {
    return { success: false, error: 'INVALID_FORMAT' };
  }

  try {
    const license = await prisma.license.findUnique({
      where: { license_key: licenseKey },
    });

    if (!license) {
      await logAction(null, hardwareId, ipAddress, LogAction.REJECT, 'Chave nao encontrada');
      return { success: false, error: 'INVALID_KEY' };
    }

    // Verificar status
    if (license.status === LicenseStatus.REVOKED) {
      await logAction(license.id, hardwareId, ipAddress, LogAction.REJECT, 'Licenca revogada');
      return { success: false, error: 'REVOKED' };
    }

    if (license.status === LicenseStatus.EXPIRED || license.expires_at < new Date()) {
      await logAction(license.id, hardwareId, ipAddress, LogAction.REJECT, 'Licenca expirada');
      return { success: false, error: 'EXPIRED' };
    }

    // Verificar se ja foi ativada em outro hardware
    if (license.hardware_id && license.hardware_id !== hardwareId) {
      await logAction(license.id, hardwareId, ipAddress, LogAction.REJECT, 'Hardware diferente do registrado');
      return { success: false, error: 'ALREADY_ACTIVATED' };
    }

    // Primeira ativacao ou reativacao no mesmo hardware
    const isFirstActivation = !license.hardware_id;

    await prisma.license.update({
      where: { id: license.id },
      data: {
        status:           LicenseStatus.ACTIVE,
        hardware_id:      hardwareId,
        activated_at:     isFirstActivation ? new Date() : license.activated_at,
        last_validated_at: new Date(),
      },
    });

    await logAction(
      license.id, hardwareId, ipAddress,
      LogAction.ACTIVATE,
      isFirstActivation ? 'Primeira ativacao' : 'Reativacao no mesmo hardware'
    );

    const token = generateLicenseToken({
      licenseKey:    license.license_key,
      hardwareId:    hardwareId,
      customerEmail: license.customer_email,
      plan:          license.plan,
      expiresAt:     license.expires_at.toISOString(),
    });

    return {
      success:   true,
      token,
      expiresAt: license.expires_at.toISOString(),
    };
  } catch (err) {
    console.error('Erro ao ativar licenca:', err);
    return { success: false, error: 'SERVER_ERROR' };
  }
}

// ─── Validacao periodica ─────────────────────────────────

export async function validateLicense(
  licenseKey: string,
  hardwareId: string,
  ipAddress:  string
): Promise<ValidateResult> {
  if (!isValidKeyFormat(licenseKey)) {
    return { success: false, error: 'INVALID_KEY' };
  }

  try {
    const license = await prisma.license.findUnique({
      where: { license_key: licenseKey },
    });

    if (!license) {
      return { success: false, error: 'INVALID_KEY' };
    }

    if (license.status === LicenseStatus.REVOKED) {
      await logAction(license.id, hardwareId, ipAddress, LogAction.REJECT, 'Licenca revogada');
      return { success: false, error: 'REVOKED' };
    }

    if (license.expires_at < new Date()) {
      // Atualizar status para expirado
      await prisma.license.update({
        where: { id: license.id },
        data:  { status: LicenseStatus.EXPIRED },
      });
      await logAction(license.id, hardwareId, ipAddress, LogAction.EXPIRE, 'Licenca expirada');
      return { success: false, error: 'EXPIRED' };
    }

    // Verificar hardware
    if (license.hardware_id !== hardwareId) {
      await logAction(license.id, hardwareId, ipAddress, LogAction.REJECT, 'Hardware nao confere');
      return { success: false, error: 'HARDWARE_MISMATCH' };
    }

    // Atualizar timestamp de ultima validacao
    await prisma.license.update({
      where: { id: license.id },
      data:  { last_validated_at: new Date() },
    });

    await logAction(license.id, hardwareId, ipAddress, LogAction.VALIDATE, 'Validacao periodica ok');

    const token = generateLicenseToken({
      licenseKey:    license.license_key,
      hardwareId:    hardwareId,
      customerEmail: license.customer_email,
      plan:          license.plan,
      expiresAt:     license.expires_at.toISOString(),
    });

    return {
      success:   true,
      token,
      expiresAt: license.expires_at.toISOString(),
      status:    LicenseStatus.ACTIVE,
    };
  } catch (err) {
    console.error('Erro ao validar licenca:', err);
    return { success: false, error: 'SERVER_ERROR' };
  }
}

// ─── Criacao de licenca (Hotmart ou manual) ──────────────

export async function createLicense(
  customerEmail: string,
  customerName:  string,
  hotmartTxnId?: string
): Promise<CreateLicenseResult> {
  try {
    // Verificar se ja existe licenca para essa transacao
    if (hotmartTxnId) {
      const existing = await prisma.license.findUnique({
        where: { hotmart_txn_id: hotmartTxnId },
      });
      if (existing) {
        return { success: true, licenseKey: existing.license_key };
      }
    }

    const licenseKey = generateLicenseKey();
    const expiresAt  = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 ano

    await prisma.license.create({
      data: {
        license_key:    licenseKey,
        customer_email: customerEmail,
        customer_name:  customerName,
        hotmart_txn_id: hotmartTxnId || null,
        plan:           'annual',
        status:         LicenseStatus.PENDING,
        expires_at:     expiresAt,
      },
    });

    return { success: true, licenseKey };
  } catch (err) {
    console.error('Erro ao criar licenca:', err);
    return { success: false, error: 'Erro ao criar licenca no banco' };
  }
}

// ─── Revogar licenca ─────────────────────────────────────

export async function revokeLicense(licenseId: string): Promise<boolean> {
  try {
    await prisma.license.update({
      where: { id: licenseId },
      data:  { status: LicenseStatus.REVOKED },
    });

    await logAction(licenseId, 'admin', 'admin', LogAction.REVOKE, 'Revogado pelo admin');
    return true;
  } catch {
    return false;
  }
}

// ─── Estatisticas para o dashboard ──────────────────────

export async function getLicenseStats() {
  const [total, active, expired, revoked, pending, activatedToday] = await Promise.all([
    prisma.license.count(),
    prisma.license.count({ where: { status: LicenseStatus.ACTIVE } }),
    prisma.license.count({ where: { status: LicenseStatus.EXPIRED } }),
    prisma.license.count({ where: { status: LicenseStatus.REVOKED } }),
    prisma.license.count({ where: { status: LicenseStatus.PENDING } }),
    prisma.license.count({
      where: {
        activated_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return { total, active, expired, revoked, pending, activatedToday };
}

// ─── Helper interno: registrar log ──────────────────────

async function logAction(
  licenseId: string | null,
  hardwareId: string,
  ipAddress:  string,
  action:     LogAction,
  reason?:    string
): Promise<void> {
  if (!licenseId) return;

  try {
    await prisma.validationLog.create({
      data: {
        license_id:  licenseId,
        hardware_id: hardwareId,
        ip_address:  ipAddress,
        action,
        reason,
      },
    });
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
}
