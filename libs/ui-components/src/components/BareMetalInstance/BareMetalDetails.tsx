import { useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Divider,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Tab, TabContent, TabContentBody, TabTitleText, Tabs } from '@patternfly/react-core';

import type { BareMetalInstance } from '@osac/types';

import {
  BARE_METAL_DETAIL_NETWORKING_TAB_ID,
  BARE_METAL_DETAIL_OVERVIEW_TAB_ID,
} from './bare-metal-detail-tabs';
import BareMetalActionButtons from './BareMetalActionButtons';
import BareMetalDetailsCard from './BareMetalDetailsCard';
import BareMetalNetworkingTab from './BareMetalNetworkingTab';
import { BareMetalStatusLabel } from './BareMetalStatusLabel';
import { useTranslation } from '../../hooks/useTranslation';
import { ResourceConditionsTable } from '../Resource/ResourceConditionsTable';
import { ResourceDetailHeader } from '../Resource/ResourceDetailHeader';

interface Props {
  instance: BareMetalInstance;
}

const BareMetalDetails = ({ instance }: Props) => {
  const { t } = useTranslation();
  const conditions = instance.status?.conditions ?? [];
  const [activeTab, setActiveTab] = useState(BARE_METAL_DETAIL_OVERVIEW_TAB_ID);

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Stack hasGutter>
          <StackItem>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
              flexWrap={{ default: 'wrap' }}
              spaceItems={{ default: 'spaceItemsMd' }}
            >
              <FlexItem>
                <ResourceDetailHeader
                  parentTo="/bare-metal"
                  parentLabel={t('Bare Metal')}
                  resourceName={instance.metadata?.name ?? instance.id}
                  titleAddon={<BareMetalStatusLabel state={instance.status?.state} />}
                />
              </FlexItem>
              <FlexItem>
                <BareMetalActionButtons instance={instance} />
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <Divider />
          </StackItem>
        </Stack>
      </PageSection>

      <PageSection hasBodyWrapper={false}>
        <Tabs
          id="bare-metal-detail-tabs"
          activeKey={activeTab}
          onSelect={(_e, key) => setActiveTab(String(key))}
        >
          <Tab
            eventKey={BARE_METAL_DETAIL_OVERVIEW_TAB_ID}
            title={<TabTitleText>{t('Overview')}</TabTitleText>}
            tabContentId={BARE_METAL_DETAIL_OVERVIEW_TAB_ID}
          />
          <Tab
            eventKey={BARE_METAL_DETAIL_NETWORKING_TAB_ID}
            title={<TabTitleText>{t('Networking')}</TabTitleText>}
            tabContentId={BARE_METAL_DETAIL_NETWORKING_TAB_ID}
          />
        </Tabs>

        <TabContent
          eventKey={BARE_METAL_DETAIL_OVERVIEW_TAB_ID}
          id={BARE_METAL_DETAIL_OVERVIEW_TAB_ID}
          activeKey={activeTab}
          hidden={activeTab !== BARE_METAL_DETAIL_OVERVIEW_TAB_ID}
        >
          <TabContentBody>
            <Grid hasGutter>
              <GridItem md={6}>
                <BareMetalDetailsCard instance={instance} />
              </GridItem>
              <GridItem md={6}>
                <Card isFullHeight>
                  <CardTitle>{t('Conditions')}</CardTitle>
                  <CardBody>
                    <ResourceConditionsTable
                      ariaLabel={t('Bare metal instance conditions')}
                      conditions={conditions}
                      conditionResourceKind="bare_metal_instance"
                    />
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </TabContentBody>
        </TabContent>

        <TabContent
          eventKey={BARE_METAL_DETAIL_NETWORKING_TAB_ID}
          id={BARE_METAL_DETAIL_NETWORKING_TAB_ID}
          activeKey={activeTab}
          hidden={activeTab !== BARE_METAL_DETAIL_NETWORKING_TAB_ID}
        >
          <TabContentBody>
            <BareMetalNetworkingTab instance={instance} />
          </TabContentBody>
        </TabContent>
      </PageSection>
    </>
  );
};

export default BareMetalDetails;
