'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const foros = [
    { name: 'Microsoft Answers', url: 'https://answers.microsoft.com/' },
    { name: 'TechNet Forums', url: 'https://social.technet.microsoft.com/Forums/' },
    { name: 'Reddit r/Windows', url: 'https://www.reddit.com/r/Windows/' },
    { name: 'Reddit r/windows11', url: 'https://www.reddit.com/r/windows11/' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com/questions/tagged/windows' },
    { name: 'WinBuzzer', url: 'https://winbuzzer.com/' },
    { name: 'Windows Central', url: 'https://www.windowscentral.com/' },
    { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/' },
  ]

  useEffect(() => { fetchUpdates() }, [])

  async function fetchUpdates() {
    setLoading(true)
    setError(null)
    try {
      const [msrc, azure] = await Promise.all([
        fetch(`/api/updates?limit=100&_=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/azure?limit=100&_=${Date.now()}`, { cache: 'no-store' })
      ])
      const dataMs = await msrc.json()
      const dataAz = await azure.json()

      const normalize = (u) => ({
        id: u.id || u.ID || '',
        alias: u.alias || u.Alias,
        title: u.title || u.DocumentTitle || '',
        releaseDate: u.releaseDate || u.InitialReleaseDate,
        description: u.description || u.updateDescription || '',
        category: u.category || u.source || 'other',
        url: u.url || u.CvrfUrl || u.link || '#',
        status: u.status || 'General',
      })

      const all = [
        ...(dataMs?.updates || []).map(normalize),
        ...(dataAz?.updates || []).map(normalize)
      ].filter(x => x && x.title)

      setUpdates(all)
    } catch (e) {
      setError('Error al cargar las actualizaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchUpdates()
    setRefreshing(false)
  }

  const categories = [
    { key: 'all', label: 'Todas', icon: '📋' },
    { key: 'security', label: 'Seguridad', icon: '🔒' },
    { key: 'windows', label: 'Windows', icon: '🪟' },
    { key: 'azure', label: 'Azure', icon: '☁️' },
    { key: 'office', label: 'Office', icon: '📄' },
    { key: 'other', label: 'Servidores', icon: '🖥️' },
  ]

  const displayLabel = (cat) => categories.find(c => c.key === cat)?.label || cat
  
  const getStatusClass = (status) => {
    if (status?.toLowerCase().includes('preview') || status?.toLowerCase().includes('beta')) return 'status-preview'
    if (status?.toLowerCase().includes('retirement') || status?.toLowerCase().includes('retir')) return 'status-retirement'
    return 'status-launched'
  }

  const filtered = updates.filter(u => {
    const t = searchTerm.toLowerCase()
    return !searchTerm || 
      u.title?.toLowerCase().includes(t) || 
      u.description?.toLowerCase().includes(t) ||
      u.alias?.toLowerCase().includes(t)
  }).filter(u => activeFilter === 'all' || u.category === activeFilter)

  return (
    <main>
      <header>
        <div className="container">
          <div className="header-content">
            <div>
              <h1>Microsoft Updates Tracker</h1>
              <p className="subtitle">Centro de actualizaciones de sistemas Microsoft</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small style={{ opacity: 0.9 }}>Última actualización: {new Date().toLocaleDateString('es-ES')}</small>
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  display: 'block',
                  marginTop: '8px',
                  padding: '8px 16px',
                  background: refreshing ? '#ccc' : 'white',
                  color: '#0078d4',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                {refreshing ? '🔄 Actualizando...' : '🔄 Forzar actualización'}
              </button>
              <a 
                href="#foros"
                style={{
                  display: 'block',
                  marginTop: '8px',
                  padding: '8px 16px',
                  background: '#107c10',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                💬 Ver Foros
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="search-section">
        <div className="container">
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por CVE, KB, título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="button" className="search-button">
              🔍 Buscar
            </button>
          </div>
          <div className="filters">
            {categories.map(c => (
              <button
                key={c.key}
                className={`filter-button ${activeFilter === c.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(c.key)}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="updates-section">
          <div className="container">
            <div className="loading">Cargando actualizaciones...</div>
          </div>
        </section>
      ) : error ? (
        <section className="updates-section">
          <div className="container">
            <div className="empty-state">{error}</div>
          </div>
        </section>
      ) : (
        <section className="updates-section">
          <div className="container">
            <div className="section-header">
              <h2>
                {activeFilter === 'all' ? 'Todas las actualizaciones' : displayLabel(activeFilter)}
              </h2>
              <small style={{ color: '#666' }}>{filtered.length} actualizaciones</small>
            </div>
            
            {filtered.length === 0 ? (
              <div className="empty-state">
                No se encontraron actualizaciones con los filtros seleccionados.
              </div>
            ) : (
              <div className="updates-grid">
                {filtered.map((u, i) => (
                  <a
                    key={`${u.id}-${i}`}
                    href={u.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="update-card"
                  >
                    <div className="card-header">
                      <span className={`update-tag tag-${u.category || 'other'}`}>
                        {displayLabel(u.category)}
                      </span>
                      {u.status && (
                        <span className={`card-status ${getStatusClass(u.status)}`}>
                          {u.status}
                        </span>
                      )}
                    </div>
                    <h3>{u.title}</h3>
                    <p className="update-date">
                      {u.releaseDate 
                        ? new Date(u.releaseDate).toLocaleDateString('es-ES', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })
                        : 'Fecha no disponible'}
                    </p>
                    {u.description && (
                      <p className="update-description">
                        {u.description.length > 200 
                          ? u.description.substring(0, 200) + '...' 
                          : u.description}
                      </p>
                    )}
                    <div className="card-actions">
                      <span className="doc-link">
                        Ver documentación completa
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section id="foros" className="updates-section" style={{ background: '#f8f9fa' }}>
        <div className="container">
          <h2>Comunidades y Foros</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Únete a la comunidad para discutir problemas y soluciones sobre actualizaciones de Windows
          </p>
          <div className="updates-grid">
            {foros.map((foro, i) => (
              <a
                key={i}
                href={foro.url}
                target="_blank"
                rel="noopener noreferrer"
                className="update-card"
                style={{ textDecoration: 'none' }}
              >
                <span className="update-tag tag-windows">{foro.name}</span>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                  Acceder al foro
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="links">
            <a href="https://learn.microsoft.com/es-es/windows/updates/" target="_blank">Windows Update</a>
            <a href="https://learn.microsoft.com/es-es/azure/" target="_blank">Azure Docs</a>
            <a href="https://learn.microsoft.com/es-es/microsoft-365/" target="_blank">Microsoft 365</a>
            <a href="https://msrc.microsoft.com/" target="_blank">Security Response Center</a>
          </div>
          <p>Microsoft Updates Tracker - Datos oficiales de Microsoft</p>
        </div>
      </footer>
    </main>
  )
}