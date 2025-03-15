import { 
  getTasksStatus, 
  runTaskNow, 
  stopTask, 
  scheduleTask 
} from '../utils/scheduledTasks.js';

/**
 * Controlador para gestionar las tareas programadas
 */

/**
 * Obtiene el estado actual de todas las tareas programadas
 */
export const getSchedulerStatus = async (req, res) => {
  try {
    const tasks = getTasksStatus();
    
    return res.status(200).json({
      status: "success",
      success: "true",
      message: "Estado de tareas programadas obtenido correctamente",
      data: {
        tasks,
        count: tasks.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Error al obtener estado del programador:", err);
    return res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al obtener estado del programador",
      error: err.message
    });
  }
};

/**
 * Ejecuta una tarea programada manualmente
 */
export const executeTask = async (req, res) => {
  try {
    const { taskName } = req.params;
    
    if (!taskName) {
      return res.status(400).json({
        status: "failed",
        success: "false",
        message: "Se requiere el nombre de la tarea"
      });
    }
    
    const result = await runTaskNow(taskName);
    
    if (result) {
      return res.status(200).json({
        status: "success",
        success: "true",
        message: `Tarea ${taskName} ejecutada correctamente`,
        data: {
          taskName,
          executed: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return res.status(404).json({
        status: "failed",
        success: "false",
        message: `No se pudo ejecutar la tarea ${taskName}`
      });
    }
  } catch (err) {
    console.error("Error al ejecutar tarea programada:", err);
    return res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al ejecutar tarea programada",
      error: err.message
    });
  }
};

/**
 * Detiene una tarea programada
 */
export const pauseTask = async (req, res) => {
  try {
    const { taskName } = req.params;
    
    if (!taskName) {
      return res.status(400).json({
        status: "failed",
        success: "false",
        message: "Se requiere el nombre de la tarea"
      });
    }
    
    const result = stopTask(taskName);
    
    if (result) {
      return res.status(200).json({
        status: "success",
        success: "true",
        message: `Tarea ${taskName} detenida correctamente`,
        data: {
          taskName,
          active: false,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return res.status(404).json({
        status: "failed",
        success: "false",
        message: `No se pudo detener la tarea ${taskName}`
      });
    }
  } catch (err) {
    console.error("Error al detener tarea programada:", err);
    return res.status(500).json({
      status: "failed",
      success: "false",
      message: "Error al detener tarea programada",
      error: err.message
    });
  }
};