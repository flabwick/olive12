import { flattenFolderTree } from '../folder/createFolder'
import './FolderPickerOverlay.css'

export function FolderPickerOverlay({ folders = [], onSelect, onDismiss }) {
  const flat = flattenFolderTree(folders)

  return (
    <div
      className="folder-picker-backdrop"
      data-testid="folder-picker-backdrop"
      onClick={onDismiss}
    >
      <div
        className="folder-picker"
        role="dialog"
        aria-label="Move to Library"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="folder-picker__header">
          <span className="folder-picker__title">Move to Library</span>
          <button
            type="button"
            className="folder-picker__close"
            aria-label="Close"
            onClick={onDismiss}
          >
            ✕
          </button>
        </div>

        <ul className="folder-picker__list">
          <li className="folder-picker__item">
            <button
              type="button"
              className="folder-picker__option folder-picker__option--root"
              onClick={() => onSelect(null)}
            >
              Library root
            </button>
          </li>
          {flat.map(({ folder, depth }) => (
            <li key={folder.id} className="folder-picker__item">
              <button
                type="button"
                className="folder-picker__option"
                style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                onClick={() => onSelect(folder.id)}
              >
                {folder.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
