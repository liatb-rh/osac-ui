import { css, cx } from '@emotion/css'
import {
  Content,
  Form,
  FormGroup,
  Stack,
  StackItem,
  TextInput,
  Title,
} from '@patternfly/react-core'
import type { UpdateFn, WizardState } from '../types'

const introCss = css`
  margin-top: var(--pf-t--global--spacer--sm);
  max-width: 720px;
`

export function ComputeStep({ state, update }: { state: WizardState; update: UpdateFn }) {
  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="compute-resources-heading" headingLevel="h2" size="xl">
          Compute resources
        </Title>
        <Content component="p" className={cx('pf-v6-u-color-text-subtle', introCss)}>
          Set vCPU and memory for this instance. Adjust to match your workload.
        </Content>
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="vCPU count" fieldId="cpu" isRequired>
            <TextInput
              id="cpu"
              type="number"
              value={state.cpuNew}
              onChange={(_e, v) => update('cpuNew', v)}
              min={1}
            />
          </FormGroup>
          <FormGroup label="Memory (GiB)" fieldId="memory" isRequired>
            <TextInput
              id="memory"
              type="number"
              value={state.memoryNew}
              onChange={(_e, v) => update('memoryNew', v)}
              min={1}
            />
          </FormGroup>
        </Form>
      </StackItem>
    </Stack>
  )
}
