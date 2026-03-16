import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/jwtService';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token nao fornecido' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAdminToken(token);
    (req as Request & { admin: typeof payload }).admin = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token invalido ou expirado' });
  }
}
