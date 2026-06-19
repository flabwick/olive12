import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthForm } from './AuthForm'

describe('AuthForm', () => {
  it('renders email and password inputs', () => {
    render(<AuthForm onSignIn={vi.fn()} onSignUp={vi.fn()} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('renders Sign in and Sign up buttons', () => {
    render(<AuthForm onSignIn={vi.fn()} onSignUp={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('buttons are disabled when fields are empty', () => {
    render(<AuthForm onSignIn={vi.fn()} onSignUp={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()
  })

  it('buttons enable once email and password are filled', async () => {
    render(<AuthForm onSignIn={vi.fn()} onSignUp={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
  })

  it('calls onSignIn with email and password when Sign in is clicked', async () => {
    const onSignIn = vi.fn()
    render(<AuthForm onSignIn={onSignIn} onSignUp={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'mypassword')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onSignIn).toHaveBeenCalledWith('user@example.com', 'mypassword')
  })

  it('calls onSignUp with email and password when Sign up is clicked', async () => {
    const onSignUp = vi.fn()
    render(<AuthForm onSignIn={vi.fn()} onSignUp={onSignUp} />)
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'newpass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(onSignUp).toHaveBeenCalledWith('new@example.com', 'newpass')
  })

  it('displays error message when error prop is set', () => {
    render(<AuthForm onSignIn={vi.fn()} onSignUp={vi.fn()} error="Invalid credentials" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
  })

  it('does not render error element when error is empty', () => {
    render(<AuthForm onSignIn={vi.fn()} onSignUp={vi.fn()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables inputs and buttons when loading', async () => {
    render(<AuthForm onSignIn={vi.fn()} onSignUp={vi.fn()} loading />)
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()
  })
})
