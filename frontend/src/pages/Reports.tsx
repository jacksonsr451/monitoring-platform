import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  BarChart as ChartIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

interface Report {
  _id: string;
  title: string;
  description: string;
  type: 'instagram' | 'web' | 'combined';
  category: 'performance' | 'engagement' | 'growth' | 'content';
  dateRange: {
    start: Date;
    end: Date;
  };
  status: 'draft' | 'generating' | 'completed' | 'error';
  format: 'pdf' | 'excel' | 'both';
  createdAt: Date;
  updatedAt: Date;
}

interface ReportData {
  metrics: any;
  charts: any[];
  tables: any[];
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'instagram' as 'instagram' | 'web' | 'combined',
    category: 'performance' as 'performance' | 'engagement' | 'growth' | 'content',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    },
    format: 'pdf' as 'pdf' | 'excel' | 'both'
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        setError('Erro ao carregar relatórios');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await loadReports();
        setOpenDialog(false);
        resetForm();
      } else {
        setError('Erro ao criar relatório');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este relatório?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await loadReports();
      } else {
        setError('Erro ao excluir relatório');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const handleDownloadReport = async (reportId: string, format: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${reportId}/export/${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Erro ao baixar relatório');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const handleViewReport = async (report: Report) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${report._id}/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        setSelectedReport(report);
        setViewDialogOpen(true);
      } else {
        setError('Erro ao carregar dados do relatório');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'instagram',
      category: 'performance',
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      format: 'pdf'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'generating': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'instagram': return 'Instagram';
      case 'web': return 'Web';
      case 'combined': return 'Combinado';
      default: return type;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'performance': return 'Performance';
      case 'engagement': return 'Engajamento';
      case 'growth': return 'Crescimento';
      case 'content': return 'Conteúdo';
      default: return category;
    }
  };

  const renderChart = (chartConfig: any) => {
    const { type, data, options } = chartConfig;
    
    switch (type) {
      case 'line':
        return <Line data={data} options={options} />;
      case 'bar':
        return <Bar data={data} options={options} />;
      case 'pie':
        return <Pie data={data} options={options} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" sx={{ color: '#000', fontWeight: 'bold' }}>
            Relatórios
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ 
              bgcolor: '#000', 
              color: '#FBF7EA',
              '&:hover': { bgcolor: '#333' }
            }}
          >
            Novo Relatório
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ bgcolor: '#FBF7EA' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#000' }}>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Título</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Categoria</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Criado em</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {report.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={getTypeLabel(report.type)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={getCategoryLabel(report.category)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={report.status} 
                      size="small" 
                      color={getStatusColor(report.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Visualizar">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewReport(report)}
                          disabled={report.status !== 'completed'}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDownloadReport(report._id, 'pdf')}
                          disabled={report.status !== 'completed'}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteReport(report._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog para criar/editar relatório */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Novo Relatório</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Título"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={formData.type}
                    label="Tipo"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="web">Web</MenuItem>
                    <MenuItem value="combined">Combinado</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={formData.category}
                    label="Categoria"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  >
                    <MenuItem value="performance">Performance</MenuItem>
                    <MenuItem value="engagement">Engajamento</MenuItem>
                    <MenuItem value="growth">Crescimento</MenuItem>
                    <MenuItem value="content">Conteúdo</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="Data Inicial"
                  value={formData.dateRange.start}
                  onChange={(date) => setFormData({ 
                    ...formData, 
                    dateRange: { ...formData.dateRange, start: date || new Date() }
                  })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="Data Final"
                  value={formData.dateRange.end}
                  onChange={(date) => setFormData({ 
                    ...formData, 
                    dateRange: { ...formData.dateRange, end: date || new Date() }
                  })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
              <FormControl fullWidth>
                <InputLabel>Formato</InputLabel>
                <Select
                  value={formData.format}
                  label="Formato"
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="both">Ambos</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateReport} 
              variant="contained"
              sx={{ 
                bgcolor: '#000', 
                color: '#FBF7EA',
                '&:hover': { bgcolor: '#333' }
              }}
            >
              Criar Relatório
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para visualizar relatório */}
        <Dialog 
          open={viewDialogOpen} 
          onClose={() => setViewDialogOpen(false)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            {selectedReport?.title}
            <Typography variant="body2" color="text.secondary">
              {selectedReport?.description}
            </Typography>
          </DialogTitle>
          <DialogContent>
            {reportData && (
              <Box>
                {/* Métricas */}
                {reportData.metrics && (
                  <Box mb={4}>
                    <Typography variant="h6" gutterBottom>Métricas</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {Object.entries(reportData.metrics).map(([key, value]) => (
                        <Box key={key} sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                          <Card sx={{ bgcolor: '#FBF7EA' }}>
                            <CardContent>
                              <Typography variant="h4" sx={{ color: '#000', fontWeight: 'bold' }}>
                                {String(value)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Gráficos */}
                {reportData.charts && reportData.charts.length > 0 && (
                  <Box mb={4}>
                    <Typography variant="h6" gutterBottom>Gráficos</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {reportData.charts.map((chart, index) => (
                        <Box key={index} sx={{ flex: '1 1 400px', minWidth: '400px' }}>
                          <Card sx={{ bgcolor: '#FBF7EA' }}>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {chart.title}
                              </Typography>
                              <Box height={300}>
                                {renderChart(chart)}
                              </Box>
                            </CardContent>
                          </Card>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Tabelas */}
                {reportData.tables && reportData.tables.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Tabelas</Typography>
                    {reportData.tables.map((table, index) => (
                      <Card key={index} sx={{ mb: 2, bgcolor: '#FBF7EA' }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {table.title}
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  {table.headers.map((header: string, idx: number) => (
                                    <TableCell key={idx} sx={{ fontWeight: 'bold' }}>
                                      {header}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {table.rows.map((row: any[], rowIdx: number) => (
                                  <TableRow key={rowIdx}>
                                    {row.map((cell, cellIdx) => (
                                      <TableCell key={cellIdx}>{cell}</TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Fechar</Button>
            {selectedReport && (
              <Button 
                onClick={() => handleDownloadReport(selectedReport._id, 'pdf')}
                variant="contained"
                startIcon={<DownloadIcon />}
                sx={{ 
                  bgcolor: '#000', 
                  color: '#FBF7EA',
                  '&:hover': { bgcolor: '#333' }
                }}
              >
                Download PDF
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Reports;