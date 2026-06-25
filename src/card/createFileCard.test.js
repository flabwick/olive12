import { describe, expect, it } from 'vitest'
import { createFileCard, fileTypeLabel, formatFileSize } from './createFileCard'

describe('fileTypeLabel', () => {
  it('returns label for known MIME type', () => {
    expect(fileTypeLabel('application/pdf', 'report.pdf')).toBe('PDF')
    expect(fileTypeLabel('image/jpeg', 'photo.jpg')).toBe('JPG')
    expect(fileTypeLabel('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc.docx')).toBe('DOCX')
  })

  it('falls back to uppercased extension when MIME unknown', () => {
    expect(fileTypeLabel('application/octet-stream', 'archive.tar')).toBe('TAR')
    expect(fileTypeLabel('', 'notes.md')).toBe('MD')
  })

  it('returns FILE when no MIME and no extension', () => {
    expect(fileTypeLabel('', 'README')).toBe('FILE')
    expect(fileTypeLabel('', '')).toBe('FILE')
  })

  it('ignores extensions longer than 5 chars', () => {
    expect(fileTypeLabel('', 'weird.toolong')).toBe('FILE')
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })

  it('returns empty string for null/undefined', () => {
    expect(formatFileSize(null)).toBe('')
    expect(formatFileSize(undefined)).toBe('')
  })
})

describe('createFileCard', () => {
  const fakeFile = { name: 'report.pdf', type: 'application/pdf', size: 12345 }

  it('sets type to file', () => {
    expect(createFileCard(fakeFile).type).toBe('file')
  })

  it('sets title and fileName both to file.name', () => {
    const card = createFileCard(fakeFile)
    expect(card.title).toBe('report.pdf')
    expect(card.fileName).toBe('report.pdf')
  })

  it('stores fileType and fileSize', () => {
    const card = createFileCard(fakeFile)
    expect(card.fileType).toBe('application/pdf')
    expect(card.fileSize).toBe(12345)
  })

  it('starts with location none', () => {
    expect(createFileCard(fakeFile).location).toBe('none')
  })

  it('generates unique ids', () => {
    const a = createFileCard(fakeFile)
    const b = createFileCard(fakeFile)
    expect(a.id).not.toBe(b.id)
  })

  it('falls back to empty string when file.type is undefined', () => {
    const card = createFileCard({ name: 'data.csv', size: 100 })
    expect(card.fileType).toBe('')
  })
})
