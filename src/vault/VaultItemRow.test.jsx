import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VaultItemRow } from './VaultItemRow'

const defaults = { type: 'card', title: 'Meeting notes' }

describe('VaultItemRow', () => {
  it('renders the title', () => {
    render(<VaultItemRow {...defaults} />)
    expect(screen.getByText('Meeting notes')).toBeInTheDocument()
  })

  it('does not render a subtitle element', () => {
    render(<VaultItemRow {...defaults} />)
    expect(document.querySelector('.vault-item-row__subtitle')).toBeNull()
  })

  it('renders a type icon', () => {
    render(<VaultItemRow {...defaults} />)
    expect(document.querySelector('.vault-item-row__icon')).toBeTruthy()
  })

  it('calls onClick when row is clicked in normal mode', async () => {
    const onClick = vi.fn()
    render(<VaultItemRow {...defaults} onClick={onClick} />)
    await userEvent.click(screen.getByText('Meeting notes'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('calls onSelect (not onClick) when row is clicked in selectMode', async () => {
    const onClick = vi.fn()
    const onSelect = vi.fn()
    render(<VaultItemRow {...defaults} onClick={onClick} onSelect={onSelect} selectMode />)
    await userEvent.click(screen.getByText('Meeting notes'))
    expect(onSelect).toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies highlighted class when highlighted is true', () => {
    render(<VaultItemRow {...defaults} highlighted />)
    expect(document.querySelector('.vault-item-row--highlighted')).toBeTruthy()
  })

  it('applies selected class when selected is true', () => {
    render(<VaultItemRow {...defaults} selected />)
    expect(document.querySelector('.vault-item-row--selected')).toBeTruthy()
  })

  it('renders checkbox when selectMode is true', () => {
    render(<VaultItemRow {...defaults} selectMode selected={false} onSelect={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: 'Select Meeting notes' })).toBeInTheDocument()
  })

  it('does not render checkbox when selectMode is false', () => {
    render(<VaultItemRow {...defaults} selectMode={false} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('calls onSelect when checkbox is changed', async () => {
    const onSelect = vi.fn()
    render(<VaultItemRow {...defaults} selectMode selected={false} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Meeting notes' }))
    expect(onSelect).toHaveBeenCalled()
  })

  it('applies type BEM modifier class', () => {
    render(<VaultItemRow {...defaults} type="tab" />)
    expect(document.querySelector('.vault-item-row--tab')).toBeTruthy()
  })

  it('does not render a menu button', () => {
    render(<VaultItemRow {...defaults} />)
    expect(screen.queryByRole('button', { name: 'Item menu' })).not.toBeInTheDocument()
  })
})
