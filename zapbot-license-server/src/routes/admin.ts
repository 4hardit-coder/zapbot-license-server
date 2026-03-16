import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { adminAuth } from '../middleware/adminAuth';
import { adminLoginRateLimiter } from '../middleware/rateLimiter';
import { generateAdminToken } from '../services/jwtService';
import { revokeLicense, getLicenseStats, createLicense } from '../services/licenseService';
import { sendLicenseEmail } from '../services/emailService';

const router  = Router();
const prisma  = new PrismaClient();

// POST /api/admin/login
router.post('/login', adminLoginRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email e senha obrigatorios' });
    return;
  }

  const expectedEmail = process.env.ADMIN_EMAIL;
  const passwordHash  = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedEmail || !passwordHash) {
    res.status(500).json({ success: false, error: 'Admin nao configurado' });
    return;
  }

  if (email !== expectedEmail) {
    res.status(401).json({ success: false, error: 'Credenciais invalidas' });
    return;
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Credenciais invalidas' });
    return;
  }

  // Atualizar last_login
  await prisma.adminUser.upsert({
    where:  { email },
    update: { last_login_at: new Date() },
    create: { email, password_hash: passwordHash, last_login_at: new Date() },
  });

  const token = generateAdminToken('admin', email);
  res.json({ success: true, token });
});

// GET /api/admin/stats
router.get('/stats', adminAuth, async (_req: Request, res: Response) => {
  const stats = await getLicenseStats();
  res.json({ success: true, data: stats });
});

// GET /api/admin/licenses
router.get('/licenses', adminAuth, async (req: Request, res: Response) => {
  const page   = parseInt(req.query.page as string)   || 1;
  const limit  = parseInt(req.query.limit as string)  || 50;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { customer_email: { contains: search, mode: 'insensitive' } },
      { customer_name:  { contains: search, mode: 'insensitive' } },
      { license_key:    { contains: search, mode: 'insensitive' } },
    ];
  }

  const [licenses, total] = await Promise.all([
    prisma.license.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id:               true,
        license_key:      true,
        customer_email:   true,
        customer_name:    true,
        status:           true,
        plan:             true,
        hardware_id:      true,
        activated_at:     true,
        expires_at:       true,
        last_validated_at: true,
        created_at:       true,
      },
    }),
    prisma.license.count({ where }),
  ]);

  res.json({
    success: true,
    data:    licenses,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/admin/licenses/:id
router.get('/licenses/:id', adminAuth, async (req: Request, res: Response) => {
  const license = await prisma.license.findUnique({
    where:   { id: req.params.id },
    include: {
      logs: {
        orderBy: { created_at: 'desc' },
        take:    20,
      },
    },
  });

  if (!license) {
    res.status(404).json({ success: false, error: 'Licenca nao encontrada' });
    return;
  }

  res.json({ success: true, data: license });
});

// PATCH /api/admin/licenses/:id/revoke
router.patch('/licenses/:id/revoke', adminAuth, async (req: Request, res: Response) => {
  const ok = await revokeLicense(req.params.id);

  if (!ok) {
    res.status(404).json({ success: false, error: 'Licenca nao encontrada' });
    return;
  }

  res.json({ success: true, message: 'Licenca revogada com sucesso' });
});

// POST /api/admin/licenses/manual
router.post('/licenses/manual', adminAuth, async (req: Request, res: Response) => {
  const { email, name } = req.body;

  if (!email || !name) {
    res.status(400).json({ success: false, error: 'Email e nome obrigatorios' });
    return;
  }

  const result = await createLicense(email, name);

  if (!result.success || !result.licenseKey) {
    res.status(500).json({ success: false, error: result.error });
    return;
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  await sendLicenseEmail(email, name, result.licenseKey, expiresAt);

  res.status(201).json({
    success:    true,
    licenseKey: result.licenseKey,
    message:    `Licenca criada e email enviado para ${email}`,
  });
});

export default router;
