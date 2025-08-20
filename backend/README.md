# Monitoring Platform - Backend

Uma plataforma robusta de monitoramento de sites e portais com sistema completo de notificações e gerenciamento de configurações.

## 🚀 Características

- **Monitoramento de Sites**: Verificação automática de disponibilidade e performance
- **Sistema de Notificações**: Alertas por email e webhook
- **Gerenciamento de API Keys**: Sistema seguro de autenticação
- **Configurações Flexíveis**: Painel completo de configurações do sistema
- **Relatórios Detalhados**: Histórico completo de monitoramento
- **Dashboard em Tempo Real**: Visualização instantânea do status dos sites

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Express.js** - Framework web
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **bcrypt** - Criptografia de senhas
- **nodemailer** - Envio de emails
- **axios** - Cliente HTTP
- **cors** - Cross-Origin Resource Sharing
- **dotenv** - Gerenciamento de variáveis de ambiente

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- MongoDB (versão 4.4 ou superior)
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd monitoring-platform/backend
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```

4. **Configure o arquivo .env**
   ```env
   # Configurações do Servidor
   PORT=5000
   NODE_ENV=development
   
   # Configurações do MongoDB
   MONGODB_URI=mongodb://localhost:27017/monitoring-platform
   
   # Configurações de Email (opcional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Configurações de Webhook (opcional)
   WEBHOOK_URL=https://your-webhook-url.com
   ```

5. **Inicie o servidor**
   ```bash
   # Desenvolvimento
   npm run dev
   
   # Produção
   npm start
   ```

## 📁 Estrutura do Projeto

```
src/
├── controllers/          # Controladores das rotas
│   ├── monitoringController.ts
│   └── settingsController.ts
├── models/              # Modelos do banco de dados
│   ├── ApiKey.ts
│   ├── MonitoringSite.ts
│   └── SystemSettings.ts
├── routes/              # Definição das rotas
│   ├── monitoring.ts
│   └── settings.ts
├── services/            # Serviços e lógica de negócio
│   ├── emailService.ts
│   ├── monitoringService.ts
│   └── webhookService.ts
├── utils/               # Utilitários e helpers
│   └── validators.ts
├── config/              # Configurações
│   └── database.ts
└── index.ts             # Arquivo principal
```

## 🔌 API Endpoints

### Monitoramento

#### Sites
- `GET /api/monitoring/sites` - Lista todos os sites
- `POST /api/monitoring/sites` - Adiciona novo site
- `PUT /api/monitoring/sites/:id` - Atualiza site
- `DELETE /api/monitoring/sites/:id` - Remove site
- `POST /api/monitoring/sites/:id/check` - Verifica site manualmente

#### Relatórios
- `GET /api/monitoring/reports` - Lista relatórios
- `GET /api/monitoring/reports/:siteId` - Relatório específico do site
- `GET /api/monitoring/dashboard` - Dados do dashboard

### Configurações

#### Sistema
- `GET /api/settings` - Obtém configurações do sistema
- `PUT /api/settings` - Atualiza configurações do sistema
- `POST /api/settings/test-email` - Testa configurações de email
- `POST /api/settings/test-webhook` - Testa configurações de webhook

#### API Keys
- `GET /api/settings/api-keys` - Lista chaves de API
- `POST /api/settings/api-keys` - Cria nova chave de API
- `PUT /api/settings/api-keys/:id` - Atualiza chave de API
- `DELETE /api/settings/api-keys/:id` - Remove chave de API
- `POST /api/settings/api-keys/:id/regenerate` - Regenera chave de API

## 📊 Modelos de Dados

### MonitoringSite
```typescript
{
  name: string,
  url: string,
  checkInterval: number, // em minutos
  timeout: number, // em segundos
  expectedStatusCode: number,
  isActive: boolean,
  lastCheck?: Date,
  status: 'up' | 'down' | 'unknown',
  responseTime?: number,
  createdAt: Date,
  updatedAt: Date
}
```

### SystemSettings
```typescript
{
  emailNotifications: {
    enabled: boolean,
    host: string,
    port: number,
    user: string,
    password: string,
    from: string,
    to: string[]
  },
  webhookNotifications: {
    enabled: boolean,
    url: string,
    method: 'POST' | 'PUT',
    headers?: object
  },
  monitoringSettings: {
    defaultCheckInterval: number,
    defaultTimeout: number,
    retryAttempts: number,
    retryDelay: number
  }
}
```

### ApiKey
```typescript
{
  name: string,
  key: string,
  permissions: string[],
  isActive: boolean,
  lastUsed?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Autenticação

O sistema utiliza API Keys para autenticação. Inclua o header `X-API-Key` em suas requisições:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:5000/api/monitoring/sites
```

## 📧 Notificações

### Email
Configurado através das configurações do sistema. Suporta:
- SMTP personalizado
- Gmail (com senha de aplicativo)
- Outros provedores SMTP

### Webhook
Envia notificações HTTP para URLs configuradas com payload personalizado:

```json
{
  "event": "site_down",
  "site": {
    "name": "Example Site",
    "url": "https://example.com",
    "status": "down"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Site Example Site is down"
}
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar testes com coverage
npm run test:coverage

# Executar testes em modo watch
npm run test:watch
```

## 📝 Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento com hot reload
- `npm run build` - Compila o TypeScript para JavaScript
- `npm run lint` - Executa o linter
- `npm run lint:fix` - Corrige problemas do linter automaticamente
- `npm test` - Executa os testes

## 🐳 Docker

```bash
# Build da imagem
docker build -t monitoring-platform-backend .

# Executar container
docker run -p 5000:5000 -e MONGODB_URI=mongodb://host.docker.internal:27017/monitoring-platform monitoring-platform-backend
```

## 🔧 Configuração de Produção

1. **Variáveis de Ambiente**
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb://your-production-db/monitoring-platform
   ```

2. **Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "monitoring-backend"
   pm2 startup
   pm2 save
   ```

3. **Nginx (Proxy Reverso)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 📈 Monitoramento e Logs

- Logs são salvos em `logs/` (desenvolvimento) ou stdout (produção)
- Métricas de performance disponíveis via endpoint `/api/health`
- Suporte a ferramentas como Winston para logging avançado

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Entre em contato via email: support@monitoring-platform.com

## 🔄 Changelog

### v1.0.0
- ✅ Sistema completo de monitoramento
- ✅ Notificações por email e webhook
- ✅ Gerenciamento de API Keys
- ✅ Dashboard em tempo real
- ✅ Configurações flexíveis

---

**Desenvolvido com ❤️ para monitoramento eficiente de sites e portais**