import { http, HttpResponse } from 'msw'

const MOCK_EVENTS = Array.from({ length: 50 }, (_, i) => ({
  id: `event-${i}`,
  type: ['VM_STARTED', 'VM_STOPPED', 'VM_PROVISIONED', 'SNAPSHOT_CREATED'][i % 4],
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  message: `Demo event ${i + 1}`,
  severity: ['info', 'success', 'warning', 'info'][i % 4],
}))

export const eventsHandlers = [
  http.get('/api/events/v1/events', ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const page = MOCK_EVENTS.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: MOCK_EVENTS.length, items: page })
  }),
]
