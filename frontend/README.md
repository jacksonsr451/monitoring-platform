# Monitoring Platform - Frontend

Interface moderna e responsiva para a plataforma de monitoramento de sites e portais, desenvolvida em React com TypeScript.

## 🚀 Características

- **Dashboard Interativo**: Visualização em tempo real do status dos sites
- **Gerenciamento de Sites**: Interface intuitiva para adicionar e configurar sites
- **Painel de Configurações**: Configuração completa do sistema e notificações
- **Relatórios Detalhados**: Gráficos e métricas de performance
- **Design Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Tema Escuro/Claro**: Interface adaptável às preferências do usuário
- **Notificações em Tempo Real**: Alertas instantâneos sobre mudanças de status

## 🛠️ Tecnologias

- **React 18** - Biblioteca JavaScript para interfaces
- **TypeScript** - Tipagem estática para JavaScript
- **Material-UI (MUI)** - Componentes de interface moderna
- **React Router** - Roteamento para SPA
- **Axios** - Cliente HTTP para APIs
- **Chart.js** - Gráficos e visualizações
- **React Query** - Gerenciamento de estado do servidor
- **Formik** - Gerenciamento de formulários
- **Yup** - Validação de esquemas
- **Socket.io Client** - Comunicação em tempo real
- **Date-fns** - Manipulação de datas

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Backend da plataforma rodando

## 🔧 Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd monitoring-platform/frontend
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
   # URL da API do Backend
   REACT_APP_API_URL=http://localhost:5000/api
   
   # URL do Socket.io
   REACT_APP_SOCKET_URL=http://localhost:5000
   
   # Configurações da aplicação
   REACT_APP_NAME=Monitoring Platform
   REACT_APP_VERSION=1.0.0
   
   # Configurações de desenvolvimento
   GENERATE_SOURCEMAP=true
   ```

5. **Inicie a aplicação**
   ```bash
   # Desenvolvimento
   npm start
   
   # Build para produção
   npm run build
   ```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── common/         # Componentes comuns
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Loading.tsx
│   │   └── ErrorBoundary.tsx
│   ├── forms/          # Componentes de formulário
│   │   ├── SiteForm.tsx
│   │   ├── SettingsForm.tsx
│   │   └── ApiKeyForm.tsx
│   └── charts/         # Componentes de gráficos
│       ├── StatusChart.tsx
│       ├── ResponseTimeChart.tsx
│       └── UptimeChart.tsx
├── pages/              # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── WebMonitoring.tsx
│   ├── Settings.tsx
│   └── Reports.tsx
├── hooks/              # Custom hooks
│   ├── useApi.ts
│   ├── useSocket.ts
│   ├── useLocalStorage.ts
│   └── useTheme.ts
├── services/           # Serviços e APIs
│   ├── api.ts
│   ├── monitoringService.ts
│   ├── settingsService.ts
│   └── socketService.ts
├── types/              # Definições de tipos TypeScript
│   ├── monitoring.ts
│   ├── settings.ts
│   └── api.ts
├── utils/              # Utilitários e helpers
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
├── contexts/           # Contextos React
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
├── styles/             # Estilos globais
│   ├── theme.ts
│   ├── globals.css
│   └── components.css
└── App.tsx             # Componente principal
```

## 🎨 Componentes Principais

### Dashboard
- **StatusOverview**: Visão geral do status de todos os sites
- **RecentAlerts**: Alertas recentes e notificações
- **PerformanceMetrics**: Métricas de performance em tempo real
- **QuickActions**: Ações rápidas para gerenciamento

### Web Monitoring
- **SitesList**: Lista de sites monitorados
- **SiteCard**: Card individual de cada site
- **AddSiteModal**: Modal para adicionar novos sites
- **SiteDetails**: Detalhes e configurações de um site

### Settings
- **GeneralSettings**: Configurações gerais do sistema
- **NotificationSettings**: Configurações de email e webhook
- **ApiKeyManagement**: Gerenciamento de chaves de API
- **UserPreferences**: Preferências do usuário

### Reports
- **UptimeReport**: Relatório de uptime
- **PerformanceReport**: Relatório de performance
- **HistoricalData**: Dados históricos com filtros
- **ExportOptions**: Opções de exportação de dados

## 🔌 Integração com API

### Configuração do Axios
```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': localStorage.getItem('apiKey')
  }
});

export default api;
```

### Serviços
```typescript
// src/services/monitoringService.ts
export const monitoringService = {
  getSites: () => api.get('/monitoring/sites'),
  addSite: (site: CreateSiteRequest) => api.post('/monitoring/sites', site),
  updateSite: (id: string, site: UpdateSiteRequest) => 
    api.put(`/monitoring/sites/${id}`, site),
  deleteSite: (id: string) => api.delete(`/monitoring/sites/${id}`),
  checkSite: (id: string) => api.post(`/monitoring/sites/${id}/check`)
};
```

