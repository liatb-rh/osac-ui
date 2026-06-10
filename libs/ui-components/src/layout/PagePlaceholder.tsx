import { Content, Stack, StackItem, Title } from '@patternfly/react-core'

interface PlaceholderPageProps {
  title: string
  lede: string
}

export function PlaceholderPage({ title, lede }: PlaceholderPageProps) {
  return (
    <Stack hasGutter style={{ maxWidth: '48rem' }}>
      <StackItem>
        <Title headingLevel="h1" size="2xl">
          {title}
        </Title>
      </StackItem>
      <StackItem>
        <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
          {lede}
        </Content>
      </StackItem>
      <StackItem>
        <Content
          component="p"
          style={{ color: 'var(--pf-t--global--text--color--subtle)', fontStyle: 'italic' }}
        >
          This feature is coming soon. Contact your platform administrator for more information.
        </Content>
      </StackItem>
    </Stack>
  )
}
