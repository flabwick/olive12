import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileCard } from './FileCard'

const defaultProps = {
  title: 'Q3 Report',
  fileName: 'q3-report.pdf',
  fileType: 'application/pdf',
  fileSize: 1_048_576,
  cardId: 'fc-1',
}

describe('FileCard', () => {
  it('renders the title', () => {
    render(<FileCard {...defaultProps} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Q3 Report' })).toBeInTheDocument()
  })

  it('renders the filename', () => {
    render(<FileCard {...defaultProps} />)
    expect(screen.getByText('q3-report.pdf')).toBeInTheDocument()
  })

  it('hides file body when foldState is true', () => {
    render(<FileCard {...defaultProps} foldState={true} onToggleFold={() => {}} />)
    expect(screen.queryByText('q3-report.pdf')).not.toBeInTheDocument()
  })

  it('applies file-card--hidden class when hiddenState is true', () => {
    render(<FileCard {...defaultProps} hiddenState={true} />)
    const card = screen.getByRole('heading', { level: 3, name: 'Q3 Report' }).closest('.file-card')
    expect(card).toHaveClass('file-card--hidden')
  })

  it('does not apply file-card--hidden when hiddenState is false', () => {
    render(<FileCard {...defaultProps} hiddenState={false} />)
    const card = screen.getByRole('heading', { level: 3, name: 'Q3 Report' }).closest('.file-card')
    expect(card).not.toHaveClass('file-card--hidden')
  })

  it('renders Remove card button when onClose is provided', () => {
    render(<FileCard {...defaultProps} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remove card' })).toBeInTheDocument()
  })

  it('calls onClose when Remove card is clicked', async () => {
    const onClose = vi.fn()
    render(<FileCard {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  describe('title editing', () => {
    it('title is editable when onUpdate is provided', () => {
      render(<FileCard {...defaultProps} onUpdate={() => {}} />)
      expect(screen.getByRole('heading', { level: 3, name: 'Q3 Report' })).toHaveAttribute('tabindex', '0')
    })

    it('clicking title enters edit mode', async () => {
      render(<FileCard {...defaultProps} onUpdate={() => {}} />)
      await userEvent.click(screen.getByRole('heading', { level: 3, name: 'Q3 Report' }))
      expect(screen.getByRole('textbox', { name: 'Card title' })).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('renders checkbox when onToggleSelect is provided', () => {
      render(<FileCard {...defaultProps} onToggleSelect={() => {}} />)
      expect(screen.getByRole('checkbox', { name: 'Select card' })).toBeInTheDocument()
    })

    it('does not render checkbox when onToggleSelect is not provided', () => {
      render(<FileCard {...defaultProps} />)
      expect(screen.queryByRole('checkbox', { name: 'Select card' })).not.toBeInTheDocument()
    })

    it('applies file-card--selected class when selected is true', () => {
      render(<FileCard {...defaultProps} selected={true} onToggleSelect={() => {}} />)
      const card = screen.getByRole('heading', { level: 3, name: 'Q3 Report' }).closest('.file-card')
      expect(card).toHaveClass('file-card--selected')
    })

    it('does not apply file-card--selected when selected is false', () => {
      render(<FileCard {...defaultProps} selected={false} onToggleSelect={() => {}} />)
      const card = screen.getByRole('heading', { level: 3, name: 'Q3 Report' }).closest('.file-card')
      expect(card).not.toHaveClass('file-card--selected')
    })

    it('calls onToggleSelect when checkbox is clicked', async () => {
      const onToggleSelect = vi.fn()
      render(<FileCard {...defaultProps} onToggleSelect={onToggleSelect} />)
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select card' }))
      expect(onToggleSelect).toHaveBeenCalledOnce()
    })
  })
})
