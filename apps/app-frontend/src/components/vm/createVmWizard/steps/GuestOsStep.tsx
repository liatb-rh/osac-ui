import { css, cx } from '@emotion/css'
import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
import {
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Radio,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import guestOsTuxLinuxUrl from '../../../../assets/guest-os-tux-linux.png'
import { GUEST_OS_FAMILIES, OS_TYPES } from '../constants'
import type { UpdateFn, WizardState } from '../types'

const guestOsIntroCss = css`
  margin-top: var(--pf-t--global--spacer--sm);
  max-width: 720px;
`

const guestOsCardHeaderCss = css`
  flex-shrink: 0;
`

const guestOsCardHeaderFlexCss = css`
  width: 100%;
`

const guestOsLinuxMascotCss = css`
  display: block;
  object-fit: contain;
  border-radius: var(--pf-t--global--border--radius--small);
`

const guestOsCardTitleCss = css`
  font-weight: 600;
  margin: 0;
  font-size: 1rem;
`

const guestOsCardDescriptionCss = css`
  margin: 0;
  font-size: var(--pf-t--global--font--size--body--sm);
`

const guestOsCardBodyStackCss = css`
  flex: 1;
`

const FAMILY_ICONS = {
  rhel: RedhatIcon,
  windows: WindowsIcon,
} as const

const FAMILY_ICON_COLORS: Record<keyof typeof FAMILY_ICONS, string> = {
  rhel: '#EE0000',
  windows: '#0078D4',
}

const VERSION_PLACEHOLDER = 'Select a version…'
const NEED_OS_PLACEHOLDER = 'You need to choose an OS first.'

export function GuestOsStep({ state, update }: { state: WizardState; update: UpdateFn }) {
  const familySelected = !!state.osFamilyNew
  const versions = familySelected ? (OS_TYPES[state.osFamilyNew] ?? []) : []

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="guest-os-heading" headingLevel="h2" size="xl">
          Guest operating system
        </Title>
        <Content component="p" className={cx('pf-v6-u-color-text-subtle', guestOsIntroCss)}>
          Choose a platform, then pick a specific version from the list below.
        </Content>
      </StackItem>
      <StackItem>
        <div className="osac-deploy-options" role="radiogroup" aria-labelledby="guest-os-heading">
          {GUEST_OS_FAMILIES.map((opt) => {
            const selected = state.osFamilyNew === opt.id
            const PfIcon = opt.id === 'linux' ? null : FAMILY_ICONS[opt.id]
            const guestOsCardCss = css`
              cursor: pointer;
              box-sizing: border-box;
              border-width: 1px;
              border-style: solid;
              border-color: ${selected
                ? 'var(--pf-t--global--color--brand--default)'
                : 'var(--pf-t--global--border--color--default)'};
              border-radius: var(--pf-t--global--border--radius--medium);
            `
            const familyIconCss = css`
              color: ${FAMILY_ICON_COLORS[opt.id as keyof typeof FAMILY_ICON_COLORS]};
              width: 28px;
              height: 28px;
            `
            return (
              <div key={opt.id} className="osac-deploy-options__cell">
                <Card
                  id={`guest-os-card-${opt.id}`}
                  className={cx('osac-deploy-options__card', guestOsCardCss)}
                  isCompact
                  isFullHeight
                  isClickable
                  isSelected={selected}
                  onClick={() => {
                    update('osFamilyNew', opt.id)
                    update('osTypeNew', '')
                  }}
                  ouiaId={`guest-os-option-${opt.id}`}
                >
                  <CardHeader className={guestOsCardHeaderCss}>
                    <Flex
                      justifyContent={{ default: 'justifyContentSpaceBetween' }}
                      alignItems={{ default: 'alignItemsFlexStart' }}
                      className={guestOsCardHeaderFlexCss}
                    >
                      <FlexItem>
                        {PfIcon ? (
                          <PfIcon className={familyIconCss} />
                        ) : (
                          <img
                            src={guestOsTuxLinuxUrl}
                            alt=""
                            width={28}
                            height={28}
                            className={guestOsLinuxMascotCss}
                          />
                        )}
                      </FlexItem>
                      <FlexItem>
                        <Radio
                          id={`guest-os-radio-${opt.id}`}
                          name="guestOsFamily"
                          aria-label={opt.title}
                          isChecked={selected}
                          onChange={() => {
                            update('osFamilyNew', opt.id)
                            update('osTypeNew', '')
                          }}
                        />
                      </FlexItem>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Stack hasGutter className={guestOsCardBodyStackCss}>
                      <StackItem>
                        <Content component="h3" className={guestOsCardTitleCss}>
                          {opt.title}
                        </Content>
                      </StackItem>
                      <StackItem>
                        <div className="osac-deploy-options__badge-slot" aria-hidden />
                      </StackItem>
                      <StackItem>
                        <Content
                          component="p"
                          className={cx('pf-v6-u-color-text-subtle', guestOsCardDescriptionCss)}
                        >
                          {opt.description}
                        </Content>
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </div>
            )
          })}
        </div>
      </StackItem>
      <StackItem>
        <FormGroup label="Operating system version" fieldId="guest-os-version" isRequired>
          <FormSelect
            id="guest-os-version"
            value={familySelected ? state.osTypeNew : ''}
            isDisabled={!familySelected}
            onChange={(_e, value: string) => update('osTypeNew', value)}
          >
            <FormSelectOption
              value=""
              label={familySelected ? VERSION_PLACEHOLDER : NEED_OS_PLACEHOLDER}
              isPlaceholder
            />
            {versions.map((t) => (
              <FormSelectOption key={t} value={t} label={t} />
            ))}
          </FormSelect>
        </FormGroup>
      </StackItem>
    </Stack>
  )
}
