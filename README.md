# 4Hard Zap-Marketing — License Server

Servidor de licenças para o sistema ZapBot.

---

## Setup Local

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/4hardit-coder/zapbot-license-server.git
cd zapbot-license-server
npm install
```

### 2. Gerar par de chaves RSA

Execute no terminal (Git Bash no Windows):

```bash
mkdir keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

A chave `public.pem` vai ser copiada para o projeto C# do desktop.

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com seus dados reais.

Para gerar o hash da senha admin:
```bash
node -e "const b=require('bcryptjs');console.log(b.hashSync('SUA_SENHA',12))"
```

Cole o resultado em `ADMIN_PASSWORD_HASH` no `.env`.

### 4. Rodar migrations e iniciar

```bash
npm run setup   # gera client Prisma + roda migrations
npm run dev     # inicia servidor em modo desenvolvimento
```

Servidor disponível em: http://localhost:3000
Painel admin em: http://localhost:3000/admin

---

## Deploy no Railway

### 1. Variáveis de ambiente no Railway

No painel do Railway → seu projeto → Variables, adicione:

```
DATABASE_URL          = (Railway preenche automaticamente)
JWT_PRIVATE_KEY_PATH  = ./keys/private.pem
JWT_PUBLIC_KEY_PATH   = ./keys/public.pem
JWT_ADMIN_SECRET      = (string aleatória longa)
LICENSE_TOKEN_EXPIRY  = 25h
ADMIN_EMAIL           = 4hard.it@gmail.com
ADMIN_PASSWORD_HASH   = (hash gerado com bcrypt)
RESEND_API_KEY        = re_xxxxxxxxxxxx
EMAIL_FROM            = 4Hard Zap-Marketing <onboarding@resend.dev>
EMAIL_REPLY_TO        = 4hard.it@gmail.com
HOTMART_HOTTOK        = (token do Hotmart)
CORS_ORIGIN           = https://empowering-acceptance-production-1eec.up.railway.app
NODE_ENV              = production
PORT                  = 3000
```

### 2. Chaves RSA no Railway

As chaves RSA precisam estar no Railway. Duas opções:

**Opção A (recomendada para MVP):** Commit a chave pública (nunca a privada) e use variável de ambiente para a privada:

```bash
# Adicionar ao Railway como variável (valor = conteúdo do arquivo private.pem)
JWT_PRIVATE_KEY = -----BEGIN RSA PRIVATE KEY-----\n...
```

Ajustar `jwtService.ts` para ler de variável de ambiente se o arquivo não existir.

**Opção B:** Usar Railway Volumes para persistir a pasta `keys/`.

### 3. Webhook do Hotmart

URL para cadastrar no Hotmart:
```
https://empowering-acceptance-production-1eec.up.railway.app/api/webhook/hotmart
```

---

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | /health | Health check |
| POST | /api/license/activate | Ativar licença (ZapBot Desktop) |
| POST | /api/license/validate | Validar licença (ZapBot Desktop) |
| POST | /api/webhook/hotmart | Webhook de compra Hotmart |
| POST | /api/admin/login | Login do admin |
| GET  | /api/admin/stats | Estatísticas |
| GET  | /api/admin/licenses | Listar licenças |
| GET  | /api/admin/licenses/:id | Detalhes da licença |
| PATCH | /api/admin/licenses/:id/revoke | Revogar licença |
| POST | /api/admin/licenses/manual | Criar licença manual |

---

## Segurança em Produção

- Nunca commitar `keys/private.pem` ou `.env`
- Trocar todas as senhas e chaves antes do deploy em produção
- Ativar HTTPS (Railway fornece automaticamente)
- Configurar `CORS_ORIGIN` apenas para o domínio do painel
