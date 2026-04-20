import { NextResponse } from 'next/server'
import Parser from 'xml2js'

const AZURE_RSS_URL = 'https://www.microsoft.com/releasecommunications/api/v2/azure/rss'

async function fetchAzureUpdates() {
  const response = await fetch(AZURE_RSS_URL, {
    cache: 'no-store'
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch Azure updates')
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

function categorizeAzure(title, categories) {
  const text = `${title} ${categories.join(' ')}`.toLowerCase()
  
  if (text.includes('office') || text.includes('microsoft 365') || text.includes('excel') || text.includes('word') || text.includes('teams')) {
    return 'office'
  }
  if (text.includes('windows') || text.includes('surface') || text.includes('edge') || text.includes('office')) {
    return 'windows'
  }
  return 'azure'
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const updates = await fetchAzureUpdates()
    
    const formatted = updates.slice(0, limit).map(update => ({
      id: update.id,
      title: update.title,
      description: update.description?.substring(0, 300) || '',
      url: update.link, // Use 'url' for consistency with MSRC API
      category: categorizeAzure(update.title, update.category),
      status: Array.isArray(update.category) ? update.category[0] : 'Launched',
      pubDate: update.pubDate,
    }))
    
    return NextResponse.json({ updates: formatted })
  } catch (error) {
    console.error('Azure API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Azure updates', details: error.message },
      { status: 500 }
    )
  }
}