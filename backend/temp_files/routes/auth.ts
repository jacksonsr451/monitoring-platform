import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { authenticateToken, generateToken } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'Usuário já existe com este email',
        error: 'USER_EXISTS'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: 'user' // Default role
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error: any) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'REGISTRATION_ERROR'
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        message: 'Credenciais inválidas',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Conta desativada. Entre em contato com o administrador.',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Credenciais inválidas',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'LOGIN_ERROR'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: 'Usuário não encontrado',
        error: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'PROFILE_ERROR'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        message: 'Usuário não encontrado',
        error: 'USER_NOT_FOUND'
      });
    }

    const { name } = req.body;

    if (name) {
      user.name = name;
    }

    await user.save();

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'UPDATE_PROFILE_ERROR'
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token válido',
    valid: true,
    user: {
      id: req.user?._id,
      email: req.user?.email,
      role: req.user?.role
    }
  });
});

export default router;