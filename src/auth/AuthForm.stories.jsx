import { AuthForm } from './AuthForm'

export default {
  title: 'auth/AuthForm',
  component: AuthForm,
  parameters: { layout: 'fullscreen' },
}

export const Default = {
  args: { onSignIn: () => {}, onSignUp: () => {} },
}

export const WithError = {
  args: {
    onSignIn: () => {},
    onSignUp: () => {},
    error: 'Invalid login credentials',
  },
}

export const Loading = {
  args: {
    onSignIn: () => {},
    onSignUp: () => {},
    loading: true,
  },
}
