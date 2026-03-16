import 'dotenv/config';
import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ================================================');
  console.log('   4Hard Zap-Marketing — License Server');
  console.log('  ================================================');
  console.log(`  Rodando em: http://localhost:${PORT}`);
  console.log(`  Ambiente:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Painel:     http://localhost:${PORT}/admin`);
  console.log('  ================================================');
  console.log('');
});
