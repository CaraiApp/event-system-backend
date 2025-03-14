import express from 'express';
import { 
  getAllTemplates, 
  getTemplateById, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate,
  getTemplatesByUser
} from '../Controllers/templateController.js';
import { verifyJWT, verifyAdmin } from '../utils/verifyToken.js';
import ApiResponse from '../utils/ApiResponse.js';

const router = express.Router();

// Ruta raíz para obtener todas las plantillas o crear una nueva
router.route('/')
  .get(getAllTemplates)
  .post(verifyJWT, createTemplate);

// Ruta para obtener plantillas por usuario
router.get('/user/:userId', verifyJWT, getTemplatesByUser);

// Ruta para obtener las plantillas del usuario autenticado
router.get('/myTemplates', verifyJWT, getTemplatesByUser);

// Ruta para obtener configuración UI (necesaria para el frontend)
router.get('/ui-config', (req, res) => {
  // Configuración fija para ocultar header y footer
  const uiConfig = {
    hideHeader: true,
    hideFooter: true,
    isDashboard: true
  };
  
  return res.status(200).json(new ApiResponse(
    200,
    uiConfig,
    'UI configuration retrieved successfully'
  ));
});

// Rutas para operaciones específicas sobre una plantilla
router.route('/:id')
  .get(getTemplateById)
  .put(verifyJWT, updateTemplate)
  .delete(verifyJWT, deleteTemplate);

export default router;