import { useEffect } from 'react'
import './TabSwitcher.css'

export function TabSwitcher({
  tabs,
  activeTabId,
  tabEntries,
  onSwitch,
  onClose,
  onAdd,
  onRemoveTab,
  onSaveTab,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleTileClick(tabId) {
    onSwitch?.(tabId)
    onClose?.()
  }

  return (
    <div
      className="tab-switcher"
      role="dialog"
      aria-label="Tab switcher"
      aria-modal="true"
    >
      <div
        className="tab-switcher__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="tab-switcher__tiles-wrapper">
        <div className="tab-switcher__tiles">
          {tabs.map((tab, index) => {
            const cardCount = tabEntries?.[tab.id]?.length ?? 0
            const isActive = tab.id === activeTabId

            return (
              <div
                key={tab.id}
                className={`tab-switcher__tile${isActive ? ' tab-switcher__tile--active' : ''}`}
                style={{ '--tile-index': index }}
                onClick={() => handleTileClick(tab.id)}
              >
                <button
                  type="button"
                  className="tab-switcher__close"
                  aria-label={`Close ${tab.name}`}
                  onClick={(e) => { e.stopPropagation(); onRemoveTab?.(tab.id) }}
                >
                  ×
                </button>
                <div className="tab-switcher__tile-name">{tab.name}</div>
                <div className="tab-switcher__tile-count">{cardCount} card{cardCount !== 1 ? 's' : ''}</div>
                {tab.savedLocation !== 'none' && (
                  <div className="tab-switcher__tile-badge">
                    {tab.savedLocation === 'shelf' ? 'Saved' : 'In Library'}
                  </div>
                )}
                {tab.savedLocation === 'none' && (
                  <button
                    type="button"
                    className="tab-switcher__save"
                    aria-label={`Save ${tab.name} to Shelf`}
                    onClick={(e) => { e.stopPropagation(); onSaveTab?.(tab.id) }}
                  >
                    Save
                  </button>
                )}
              </div>
            )
          })}
          <div
            className="tab-switcher__tile tab-switcher__tile--add"
            style={{ '--tile-index': tabs.length }}
            onClick={() => { onAdd?.(); onClose?.() }}
            role="button"
            aria-label="New tab"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onAdd?.(); onClose?.() } }}
          >
            <span className="tab-switcher__add-icon">+</span>
          </div>
        </div>
      </div>
    </div>
  )
}
