import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  Visibility,
  ThumbUp,
  Comment,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Dados de exemplo para os gráficos
const lineData = [
  { name: 'Jan', mentions: 400, engagement: 240 },
  { name: 'Fev', mentions: 300, engagement: 139 },
  { name: 'Mar', mentions: 200, engagement: 980 },
  { name: 'Abr', mentions: 278, engagement: 390 },
  { name: 'Mai', mentions: 189, engagement: 480 },
  { name: 'Jun', mentions: 239, engagement: 380 },
];

const barData = [
  { name: 'Instagram', posts: 45, engagement: 2400 },
  { name: 'Facebook', posts: 32, engagement: 1398 },
  { name: 'Twitter', posts: 28, engagement: 9800 },
  { name: 'LinkedIn', posts: 15, engagement: 3908 },
];

const pieData = [
  { name: 'Positivo', value: 60, color: '#4caf50' },
  { name: 'Neutro', value: 25, color: '#ff9800' },
  { name: 'Negativo', value: 15, color: '#f44336' },
];

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change: string;
  changeType: 'positive' | 'negative';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeType }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: changeType === 'positive' ? '#4caf50' : '#f44336',
                mt: 1,
              }}
            >
              {change}
            </Typography>
          </Box>
          <Box sx={{ color: '#FBF7EA', opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total de Menções"
            value="1,234"
            icon={<TrendingUp fontSize="large" />}
            change="+12% este mês"
            changeType="positive"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Visualizações"
            value="45.6K"
            icon={<Visibility fontSize="large" />}
            change="+8% este mês"
            changeType="positive"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Curtidas"
            value="2.8K"
            icon={<ThumbUp fontSize="large" />}
            change="-3% este mês"
            changeType="negative"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Comentários"
            value="892"
            icon={<Comment fontSize="large" />}
            change="+15% este mês"
            changeType="positive"
          />
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Gráfico de Linha - Evolução das Menções */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Evolução das Menções
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#FBF7EA" />
                <YAxis stroke="#FBF7EA" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    color: '#FBF7EA',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mentions"
                  stroke="#FBF7EA"
                  strokeWidth={2}
                  name="Menções"
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#4caf50"
                  strokeWidth={2}
                  name="Engajamento"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico de Pizza - Análise de Sentimentos */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Análise de Sentimentos
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    color: '#FBF7EA',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {pieData.map((entry) => (
                <Box key={entry.name} display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: entry.color,
                      mr: 1,
                      borderRadius: '50%',
                    }}
                  />
                  <Typography variant="body2">
                    {entry.name}: {entry.value}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Gráfico de Barras - Engajamento por Plataforma */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Engajamento por Plataforma
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#FBF7EA" />
                <YAxis stroke="#FBF7EA" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    color: '#FBF7EA',
                  }}
                />
                <Bar dataKey="posts" fill="#FBF7EA" name="Posts" />
                <Bar dataKey="engagement" fill="#4caf50" name="Engajamento" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;