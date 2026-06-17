import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders the title and body', () => {
    render(<Card title="Meeting notes" body="Discuss roadmap" />)

    expect(screen.getByRole('heading', { level: 3, name: 'Meeting notes' })).toBeInTheDocument()
    expect(screen.getByText('Discuss roadmap')).toBeInTheDocument()
  })

  it('preserves line breaks in the body', () => {
    render(<Card title="List" body={'First line\nSecond line'} />)

    expect(screen.getByText(/First line/)).toHaveClass('card__body')
    expect(screen.getByText((_, element) => element?.textContent === 'First line\nSecond line')).toBeInTheDocument()
  })
})
