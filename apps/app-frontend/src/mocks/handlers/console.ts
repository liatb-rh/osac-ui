import { http, HttpResponse } from 'msw'

export const consoleHandlers = [
  http.get('/api/osac/public/v1/console/:resourceType/:resourceId/access', ({ params }) => {
    const { resourceType } = params
    const available =
      resourceType === 'CONSOLE_RESOURCE_TYPE_COMPUTE_INSTANCE' ||
      resourceType === 'COMPUTE_INSTANCE_RESOURCE_TYPE_COMPUTE_INSTANCE'
    return HttpResponse.json({
      available,
      reason: available ? undefined : 'Resource type not supported for console access',
      supportedTypes: available ? ['serial', 'vnc'] : [],
    })
  }),
]
