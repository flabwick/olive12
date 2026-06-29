import { AddCardButton } from './AddCardButton'

export default {
  title: 'Tab/AddCardButton',
  component: AddCardButton,
  args: {
    onClick: () => {},
  },
}

export const Default = {}

export const Hover = {
  decorators: [
    (Story) => (
      <div>
        <style>{'.add-card-btn { border-color: var(--color-primary, #4a90d9); color: var(--color-primary, #4a90d9); }'}</style>
        <Story />
      </div>
    ),
  ],
}
