import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    const success = await login(email, password);
    
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Email ou senha inválidos');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#FBF7EA',
        p: 2
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          border: '2px solid #000',
          borderRadius: 2
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#000',
              mb: 3
            }}
          >
            Monitoring Platform
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: '#666',
              mb: 4
            }}
          >
            Faça login para continuar
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#000',
                  },
                  '&:hover fieldset': {
                    borderColor: '#000',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#000',
                  },
                },
              }}
            />
            
            <TextField
              fullWidth
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#000',
                  },
                  '&:hover fieldset': {
                    borderColor: '#000',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#000',
                  },
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: '#000',
                color: '#FBF7EA',
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: '#333',
                },
                '&:disabled': {
                  bgcolor: '#666',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: '#666',
              mt: 2
            }}
          >
            Use: admin@test.com / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;