import cron from 'node-cron';
import { executeCleanupWithStats } from '../Controllers/tempBookingController.js';

/**
 * Configuración de tareas programadas del sistema
 */

// Almacenamiento para las tareas programadas activas
const scheduledTasks = new Map();

/**
 * Inicializa todas las tareas programadas del sistema
 */
export const initScheduledTasks = () => {
  console.log('[Scheduler] Inicializando tareas programadas...');
  
  // Tarea de limpieza de reservas temporales expiradas
  // Se ejecuta cada 2 minutos
  scheduleTask(
    'tempBookingCleanup',
    '*/2 * * * *', // Cron expression: cada 2 minutos
    async () => {
      console.log(`[${new Date().toISOString()}] Ejecutando limpieza programada de reservas temporales...`);
      try {
        await executeCleanupWithStats();
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error en tarea programada de limpieza:`, error);
      }
    }
  );
  
  // Registrar estado de las tareas
  const taskList = Array.from(scheduledTasks.entries()).map(([name, task]) => ({
    name,
    expression: task.cronExpression,
    active: task.active
  }));
  
  console.log('[Scheduler] Tareas inicializadas:', JSON.stringify(taskList, null, 2));
};

/**
 * Programa una nueva tarea
 * @param {string} taskName - Nombre identificativo de la tarea
 * @param {string} cronExpression - Expresión cron que define la frecuencia
 * @param {Function} taskFunction - Función a ejecutar
 * @returns {boolean} Éxito al programar la tarea
 */
export const scheduleTask = (taskName, cronExpression, taskFunction) => {
  try {
    // Validar que la expresión cron es correcta
    if (!cron.validate(cronExpression)) {
      console.error(`[Scheduler] Expresión cron inválida para tarea ${taskName}: ${cronExpression}`);
      return false;
    }
    
    // Detener la tarea si ya existía
    if (scheduledTasks.has(taskName)) {
      const existingTask = scheduledTasks.get(taskName);
      if (existingTask.job) {
        existingTask.job.stop();
        console.log(`[Scheduler] Detenida tarea existente: ${taskName}`);
      }
    }
    
    // Programar la nueva tarea
    const job = cron.schedule(cronExpression, taskFunction, {
      scheduled: true,
      timezone: 'Europe/Madrid' // Ajustar a la zona horaria de Melilla
    });
    
    // Almacenar referencia a la tarea programada
    scheduledTasks.set(taskName, {
      job,
      cronExpression,
      active: true,
      createdAt: new Date()
    });
    
    console.log(`[Scheduler] Tarea programada: ${taskName} con expresión "${cronExpression}"`);
    return true;
  } catch (error) {
    console.error(`[Scheduler] Error al programar tarea ${taskName}:`, error);
    return false;
  }
};

/**
 * Detiene una tarea programada
 * @param {string} taskName - Nombre de la tarea a detener
 * @returns {boolean} Éxito al detener la tarea
 */
export const stopTask = (taskName) => {
  if (!scheduledTasks.has(taskName)) {
    console.warn(`[Scheduler] No se encontró la tarea: ${taskName}`);
    return false;
  }
  
  try {
    const task = scheduledTasks.get(taskName);
    if (task.job) {
      task.job.stop();
      task.active = false;
      console.log(`[Scheduler] Tarea detenida: ${taskName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Scheduler] Error al detener tarea ${taskName}:`, error);
    return false;
  }
};

/**
 * Obtiene el estado de todas las tareas programadas
 * @returns {Object[]} Lista de tareas con su estado
 */
export const getTasksStatus = () => {
  return Array.from(scheduledTasks.entries()).map(([name, task]) => ({
    name,
    expression: task.cronExpression,
    active: task.active,
    createdAt: task.createdAt
  }));
};

/**
 * Inicia una tarea específica manualmente
 * @param {string} taskName - Nombre de la tarea a ejecutar
 * @returns {boolean} Éxito al iniciar la tarea
 */
export const runTaskNow = async (taskName) => {
  if (!scheduledTasks.has(taskName)) {
    console.warn(`[Scheduler] No se encontró la tarea para ejecución manual: ${taskName}`);
    return false;
  }
  
  try {
    const task = scheduledTasks.get(taskName);
    console.log(`[Scheduler] Ejecutando manualmente tarea: ${taskName}`);
    
    // Ejecutar la función de la tarea
    if (task.job && typeof task.job.func === 'function') {
      await task.job.func();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`[Scheduler] Error al ejecutar manualmente tarea ${taskName}:`, error);
    return false;
  }
};

// Exportar todas las funciones y el estado
export default {
  initScheduledTasks,
  scheduleTask,
  stopTask,
  getTasksStatus,
  runTaskNow
};