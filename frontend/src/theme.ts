import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FBF7EA', // Bege
      contrastText: '#000000',
    },
    secondary: {
      main: '#000000', // Preto
      contrastText: '#FBF7EA',
    },
    background: {
      default: '#000000', // Fundo preto
      paper: '#1a1a1a', // Papel um pouco mais claro que o preto puro
    },
    text: {
      primary: '#FBF7EA', // Texto bege
      secondary: '#d4d0c4', // Texto bege mais escuro
    },
    divider: '#333333',
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      color: '#FBF7EA',
      fontWeight: 600,
    },
    h2: {
      color: '#FBF7EA',
      fontWeight: 600,
    },
    h3: {
      color: '#FBF7EA',
      fontWeight: 500,
    },
    h4: {
      color: '#FBF7EA',
      fontWeight: 500,
    },
    h5: {
      color: '#FBF7EA',
      fontWeight: 500,
    },
    h6: {
      color: '#FBF7EA',
      fontWeight: 500,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000',
          color: '#FBF7EA',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1a1a1a',
          color: '#FBF7EA',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          color: '#FBF7EA',
          border: '1px solid #333333',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
        contained: {
          backgroundColor: '#FBF7EA',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#e8e4d7',
          },
        },
        outlined: {
          borderColor: '#FBF7EA',
          color: '#FBF7EA',
          '&:hover': {
            borderColor: '#e8e4d7',
            backgroundColor: 'rgba(251, 247, 234, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#333333',
            },
            '&:hover fieldset': {
              borderColor: '#FBF7EA',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#FBF7EA',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#d4d0c4',
          },
          '& .MuiInputBase-input': {
            color: '#FBF7EA',
          },
        },
      },
    },
  },
});

export default theme;