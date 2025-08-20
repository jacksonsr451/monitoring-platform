import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Typography,
  Chip,
  IconButton,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

interface Project {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  createdAt: string;
  status: 'active' | 'paused' | 'completed';
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Campanha Verão 2024',
    description: 'Monitoramento da campanha de verão nas redes sociais',
    keywords: ['verão', 'praia', 'sol', 'férias', 'campanha2024'],
    createdAt: '2024-01-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Lançamento Produto X',
    description: 'Acompanhamento do lançamento do novo produto',
    keywords: ['produtoX', 'lançamento', 'inovação', 'tecnologia'],
    createdAt: '2024-01-10',
    status: 'active',
  },
  {
    id: '3',
    name: 'Black Friday 2023',
    description: 'Análise da performance durante a Black Friday',
    keywords: ['blackfriday', 'desconto', 'promoção', 'ofertas'],
    createdAt: '2023-11-01',
    status: 'completed',
  },
];

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: '',
  });

  const handleOpen = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        keywords: project.keywords.join(', '),
      });
    } else {
      setEditingProject(null);
      setFormData({ name: '', description: '', keywords: '' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProject(null);
    setFormData({ name: '', description: '', keywords: '' });
  };

  const handleSave = () => {
    const keywordsArray = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (editingProject) {
      // Editar projeto existente
      setProjects(projects.map(p => 
        p.id === editingProject.id 
          ? {
              ...p,
              name: formData.name,
              description: formData.description,
              keywords: keywordsArray,
            }
          : p
      ));
    } else {
      // Criar novo projeto
      const newProject: Project = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        keywords: keywordsArray,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
      };
      setProjects([...projects, newProject]);
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'paused': return '#ff9800';
      case 'completed': return '#2196f3';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'paused': return 'Pausado';
      case 'completed': return 'Concluído';
      default: return 'Desconhecido';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Projetos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Novo Projeto
        </Button>
      </Box>

      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={project.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h2">
                    {project.name}
                  </Typography>
                  <Chip
                    label={getStatusText(project.status)}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(project.status),
                      color: 'white',
                    }}
                  />
                </Box>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {project.description}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Palavras-chave:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {project.keywords.map((keyword, index) => (
                    <Chip
                      key={index}
                      label={keyword}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: '#FBF7EA',
                        color: '#FBF7EA',
                      }}
                    />
                  ))}
                </Box>
                
                <Typography variant="caption" color="textSecondary">
                  Criado em: {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                </Typography>
              </CardContent>
              
              <CardActions>
                <IconButton
                  size="small"
                  onClick={() => console.log('Ver detalhes', project.id)}
                  sx={{ color: '#FBF7EA' }}
                >
                  <ViewIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleOpen(project)}
                  sx={{ color: '#FBF7EA' }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(project.id)}
                  sx={{ color: '#f44336' }}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog para criar/editar projeto */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nome do Projeto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Palavras-chave (separadas por vírgula)"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              margin="normal"
              placeholder="palavra1, palavra2, palavra3"
              helperText="Digite as palavras-chave separadas por vírgula"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {editingProject ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB para adicionar projeto (mobile) */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => handleOpen()}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default Projects;