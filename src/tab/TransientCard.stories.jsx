import { TransientCard } from './TransientCard'

export default {
  title: 'Tab/TransientCard',
  component: TransientCard,
  args: {
    onSubmit: () => {},
    onDismiss: () => {},
  },
}

export const Default = {}

export const WithContent = {
  args: {},
  render: (args) => (
    <div style={{ maxWidth: 480 }}>
      <TransientCard {...args} />
    </div>
  ),
}
