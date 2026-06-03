import { http, HttpResponse } from 'msw'
import { vmStore } from '../vm-store'
import {
  sessions,
  createSession,
  advanceSession,
  sessionPayload,
  validateAllStepsBeforeReview,
  buildVmFromDraft,
} from '../wizard-store'

const PREFIX = '/api/osac/bff/v1/create-vm-wizard'

export const wizardHandlers = [
  // Start session
  http.post(`${PREFIX}/sessions`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      entry?: string
      deploymentMethod?: 'new' | 'template' | 'clone' | null
      presetTemplateId?: string | null
      presetCloneSourceVmId?: string | null
    }
    const result = createSession(body)
    if (!result.ok) {
      return HttpResponse.json({ error: result.error }, { status: result.status })
    }
    const sessionId = `wzd-${crypto.randomUUID()}`
    sessions.set(sessionId, result.session)
    return HttpResponse.json(sessionPayload(result.session, sessionId))
  }),

  // Get session
  http.get(`${PREFIX}/sessions/:sessionId`, ({ params }) => {
    const sessionId = params.sessionId as string
    const session = sessions.get(sessionId)
    if (!session) return HttpResponse.json({ error: 'Session not found' }, { status: 404 })
    return HttpResponse.json(sessionPayload(session, sessionId))
  }),

  // Advance
  http.post(`${PREFIX}/sessions/:sessionId/advance`, async ({ params, request }) => {
    const sessionId = params.sessionId as string
    const session = sessions.get(sessionId)
    if (!session) return HttpResponse.json({ error: 'Session not found' }, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as {
      fromStepId?: string
      draft?: Record<string, unknown>
    }
    const result = advanceSession(session, body.fromStepId, body.draft as never)
    if ('error' in result) {
      return HttpResponse.json(
        { error: result.error, ...(result.fieldErrors ? { fieldErrors: result.fieldErrors } : {}) },
        { status: result.status },
      )
    }
    sessions.set(sessionId, result.updated)
    return HttpResponse.json(sessionPayload(result.updated, sessionId))
  }),

  // Back
  http.post(`${PREFIX}/sessions/:sessionId/back`, ({ params }) => {
    const sessionId = params.sessionId as string
    const session = sessions.get(sessionId)
    if (!session) return HttpResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.activeIndex <= 0)
      return HttpResponse.json({ error: 'Cannot go back from first step' }, { status: 400 })
    session.activeIndex -= 1
    return HttpResponse.json(sessionPayload(session, sessionId))
  }),

  // Finalize
  http.post(`${PREFIX}/sessions/:sessionId/finalize`, async ({ params, request }) => {
    const sessionId = params.sessionId as string
    const session = sessions.get(sessionId)
    if (!session) return HttpResponse.json({ error: 'Session not found' }, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as { draft?: Record<string, unknown> }

    // Apply any final draft updates
    if (body.draft) {
      Object.assign(session.draft, body.draft)
    }

    const ordered = (['template', 'customization', 'review']) as string[]
    const activeStepId = ordered[session.activeIndex]
    if (activeStepId !== 'review') {
      return HttpResponse.json({ error: 'Finalize only allowed on review step' }, { status: 400 })
    }

    const vms = Array.from(vmStore.values())
    const errs = validateAllStepsBeforeReview(session.draft, session.skipDeployment, vms)
    if (errs) return HttpResponse.json({ fieldErrors: errs }, { status: 400 })

    const vm = buildVmFromDraft(session.draft, vms)
    const persisted = {
      ...vm,
      id: vm.id ?? `vm-created-${Date.now()}`,
      status: vm.status ?? { state: 'starting' },
      metadata: { ...vm.metadata, createdAt: new Date().toISOString() },
    }
    vmStore.set(persisted.id, persisted)
    sessions.delete(sessionId)
    return HttpResponse.json({ object: persisted })
  }),

  // Abandon
  http.delete(`${PREFIX}/sessions/:sessionId`, ({ params }) => {
    sessions.delete(params.sessionId as string)
    return new HttpResponse(null, { status: 204 })
  }),
]
