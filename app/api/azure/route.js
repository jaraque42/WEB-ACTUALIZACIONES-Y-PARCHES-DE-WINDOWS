import { NextResponse } from 'next/server'
import Parser from 'xml2js'
import { categorizeUpdate, validateQueryParams } from '@/lib/utils'

const AZURE_RSS_URL = 'https://www.microsoft.com/releasecommunications/api/v2/azure/rss'

async function fetchAzureUpdates() {
  const response = await fetch(AZURE_RSS_URL, {
    next: { revalidate: 3600 } // Cache por 1 hora
  })
  
  if (!response.ok) {
    throw new Error(`Azure RSS error: ${response.status} ${response.statusText}`)
  }
  
  const xml = await response.text()
  
  const parser = new Parser.Parser()
  const result = await parser.parseStringPromise(xml)
  
  const items = result.rss.channel[0].item
  
  return items.map(item => ({
    id: item.guid[0]._ || item.guid[0],
    title: item.title[0],
    link: item.link[0],
    description: item.description[0],
    category: item.category,
    pubDate: item.pubDate[0],
  }))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Validar parámetros
    const validation = validateQueryParams(searchParams, {
      limit: { type: 'number', default: 20, min: 1, max: 100 },
      page: { type: 'number', default: 1, min: 1, max: 50 },
    })
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validation.errors },
        { status: 400 }
      )
    }
    
    const { limit, page } = validation.values
    
    const updates = await fetchAzureUpdates()
    
    // Paginación
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUpdates = updates.slice(startIndex, endIndex)
    
    const formatted = paginatedUpdates.map(update => ({
      id: update.id,
      title: update.title,
      description: update.description?.substring(0, 300) || '',
      url: update.link,
      category: categorizeUpdate(update.title, '', update.description),
      status: Array.isArray(update.category) ? update.category[0] : 'Launched',
      releaseDate: update.pubDate,
    }))
    
    return NextResponse.json({ 
      updates: formatted,
      pagination: {
        page,
        limit,
        total: updates.length,
        totalPages: Math.ceil(updates.length / limit),
      }
    })
  } catch (error) {
    console.error('Azure API Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener actualizaciones de Azure', details: error.message },
      { status: 500 }
    )
  }
}