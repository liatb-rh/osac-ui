import { fulfillmentHandlers } from './fulfillment'
import { eventsHandlers } from './events'
import { consoleHandlers } from './console'
import { wizardHandlers } from './wizard'

export const handlers = [
  ...fulfillmentHandlers,
  ...eventsHandlers,
  ...consoleHandlers,
  ...wizardHandlers,
]
