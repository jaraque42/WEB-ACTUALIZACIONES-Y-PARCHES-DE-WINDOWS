import { NextResponse } from 'next/server'
import { categorizeUpdate, extractCVEs, detectSeverity, getMSRCUrl, validateQueryParams } from '@/lib/utils'

const MSRC_API_URL = 'https://api.msrc.microsoft.com/cvrf/v3.0'

async function getUpdates() {
  const response = await fetch(`${MSRC_API_URL}/updates`, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 } // Cache por 1 hora
  })
  
  if (!response.ok) {
    throw new Error(`MSRC API error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.value || data
}

async function getUpdateDetails(updateId) {
  const response = await fetch(`${MSRC_API_URL}/updates('${updateId}')`, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 }
  })
  
  if (!response.ok) {
    throw new Error(`MSRC API error: ${response.status}`)
  }
  
  return response.json()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validar parámetros
    const validation = validateQueryParams(searchParams, {
      month: { type: 'string', maxLength: 50 },
      cve: { type: 'string', maxLength: 30, pattern: /^CVE-\d{4}-\d+$/i },
      limit: { type: 'number', default: 50, min: 1, max: 200 },
      page: { type: 'number', default: 1, min: 1, max: 100 },
    })
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.errors },
        { status: 400 }
      )
    }
    
    const { month, cve, limit, page } = validation.values
    
    const updatesList = await getUpdates()
    
    // Obtener detalles de una actualización específica
    if (month) {
      const targetUpdate = updatesList.find(u => u.ID === month || u.Alias === month)
      
      if (!targetUpdate) {
        return NextResponse.json(
          { error: 'Actualización no encontrada', details: `No se encontró la actualización '${month}'` },
          { status: 404 }
        )
      }
      
      const details = await getUpdateDetails(targetUpdate.Alias || targetUpdate.ID)
      
      const formatted = {
        id: details.ID,
        alias: details.Alias,
        title: details.DocumentTitle,
        releaseDate: details.ReleaseDate,
        severity: detectSeverity(details.Vulnerability?.[0]?.Threats),
        cves: extractCVEs(details.Vulnerability),
        products: details.ProductTree?.Product?.map(p => p.Value) || [],
        category: categorizeUpdate(
          details.DocumentTitle,
          details.ProductTree,
          details.Vulnerability?.[0]?.Notes?.[0]?.Value
        ),
        description: details.Vulnerability?.[0]?.Notes?.[0]?.Value || '',
        url: getMSRCUrl(details.Alias),
      }
      
      return NextResponse.json({ updates: [formatted] })
    }
    
    // Filtrar por CVE
    if (cve) {
      const filtered = updatesList.filter(u => 
        u.Alias?.toLowerCase().includes(cve.toLowerCase())
      )
      return NextResponse.json({ 
        updates: filtered.slice(0, limit),
        total: filtered.length,
      })
    }
    
    // Listado general con paginación
    const sortedUpdates = [...updatesList].sort((a, b) => {
      const dateA = new Date(a.InitialReleaseDate || a.ID)
      const dateB = new Date(b.InitialReleaseDate || b.ID)
      return dateB - dateA
    })
    
    // Calcular paginación
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUpdates = sortedUpdates.slice(startIndex, endIndex)
    
    const recentUpdates = paginatedUpdates.map(update => ({
      id: update.ID,
      alias: update.Alias,
      title: update.DocumentTitle,
      releaseDate: update.InitialReleaseDate,
      currentReleaseDate: update.CurrentReleaseDate,
      severity: detectSeverity(update.Vulnerability?.[0]?.Threats),
      category: categorizeUpdate(update.DocumentTitle, '', ''),
      url: getMSRCUrl(update.Alias),
    }))
    
    return NextResponse.json({ 
      updates: recentUpdates,
      pagination: {
        page,
        limit,
        total: sortedUpdates.length,
        totalPages: Math.ceil(sortedUpdates.length / limit),
      }
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener actualizaciones', details: error.message },
      { status: 500 }
    )
  }
}
