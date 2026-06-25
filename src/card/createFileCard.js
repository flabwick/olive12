const MIME_LABELS = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'image/svg+xml': 'SVG',
  'image/tiff': 'TIFF',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'text/html': 'HTML',
  'application/json': 'JSON',
  'application/xml': 'XML',
  'application/zip': 'ZIP',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/msword': 'DOC',
  'application/vnd.ms-excel': 'XLS',
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'audio/ogg': 'OGG',
  'video/mp4': 'MP4',
  'video/webm': 'WEBM',
  'video/quicktime': 'MOV',
}

export function fileTypeLabel(fileType, fileName) {
  if (fileType && MIME_LABELS[fileType]) return MIME_LABELS[fileType]
  const ext = (fileName ?? '').split('.').pop()
  if (ext && ext !== fileName && ext.length <= 5) return ext.toUpperCase()
  return 'FILE'
}

export function formatFileSize(bytes) {
  if (bytes == null || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function createFileCard(file) {
  return {
    id: crypto.randomUUID(),
    type: 'file',
    title: file.name,
    fileName: file.name,
    fileType: file.type || '',
    fileSize: file.size,
    body: '',
    back: '',
    config: null,
    location: 'none',
    folderId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
