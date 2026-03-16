import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}:`, err.message);

  res.status(500).json({
    success: false,
    error:   'SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor',
  });
}
