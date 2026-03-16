import { Router, Request, Response } from 'express';
import { licenseRateLimiter } from '../middleware/rateLimiter';
import { activateLicense, validateLicense } from '../services/licenseService';

const router = Router();

// POST /api/license/activate
router.post('/activate', licenseRateLimiter, async (req: Request, res: Response) => {
  const { license_key, hardware_id } = req.body;

  if (!license_key || !hardware_id) {
    res.status(400).json({
      success: false,
      error:   'MISSING_FIELDS',
      message: 'license_key e hardware_id sao obrigatorios',
    });
    return;
  }

  const ip     = req.ip || req.socket.remoteAddress || 'unknown';
  const result = await activateLicense(license_key.toUpperCase().trim(), hardware_id, ip);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      INVALID_KEY:       404,
      INVALID_FORMAT:    400,
      ALREADY_ACTIVATED: 409,
      REVOKED:           403,
      EXPIRED:           402,
      SERVER_ERROR:      500,
    };
    res.status(statusMap[result.error!] || 400).json(result);
    return;
  }

  res.json(result);
});

// POST /api/license/validate
router.post('/validate', licenseRateLimiter, async (req: Request, res: Response) => {
  const { license_key, hardware_id } = req.body;

  if (!license_key || !hardware_id) {
    res.status(400).json({
      success: false,
      error:   'MISSING_FIELDS',
    });
    return;
  }

  const ip     = req.ip || req.socket.remoteAddress || 'unknown';
  const result = await validateLicense(license_key.toUpperCase().trim(), hardware_id, ip);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      INVALID_KEY:      404,
      HARDWARE_MISMATCH: 403,
      REVOKED:          403,
      EXPIRED:          402,
      SERVER_ERROR:     500,
    };
    res.status(statusMap[result.error!] || 400).json(result);
    return;
  }

  res.json(result);
});

export default router;
