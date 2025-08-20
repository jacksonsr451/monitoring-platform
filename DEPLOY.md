# Deploy Guide - Monitoring Platform

## Docker Deploy

Este projeto possui um `Dockerfile` na raiz que constrói e executa o backend da aplicação.

### Estrutura de Deploy

- **Dockerfile principal**: Constrói apenas o backend Node.js/TypeScript
- **docker-compose.yml**: Orquestra todos os serviços (backend, frontend, MongoDB, etc.)
- **Dockerfiles específicos**: Localizados em `backend/` e `frontend/` para desenvolvimento

### Deploy Simples (Backend apenas)

```bash
# Build da imagem
docker build -t monitoring-platform .

# Executar container
docker run -p 5000:5000 \
  -e MONGODB_URI="mongodb://localhost:27017/monitoring-platform" \
  -e JWT_SECRET="your-secret-key" \
  monitoring-platform
```

### Deploy Completo com Docker Compose

```bash
# Ambiente de produção
docker-compose up -d

# Ambiente de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d
```

### Variáveis de Ambiente Necessárias

Copie o arquivo `env.sample` para `.env` e configure:

```bash
cp env.sample .env
```

**Variáveis obrigatórias:**
- `MONGODB_URI`: String de conexão do MongoDB
- `JWT_SECRET`: Chave secreta para JWT
- `PORT`: Porta do backend (padrão: 5000)

### Deploy em Plataformas Cloud

#### Coolify / Docker-based platforms

1. Certifique-se que o `Dockerfile` está na raiz
2. Configure as variáveis de ambiente
3. A aplicação será exposta na porta 5000

#### Heroku

```bash
# Adicionar buildpack Node.js
heroku buildpacks:set heroku/nodejs

# Deploy
git push heroku main
```

#### Railway / Render

1. Conecte o repositório
2. Configure as variáveis de ambiente
3. A plataforma detectará automaticamente o `Dockerfile`

### Health Check

A aplicação possui um endpoint de health check:

```
GET /health
```

Retorna status 200 se a aplicação estiver funcionando corretamente.

### Logs

Para visualizar logs do container:

```bash
# Docker
docker logs <container-id>

# Docker Compose
docker-compose logs backend
```

### Troubleshooting

1. **Erro "no such file or directory"**: Certifique-se que o `Dockerfile` está na raiz
2. **Erro de conexão MongoDB**: Verifique a variável `MONGODB_URI`
3. **Porta em uso**: Altere a variável `PORT` ou mapeamento de portas

### Arquitetura de Deploy

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     Backend     │    │    MongoDB      │
│   (Nginx/Proxy) │───▶│   (Node.js)     │───▶│   (Database)    │
│                 │    │   Port: 5000    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │    Frontend     │
                       │   (React SPA)   │
                       │   Port: 80/3000 │
                       └─────────────────┘
```

### Comandos Úteis

```bash
# Build e deploy rápido
make build
make up

# Logs em tempo real
make logs

# Parar todos os serviços
make down

# Limpeza completa
make clean
```