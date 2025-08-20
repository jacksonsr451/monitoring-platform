# Monitoring Platform

Uma plataforma completa de monitoramento de sites e portais web com notificações em tempo real e análise de desempenho.

## 📋 Visão Geral

A Monitoring Platform é uma solução robusta para monitoramento de websites, oferecendo:

- **Monitoramento em Tempo Real**: Verificação contínua do status de sites e portais
- **Notificações Inteligentes**: Alertas via email e webhook quando problemas são detectados
- **Dashboard Intuitivo**: Interface moderna e responsiva para visualização de dados
- **Análise de Performance**: Métricas detalhadas de tempo de resposta e disponibilidade
- **Gerenciamento de API Keys**: Sistema seguro de autenticação e autorização
- **Configurações Flexíveis**: Personalização completa de notificações e parâmetros

## 🏗️ Arquitetura

O projeto é dividido em duas partes principais:

### Backend (Node.js + TypeScript)
- **Localização**: `./backend/`
- **Tecnologias**: Express.js, MongoDB, Mongoose, TypeScript
- **Funcionalidades**: APIs REST, sistema de monitoramento, notificações

### Frontend (React + TypeScript)
- **Localização**: `./frontend/`
- **Tecnologias**: React, TypeScript, Material-UI, Recharts
- **Funcionalidades**: Dashboard, gerenciamento de sites, configurações

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 16+ 
- MongoDB 4.4+
- npm ou yarn

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd monitoring-platform
   ```

2. **Configure o Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure as variáveis de ambiente no arquivo .env
   npm run dev
   ```

3. **Configure o Frontend**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

4. **Acesse a aplicação**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Estrutura do Projeto

```
monitoring-platform/
├── backend/                 # Servidor Node.js
│   ├── src/
│   │   ├── controllers/     # Controladores da API
│   │   ├── models/         # Modelos do MongoDB
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Serviços de negócio
│   │   ├── middleware/     # Middlewares
│   │   └── utils/          # Utilitários
│   ├── package.json
│   └── README.md
├── frontend/               # Aplicação React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── services/      # Serviços de API
│   │   ├── hooks/         # Hooks customizados
│   │   └── utils/         # Utilitários
│   ├── package.json
│   └── README.md
└── README.md              # Este arquivo
```

## 🔧 Configuração

### Variáveis de Ambiente (Backend)

Crie um arquivo `.env` no diretório `backend/` baseado no `.env.example`:

```env
# Servidor
PORT=5000
NODE_ENV=development

# Banco de dados
MONGODB_URI=mongodb://localhost:27017/monitoring-platform

# JWT
JWT_SECRET=your-secret-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoramento
MONITORING_INTERVAL=60000
REQUEST_TIMEOUT=30000
```

## 📊 Funcionalidades Principais

### Monitoramento de Sites
- Verificação de status HTTP
- Medição de tempo de resposta
- Detecção de mudanças de conteúdo
- Monitoramento de certificados SSL

### Sistema de Notificações
- Alertas por email
- Webhooks personalizados
- Notificações em tempo real
- Histórico de alertas

### Dashboard e Relatórios
- Visualização em tempo real
- Gráficos de performance
- Relatórios de disponibilidade
- Exportação de dados

### Gerenciamento
- Sistema de API Keys
- Configurações globais
- Gerenciamento de usuários
- Logs de auditoria

## 🧪 Testes

### Backend
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend
```bash
cd frontend
npm test
npm run test:coverage
```

## 📦 Deploy

### Docker

Cada projeto (backend e frontend) possui seu próprio Dockerfile. Para deploy completo:

```bash
# Backend
cd backend
docker build -t monitoring-platform-backend .
docker run -p 5000:5000 monitoring-platform-backend

# Frontend
cd frontend
docker build -t monitoring-platform-frontend .
docker run -p 3000:3000 monitoring-platform-frontend
```

### Produção

Para deploy em produção, consulte os READMEs específicos de cada projeto:
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma [issue](https://github.com/your-repo/monitoring-platform/issues)
- Entre em contato: support@monitoring-platform.com

## 🔄 Changelog

### v1.0.0 (2024-01-20)
- ✅ Sistema completo de monitoramento de sites
- ✅ Dashboard responsivo com React
- ✅ APIs REST completas
- ✅ Sistema de notificações
- ✅ Gerenciamento de API Keys
- ✅ Configurações do sistema
- ✅ Documentação completa

---

**Monitoring Platform** - Monitoramento profissional de sites e portais web.