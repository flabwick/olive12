import { AIPrompt } from './AIPrompt'

export default {
  title: 'AI/AIPrompt',
  component: AIPrompt,
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

export const Streaming = {
  args: { loading: true, streaming: true },
}

export const WithError = {
  args: { error: 'The AI service is unavailable. Please try again.' },
}
