/**
 * Utilidades compartidas para el proyecto
 */

// Categorías de actualizaciones
export const CATEGORIES = {
  AZURE: 'azure',
  SECURITY: 'security',
  WINDOWS: 'windows',
  OFFICE: 'office',
  OTHER: 'other',
}

/**
 * Categoriza una actualización basándose en su título y descripción
 * @param {string} title - Título de la actualización
 * @param {string} products - Productos afectados (opcional)
 * @param {string} description - Descripción (opcional)
 * @returns {string} Categoría: 'azure' | 'security' | 'windows' | 'office' | 'other'
 */
export function categorizeUpdate(title = '', products = '', description = '') {
  const text = `${title} ${products} ${description}`.toLowerCase()
  
  if (text.includes('azure') || text.includes('cloud') || text.includes('office 365') || text.includes('microsoft 365')) {
    return CATEGORIES.AZURE
  }
  if (text.includes('office') || text.includes('excel') || text.includes('word') || text.includes('teams') || text.includes('sharepoint')) {
    return CATEGORIES.OFFICE
  }
  if (text.includes('security') || text.includes('vulnerability') || text.includes('cve-') || text.includes('exploit')) {
    return CATEGORIES.SECURITY
  }
  if (text.includes('windows') || text.includes('server') || text.includes('surface') || text.includes('edge')) {
    return CATEGORIES.WINDOWS
  }
  return CATEGORIES.OTHER
}

/**
 * Extrae CVEs de la lista de vulnerabilidades
 * @param {Array} vulnerabilities - Array de vulnerabilidades
 * @returns {Array<string>} Lista de CVEs
 */
export function extractCVEs(vulnerabilities) {
  if (!vulnerabilities || !Array.isArray(vulnerabilities)) return []
  return vulnerabilities
    .map(v => v.CVE)
    .filter(Boolean)
}

/**
 * Detecta la severidad basada en las amenazas
 * @param {Array} threats - Array de amenazas
 * @returns {string} Severidad: 'Critical' | 'Important' | 'Moderate' | 'Low' | 'Unknown'
 */
export function detectSeverity(threats) {
  if (!threats || threats.length === 0) return 'Unknown'
  
  const severityValues = threats.map(t => t.Type?.Value || t.Type)
  
  if (severityValues.includes('Critical') || severityValues.includes('3')) return 'Critical'
  if (severityValues.includes('Important') || severityValues.includes('2')) return 'Important'
  if (severityValues.includes('Moderate') || severityValues.includes('1')) return 'Moderate'
  return 'Low'
}

/**
 * Genera la URL correcta para la guía de actualizaciones de MSRC
 * @param {string} alias - Alias de la actualización (ej: CVE-2024-21318)
 * @returns {string} URL correcta
 */
export function getMSRCUrl(alias) {
  if (!alias) return '#'
  return `https://msrc.microsoft.com/update-guide/vulnerability/${alias}`
}

/**
 * Valida y sanitiza parámetros de query
 * @param {Object} params - Parámetros a validar
 * @param {Object} rules - Reglas de validación
 * @returns {Object} { valid: boolean, errors: string[], values: Object }
 */
export function validateQueryParams(params, rules) {
  const errors = []
  const values = {}
  
  for (const [key, rule] of Object.entries(rules)) {
    const value = params.get(key)
    
    // Validar requerido
    if (rule.required && !value) {
      errors.push(`El parámetro '${key}' es requerido`)
      continue
    }
    
    if (!value) {
      values[key] = rule.default
      continue
    }
    
    // Validar tipo
    if (rule.type === 'number') {
      const num = parseInt(value, 10)
      if (isNaN(num)) {
        errors.push(`'${key}' debe ser un número válido`)
        continue
      }
      // Validar rango
      if (rule.min !== undefined && num < rule.min) {
        errors.push(`'${key}' debe ser al menos ${rule.min}`)
        continue
      }
      if (rule.max !== undefined && num > rule.max) {
        errors.push(`'${key}' debe ser como máximo ${rule.max}`)
        continue
      }
      values[key] = num
      continue
    }
    
    if (rule.type === 'string') {
      // Validar longitud
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`'${key}' debe tener al menos ${rule.minLength} caracteres`)
        continue
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`'${key}' debe tener como máximo ${rule.maxLength} caracteres`)
        continue
      }
      // Validar patrón
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`'${key}' tiene un formato inválido`)
        continue
      }
      values[key] = value.trim()
      continue
    }
    
    values[key] = value
  }
  
  return {
    valid: errors.length === 0,
    errors,
    values,
  }
}

/**
 * Formatea una fecha para display
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada en español
 */
export function formatDate(date) {
  if (!date) return 'Fecha no disponible'
  try {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'Fecha no disponible'
  }
}