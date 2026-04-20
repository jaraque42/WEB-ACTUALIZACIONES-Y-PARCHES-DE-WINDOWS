import { NextResponse } from 'next/server'

const MSRC_API_URL = 'https://api.msrc.microsoft.com/cvrf/v3.0'

async function getUpdates() {
  const response = await fetch(`${MSRC_API_URL}/updates`, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store'
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch updates')
  }
  
  const data = await response.json()
  return data.value || data
}

async function getUpdateDetails(updateId) {
  const response = await fetch(`${MSRC_API_URL}/updates('${updateId}')`, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store'
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch update details')
  }
  
  return response.json()
}

function categorizeUpdate(title, products, description) {
  const text = `${title} ${products} ${description}`.toLowerCase()
  
  if (text.includes('azure') || text.includes('cloud') || text.includes('office 365') || text.includes('microsoft 365')) {
    return 'azure'
  }
  if (text.includes('security') || text.includes('vulnerability') || text.includes('cve-') || text.includes('exploit')) {
    return 'security'
  }
  if (text.includes('windows') || text.includes('server')) {
    return 'windows'
  }
  return 'other'
}

function extractCVEs(vulnerabilities) {
  if (!vulnerabilities) return []
  return vulnerabilities
    .map(v => v.CVE)
    .filter(Boolean)
}

function detectSeverity(threats) {
  if (!threats || threats.length === 0) return 'Unknown'
  const severityValues = threats.map(t => t.Type?.Value || t.Type)
  if (severityValues.includes('Critical') || severityValues.includes('3')) return 'Critical'
  if (severityValues.includes('Important') || severityValues.includes('2')) return 'Important'
  if (severityValues.includes('Moderate') || severityValues.includes('1')) return 'Moderate'
  return 'Low'
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const cve = searchParams.get('cve')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let updatesList = await getUpdates()
    
    if (month) {
      const targetUpdate = updatesList.find(u => u.ID === month || u.Alias === month)
      if (targetUpdate) {
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
          url: details.CvrfUrl,
        }
        
        return NextResponse.json({ updates: [formatted] })
      }
    }
    
    if (cve) {
      const filtered = updatesList.filter(u => 
        u.Alias?.toLowerCase().includes(cve.toLowerCase())
      )
      return NextResponse.json({ updates: filtered.slice(0, limit) })
    }
    
    const sortedUpdates = [...updatesList].sort((a, b) => {
      const dateA = new Date(a.InitialReleaseDate || a.ID)
      const dateB = new Date(b.InitialReleaseDate || b.ID)
      return dateB - dateA
    })
    
    const recentUpdates = sortedUpdates
      .slice(0, limit)
      .map(update => ({
        id: update.ID,
        alias: update.Alias,
        title: update.DocumentTitle,
        releaseDate: update.InitialReleaseDate,
        currentReleaseDate: update.CurrentReleaseDate,
        severity: 'See details',
        category: categorizeUpdate(update.DocumentTitle, '', ''),
        // Link to official documentation page (MSRC update guide)
        url: update.CvrfUrl 
          ? `https://msrc.microsoft.com/update-guide/${update.Alias}` 
          : '#',
      }))
    
    return NextResponse.json({ updates: recentUpdates })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch updates', details: error.message },
      { status: 500 }
    )
  }
}
