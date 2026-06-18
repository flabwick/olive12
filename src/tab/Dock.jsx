import './Dock.css'

function CaretUpIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
      <path d="M1.5 8L6 2.5L10.5 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none" aria-hidden="true">
      <path
        d="M1.5 11V3.5C1.5 2.948 1.948 2.5 2.5 2.5H6L7.5 4H12.5C13.052 4 13.5 4.448 13.5 5V11C13.5 11.552 13.052 12 12.5 12H2.5C1.948 12 1.5 11.552 1.5 11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TabsIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none" aria-hidden="true">
      <rect x="0.75" y="3.75" width="8.5" height="8.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5.75" y="0.75" width="8.5" height="8.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" className="dock__tabs-back" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none" aria-hidden="true">
      <path d="M1 2H14M1 6H14M1 10H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Dock({
  onAdd,
  addDisabled = false,
  onScrollTop,
  onFolder,
  onTabOverview,
  onMenu,
}) {
  return (
    <div className="dock" role="toolbar" aria-label="Tab actions">
      <div className="dock__group dock__group--left">
        <button
          type="button"
          className="dock__btn"
          aria-label="Scroll to top"
          onClick={onScrollTop}
        >
          <CaretUpIcon />
        </button>
        <button
          type="button"
          className="dock__btn"
          onClick={onAdd}
          disabled={addDisabled}
          aria-label="Add card"
        >
          +
        </button>
        <button
          type="button"
          className="dock__btn"
          aria-label="Folders"
          onClick={onFolder}
        >
          <FolderIcon />
        </button>
      </div>
      <div className="dock__group dock__group--right">
        <button
          type="button"
          className="dock__btn"
          aria-label="Tab overview"
          onClick={onTabOverview}
        >
          <TabsIcon />
        </button>
        <button
          type="button"
          className="dock__btn"
          aria-label="Menu"
          onClick={onMenu}
        >
          <MenuIcon />
        </button>
      </div>
    </div>
  )
}
