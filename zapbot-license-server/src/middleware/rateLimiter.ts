import rateLimit from 'express-rate-limit';

// Rotas publicas de licenca: 10 req/min por IP
export const licenseRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT',
    message: 'Muitas tentativas. Aguarde 1 minuto.',
  },
});

// Login admin: 5 tentativas a cada 15 minutos
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT',
    message: 'Muitas tentativas de login. Aguarde 15 minutos.',
  },
});
