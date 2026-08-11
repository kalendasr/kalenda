import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { writeAuditLog } from '#/server/admin/audit.server.ts'
import {
  setOrganizationActiveHandler,
  setOrganizationVerifiedHandler,
} from '#/server/admin/organizations.server.ts'
import {
  archiveEventAdminHandler,
  deleteEventAdminHandler,
  unpublishEventAdminHandler,
} from '#/server/admin/events.server.ts'

// De adminmodules importeren db en de guard op module-niveau; die raken
// omgevingsvariabelen aan die in een test niet bestaan. Vitest hoist `vi.mock`
// altijd naar de top van het bestand, dus de volgorde hier (ná de imports) is
// voor de uitvoering geen probleem — het houdt alleen de import-volgorde net.
vi.mock('#/lib/db.server.ts', () => ({
  db: {
    organization: { findUnique: vi.fn(), update: vi.fn() },
    event: { findFirst: vi.fn(), update: vi.fn() },
    order: { count: vi.fn() },
    ticket: { count: vi.fn() },
  },
}))
vi.mock('#/lib/admin-guard.server.ts', () => ({
  requirePlatformAdmin: vi.fn(),
}))
vi.mock('#/server/admin/audit.server.ts', () => ({ writeAuditLog: vi.fn() }))

/**
 * Elke ingrijpende beheerdersactie moet een spoor achterlaten (Fase 12/13).
 * Deze suite bewaakt dat: wie deed wat, met welk onderwerp — en dat er nooit
 * geheimen in de metadata belanden.
 */

const ADMIN = {
  id: 'admin-1',
  name: 'Kim Ramdien',
  email: 'kim@kalenda.sr',
  image: null,
  firstName: 'Kim',
  lastName: 'Ramdien',
  phone: null,
  isPlatformAdmin: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requirePlatformAdmin).mockResolvedValue(ADMIN)
  vi.mocked(db.order.count).mockResolvedValue(0)
  vi.mocked(db.ticket.count).mockResolvedValue(0)
})

describe('organisatieacties', () => {
  beforeEach(() => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org-1',
      name: 'Stichting Wan Pipel',
      deletedAt: null,
      isVerified: false,
    } as never)
  })

  it('legt deactiveren vast met actor en onderwerp', async () => {
    await setOrganizationActiveHandler({
      organizationId: 'org-1',
      active: false,
    })

    expect(db.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { deletedAt: expect.any(Date) },
    })
    expect(writeAuditLog).toHaveBeenCalledWith({
      actorId: ADMIN.id,
      action: 'OrganizationDeactivated',
      targetType: 'Organization',
      targetId: 'org-1',
      targetLabel: 'Stichting Wan Pipel',
    })
  })

  it('legt heractiveren vast als eigen actie', async () => {
    await setOrganizationActiveHandler({
      organizationId: 'org-1',
      active: true,
    })

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'OrganizationReactivated' }),
    )
  })

  it('bewaart de toestand voor en na bij verificatie', async () => {
    await setOrganizationVerifiedHandler({
      organizationId: 'org-1',
      verified: true,
    })

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OrganizationVerified',
        metadata: {
          before: { isVerified: false },
          after: { isVerified: true },
        },
      }),
    )
  })
})

describe('evenementacties', () => {
  beforeEach(() => {
    vi.mocked(db.event.findFirst).mockResolvedValue({
      id: 'event-1',
      title: 'Zomerfeest',
      status: 'Published',
    } as never)
  })

  it('legt archiveren vast', async () => {
    await archiveEventAdminHandler({ eventId: 'event-1' })

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN.id,
        action: 'EventArchived',
        targetType: 'Event',
        targetId: 'event-1',
        targetLabel: 'Zomerfeest',
      }),
    )
  })

  it('legt terugzetten naar concept vast', async () => {
    await unpublishEventAdminHandler({ eventId: 'event-1' })

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EventUnpublished' }),
    )
  })

  it('schrijft geen logregel wanneer de businessregel de actie blokkeert', async () => {
    vi.mocked(db.ticket.count).mockResolvedValue(3)

    await expect(
      unpublishEventAdminHandler({ eventId: 'event-1' }),
    ).rejects.toThrow('verkochte tickets')
    expect(db.event.update).not.toHaveBeenCalled()
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('legt verwijderen vast van een leeg concept', async () => {
    vi.mocked(db.event.findFirst).mockResolvedValue({
      id: 'event-1',
      title: 'Zomerfeest',
      status: 'Draft',
    } as never)

    await deleteEventAdminHandler({ eventId: 'event-1' })

    expect(db.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { deletedAt: expect.any(Date) },
    })
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EventDeleted' }),
    )
  })

  it('weigert verwijderen zodra er bestellingen zijn', async () => {
    vi.mocked(db.event.findFirst).mockResolvedValue({
      id: 'event-1',
      title: 'Zomerfeest',
      status: 'Draft',
    } as never)
    vi.mocked(db.order.count).mockResolvedValue(2)

    await expect(
      deleteEventAdminHandler({ eventId: 'event-1' }),
    ).rejects.toThrow('bestellingen')
    expect(writeAuditLog).not.toHaveBeenCalled()
  })
})

describe('autorisatie van beheerdersacties', () => {
  it('logt niets en muteert niets zonder beheerdersrol', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('FORBIDDEN'))

    await expect(
      setOrganizationActiveHandler({ organizationId: 'org-1', active: false }),
    ).rejects.toThrow('FORBIDDEN')
    await expect(
      archiveEventAdminHandler({ eventId: 'event-1' }),
    ).rejects.toThrow('FORBIDDEN')

    expect(db.organization.update).not.toHaveBeenCalled()
    expect(db.event.update).not.toHaveBeenCalled()
    expect(writeAuditLog).not.toHaveBeenCalled()
  })
})

describe('geen geheimen in de metadata', () => {
  it('bevat alleen toestandsvelden', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org-1',
      name: 'Stichting Wan Pipel',
      deletedAt: null,
      isVerified: false,
    } as never)

    await setOrganizationVerifiedHandler({
      organizationId: 'org-1',
      verified: true,
    })

    const entry = vi.mocked(writeAuditLog).mock.calls[0]?.[0]
    const serialized = JSON.stringify(entry)

    for (const forbidden of ['password', 'token', 'secret', 'proofKey']) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
