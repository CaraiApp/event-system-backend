import Template from '../models/Template.js';

// Obtener todas las plantillas
export const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find();
    
    return res.status(200).json({
      status: 'success',
      results: templates.length,
      data: templates
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener las plantillas',
      error: error.message
    });
  }
};

// Obtener una plantilla por ID
export const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findOne({ id: req.params.id });
    
    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: `No se encontró una plantilla con ID: ${req.params.id}`
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: template
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener la plantilla',
      error: error.message
    });
  }
};

// Crear una nueva plantilla
export const createTemplate = async (req, res) => {
  try {
    // Aseguramos que se envíe el ID personalizado
    if (!req.body.id) {
      return res.status(400).json({
        status: 'fail',
        message: 'El campo id es requerido para crear una plantilla'
      });
    }
    
    // Verificar si ya existe una plantilla con ese ID
    const existingTemplate = await Template.findOne({ id: req.body.id });
    if (existingTemplate) {
      return res.status(400).json({
        status: 'fail',
        message: `Ya existe una plantilla con ID: ${req.body.id}`
      });
    }
    
    // Si el usuario está autenticado, asignamos su ID
    if (req.user) {
      req.body.createdBy = req.user.id;
    }
    
    // Crear la nueva plantilla
    const newTemplate = await Template.create(req.body);
    
    return res.status(201).json({
      status: 'success',
      data: newTemplate
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al crear la plantilla',
      error: error.message
    });
  }
};

// Actualizar una plantilla existente
export const updateTemplate = async (req, res) => {
  try {
    // No permitir cambiar el ID
    if (req.body.id && req.body.id !== req.params.id) {
      return res.status(400).json({
        status: 'fail',
        message: 'No se puede cambiar el ID de una plantilla existente'
      });
    }
    
    // Actualizar la fecha de modificación
    req.body.dateModified = new Date();
    
    // Buscar y actualizar la plantilla
    const updatedTemplate = await Template.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedTemplate) {
      return res.status(404).json({
        status: 'fail',
        message: `No se encontró una plantilla con ID: ${req.params.id}`
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: updatedTemplate
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al actualizar la plantilla',
      error: error.message
    });
  }
};

// Eliminar una plantilla
export const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({ id: req.params.id });
    
    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: `No se encontró una plantilla con ID: ${req.params.id}`
      });
    }
    
    return res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al eliminar la plantilla',
      error: error.message
    });
  }
};

// Obtener todas las plantillas por usuario
export const getTemplatesByUser = async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user.id : null);
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Se requiere un ID de usuario'
      });
    }
    
    const templates = await Template.find({ createdBy: userId });
    
    return res.status(200).json({
      status: 'success',
      results: templates.length,
      data: templates
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener las plantillas del usuario',
      error: error.message
    });
  }
};