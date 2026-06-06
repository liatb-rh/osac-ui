/**
 * flow: institutional-sign-in
 * step: auth_sign_in_form
 *
 * Single shell (spec sign_in_shell.component: InstitutionalSignInPage); branding from
 * institutionalBrandingByTenant keyed by session selectedTenant (vertexa | northstar | evergreen).
 */
import { css } from '@emotion/css'
import {
  Bullseye,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Page,
  PageSection,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { LoginForm } from '../../components/login/LoginForm'
import { useSession } from '../../contexts/SessionContext'
import type { HeaderMarkSpec } from '../../components/login/institutionalBranding'
import { institutionalBrandingByTenant } from '../../components/login/institutionalBranding'

const emojiMarkCss = css`
  font-size: 2.5rem;
  line-height: 1;
  margin: 0;
  display: inline-block;
`

const bullseyeContainerCss = css`
  min-height: 100%;
`

const signInStackCss = css`
  width: 100%;
  max-width: 520px;
  text-align: center;
`

interface Props {
  defaultEmail: string
  onLoginSuccess: (email: string, password: string) => void
  onChooseAnother: () => void
  trustedIssuers?: string[]
  submitError?: string | null
}

function renderHeaderMark(spec: HeaderMarkSpec) {
  if (spec.kind === 'emoji') {
    return (
      <Content
        component="small"
        className={emojiMarkCss}
      >
        {spec.emoji}
      </Content>
    )
  }
  const letterMarkCss = css`
    width: 40px;
    height: 40px;
    border-radius: ${spec.borderRadius};
    background: ${spec.boxGradient};
    color: #fff;
    font-weight: 700;
    font-size: ${spec.borderRadius === '50%' ? '1.1rem' : '1.2rem'};
  `
  return (
    <Bullseye className={letterMarkCss}>
      {spec.letter}
    </Bullseye>
  )
}

export function InstitutionalSignInPage({
  defaultEmail,
  onLoginSuccess,
  onChooseAnother,
  trustedIssuers,
  submitError,
}: Props) {
  const { selectedTenant, isLoginLoading } = useSession()

  if (!selectedTenant) {
    return null
  }

  const branding = institutionalBrandingByTenant[selectedTenant]

  const pageCss = css`
    min-height: 100%;
    background: ${branding.pageBackground};
  `

  const pageSectionCss = css`
    background: ${branding.pageBackground};
  `

  const titleCss = css`
    color: ${branding.titleColor};
    margin: 0;
  `

  const subtitleCss = css`
    color: ${branding.subtitleColor};
    margin: 0;
  `

  return (
    <Page className={pageCss}>
      <PageSection className={pageSectionCss} isFilled>
        <Bullseye className={bullseyeContainerCss}>
          <Stack hasGutter className={signInStackCss}>
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Flex
                    justifyContent={{ default: 'justifyContentCenter' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    <FlexItem>{renderHeaderMark(branding.headerMark)}</FlexItem>
                    <FlexItem>
                      <Title
                        headingLevel="h1"
                        size="xl"
                        className={titleCss}
                      >
                        {branding.displayName}
                      </Title>
                    </FlexItem>
                  </Flex>
                </StackItem>
                <StackItem>
                  <Content component="p" className={subtitleCss}>
                    {branding.tagline}
                  </Content>
                </StackItem>
              </Stack>
            </StackItem>

            <StackItem>
              <Card style={branding.cardStyle}>
                <CardHeader>
                  <CardTitle style={branding.cardTitleStyle}>{branding.cardTitle}</CardTitle>
                </CardHeader>
                <CardBody>
                  <LoginForm
                    defaultEmail={defaultEmail}
                    emailLabel={branding.emailLabel}
                    emailType={branding.emailType}
                    showRememberMe={branding.showRememberMe}
                    isLoading={isLoginLoading}
                    onSubmit={onLoginSuccess}
                    onChooseAnother={onChooseAnother}
                    trustedIssuers={trustedIssuers}
                    submitError={submitError}
                  />
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        </Bullseye>
      </PageSection>
    </Page>
  )
}
