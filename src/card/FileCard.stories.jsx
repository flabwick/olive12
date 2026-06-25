import { FileCard } from './FileCard'

export default {
  title: 'Card/FileCard',
  component: FileCard,
  parameters: { layout: 'padded' },
  args: {
    cardId: 'fc1',
    onClose: () => {},
    onUpdate: () => {},
  },
}

export const PDF = {
  args: {
    title: 'Q3 Financial Report',
    fileName: 'q3-financial-report-2025.pdf',
    fileType: 'application/pdf',
    fileSize: 1_482_240,
    location: 'library',
  },
}

export const Image = {
  args: {
    title: 'product-screenshot.png',
    fileName: 'product-screenshot.png',
    fileType: 'image/png',
    fileSize: 284_160,
    location: 'shelf',
  },
}

export const Spreadsheet = {
  args: {
    title: 'Budget 2026',
    fileName: 'budget-2026.xlsx',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 62_400,
    location: 'library',
  },
}

export const TextFile = {
  args: {
    title: 'meeting-notes.txt',
    fileName: 'meeting-notes.txt',
    fileType: 'text/plain',
    fileSize: 2048,
  },
}

export const UnknownType = {
  args: {
    title: 'project.sketch',
    fileName: 'project.sketch',
    fileType: '',
    fileSize: 8_388_608,
  },
}

export const Folded = {
  args: {
    title: 'Q3 Financial Report',
    fileName: 'q3-financial-report-2025.pdf',
    fileType: 'application/pdf',
    fileSize: 1_482_240,
    foldState: true,
    onToggleFold: () => {},
  },
}

export const Hidden = {
  args: {
    title: 'hidden-file.pdf',
    fileName: 'hidden-file.pdf',
    fileType: 'application/pdf',
    fileSize: 500_000,
    hiddenState: true,
    onToggleHide: () => {},
  },
}

export const ReadOnly = {
  args: {
    title: 'document.pdf',
    fileName: 'document.pdf',
    fileType: 'application/pdf',
    fileSize: 102_400,
    onUpdate: undefined,
  },
}
