import { DockPrompt } from './DockPrompt'

export default {
  title: 'Tab/DockPrompt',
  component: DockPrompt,
  parameters: { layout: 'fullscreen' },
  args: {
    onSubmit: () => {},
    onDismiss: () => {},
    loading: false,
    error: '',
  },
}

export const Default = {}

export const Loading = {
  args: { loading: true },
}

export const WithError = {
  args: { error: 'The AI service is unavailable. Please try again.' },
}