## 🎯 Hooks Personalizados

### useApi
```typescript
const { data, loading, error, refetch } = useApi('/monitoring/sites');
```

### useSocket
```typescript
const { connected, emit, on, off } = useSocket();

useEffect(() => {
  on('site_status_changed', handleStatusChange);
  return () => off('site_status_changed', handleStatusChange);
}, []);
```

### useLocalStorage
```typescript
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

## 🎨 Temas e Estilos

### Configuração do Tema
```typescript
// src/styles/theme.ts
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});
```

## 📱 Responsividade

A aplicação é totalmente responsiva e se adapta a diferentes tamanhos de tela:

- **Desktop** (≥1200px): Layout completo com sidebar
- **Tablet** (768px - 1199px): Layout adaptado com drawer colapsável
- **Mobile** (≤767px): Layout mobile-first com navegação bottom

## 🔔 Notificações

### Sistema de Notificações
```typescript
// Uso do contexto de notificações
const { showNotification } = useNotification();

showNotification({
  type: 'success',
  title: 'Site Adicionado',
  message: 'O site foi adicionado com sucesso!',
  duration: 5000
});
```

### Tipos de Notificação
- **Success**: Operações bem-sucedidas
- **Error**: Erros e falhas
- **Warning**: Avisos importantes
- **Info**: Informações gerais

## 📊 Gráficos e Visualizações

### Chart.js Integration
```typescript
// Componente de gráfico de uptime
const UptimeChart: React.FC<UptimeChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map(d => format(d.date, 'dd/MM')),
    datasets: [{
      label: 'Uptime %',
      data: data.map(d => d.uptime),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
    }]
  };

  return <Line data={chartData} options={chartOptions} />;
};
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar testes com coverage
npm run test:coverage

# Executar testes em modo watch
npm run test:watch

# Executar testes e2e
npm run test:e2e
```

### Estrutura de Testes
```
src/
├── __tests__/          # Testes unitários
│   ├── components/
│   ├── hooks/
│   └── services/
├── __mocks__/          # Mocks para testes
└── setupTests.ts       # Configuração dos testes
```

## 📝 Scripts Disponíveis

- `npm start` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm test` - Executa os testes
- `npm run eject` - Ejeta a configuração do Create React App
- `npm run lint` - Executa o linter
- `npm run lint:fix` - Corrige problemas do linter automaticamente
- `npm run analyze` - Analisa o bundle de produção

## 🐳 Docker

### Dockerfile
```dockerfile
# Build stage
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://backend:5000/api
    depends_on:
      - backend
```

## 🚀 Deploy

### Build de Produção
```bash
npm run build
```

### Variáveis de Ambiente para Produção
```env
REACT_APP_API_URL=https://api.your-domain.com/api
REACT_APP_SOCKET_URL=https://api.your-domain.com
REACT_APP_NAME=Monitoring Platform
GENERATE_SOURCEMAP=false
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Configurações Avançadas

### Code Splitting
```typescript
// Lazy loading de componentes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WebMonitoring = lazy(() => import('./pages/WebMonitoring'));
const Settings = lazy(() => import('./pages/Settings'));
```

### Service Worker
```typescript
// Registro do service worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
```

## 📈 Performance

### Otimizações Implementadas
- **Code Splitting**: Carregamento sob demanda
- **Lazy Loading**: Componentes carregados quando necessário
- **Memoization**: React.memo e useMemo para evitar re-renders
- **Virtual Scrolling**: Para listas grandes
- **Image Optimization**: Lazy loading de imagens
- **Bundle Analysis**: Análise do tamanho do bundle

### Métricas de Performance
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🔒 Segurança

### Medidas de Segurança
- **Content Security Policy**: Headers de segurança
- **XSS Protection**: Sanitização de inputs
- **HTTPS Only**: Comunicação segura
- **API Key Management**: Armazenamento seguro de chaves
- **Input Validation**: Validação client-side e server-side

## 🌐 Internacionalização

```typescript
// Configuração do i18n
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('./locales/en.json') },
      pt: { translation: require('./locales/pt.json') }
    },
    lng: 'pt',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código
- Use TypeScript para tipagem estática
- Siga as convenções do ESLint e Prettier
- Escreva testes para novos componentes
- Use nomes descritivos para componentes e funções
- Mantenha componentes pequenos e focados

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Entre em contato via email: support@monitoring-platform.com
- Documentação: https://docs.monitoring-platform.com

## 🔄 Changelog

### v1.0.0
- ✅ Dashboard interativo completo
- ✅ Gerenciamento de sites com interface intuitiva
- ✅ Painel de configurações avançado
- ✅ Relatórios detalhados com gráficos
- ✅ Design responsivo e moderno
- ✅ Tema escuro/claro
- ✅ Notificações em tempo real
- ✅ Integração completa com backend

---

**Desenvolvido com ❤️ e React para uma experiência de monitoramento excepcional**
