import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '#/lib/db.server.ts'
import { requirePlatformAdmin } from '#/lib/admin-guard.server.ts'
import { writeAuditLog } from '#/server/admin/audit.server.ts'
import {
  deleteUserHandler,
  deriveUserRole,
  getUserDetailHandler,
  listUsersHandler,
  setUserBlockedHandler,
  setUserPlatformAdminHandler,
} from '#/server/admin/users.server.ts'

// De adminmodules importeren db en de guard op module-niveau; die raken
// omgevingsvariabelen aan die in een test niet bestaan. Vitest hoist `vi.mock`
// altijd naar de top van het bestand, dus de volgorde hier (ná de imports) is
// voor de uitvoering geen probleem — het houdt alleen de import-volgorde net.
vi.mock('#/lib/db.server.ts', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    session: { deleteMany: vi.fn() },
    order: { findMany: vi.fn(), aggregate: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('#/lib/admin-guard.server.ts', () => ({
  requirePlatformAdmin: vi.fn(),
}))
vi.mock('#/server/admin/audit.server.ts', () => ({ writeAuditLog: vi.fn() }))

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

const LIST_INPUT = {
  page: 1,
  pageSize: 25 as const,
  role: 'all' as const,
  status: 'active' as const,
  sort: 'createdAt' as const,
  direction: 'desc' as const,
}

function asAdmin() {
  vi.mocked(requirePlatformAdmin).mockResolvedValue(ADMIN)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.user.findMany).mockResolvedValue([])
  vi.mocked(db.user.count).mockResolvedValue(0)
  vi.mocked(db.$transaction).mockResolvedValue([])
  asAdmin()
})

describe('autorisatie', () => {
  it('leest geen enkele gebruiker zonder beheerdersrol', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('FORBIDDEN'))

    await expect(listUsersHandler(LIST_INPUT)).rejects.toThrow('FORBIDDEN')
    expect(db.user.findMany).not.toHaveBeenCalled()
  })

  it('geeft geen detailgegevens zonder beheerdersrol', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('FORBIDDEN'))

    await expect(getUserDetailHandler({ userId: 'user-1' })).rejects.toThrow(
      'FORBIDDEN',
    )
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })

  it('blokkeert niemand zonder sessie', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(
      new Error('UNAUTHENTICATED'),
    )

    await expect(
      setUserBlockedHandler({ userId: 'user-1', blocked: true }),
    ).rejects.toThrow('UNAUTHENTICATED')
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('wijzigt geen rol zonder beheerdersrol (privilege escalation)', async () => {
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error('FORBIDDEN'))

    await expect(
      setUserPlatformAdminHandler({
        userId: 'user-1',
        isPlatformAdmin: true,
      }),
    ).rejects.toThrow('FORBIDDEN')
    expect(db.user.update).not.toHaveBeenCalled()
    expect(writeAuditLog).not.toHaveBeenCalled()
  })
})

describe('privacy van de lijstquery', () => {
  it('selecteert geen wachtwoorden, tokens of sessies', async () => {
    await listUsersHandler(LIST_INPUT)

    const select = vi.mocked(db.user.findMany).mock.calls[0]?.[0]?.select ?? {}
    const fields = Object.keys(select)

    expect(fields).not.toContain('password')
    expect(fields).not.toContain('accounts')
    expect(fields).not.toContain('sessions')
    expect(fields).toContain('email')
  })

  it('begrenst de query altijd met skip en take', async () => {
    await listUsersHandler({ ...LIST_INPUT, page: 2 })

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25 }),
    )
  })

  it('verbergt standaard verwijderde en geblokkeerde accounts', async () => {
    await listUsersHandler(LIST_INPUT)

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, blockedAt: null } }),
    )
  })

  it('zoekt op naam en e-mail, hoofdletterongevoelig', async () => {
    await listUsersHandler({ ...LIST_INPUT, search: 'jill' })

    const where = vi.mocked(db.user.findMany).mock.calls[0]?.[0]?.where
    expect(where?.OR).toEqual([
      { name: { contains: 'jill', mode: 'insensitive' } },
      { email: { contains: 'jill', mode: 'insensitive' } },
    ])
  })

  it('negeert een zoekterm van één teken', async () => {
    await listUsersHandler({ ...LIST_INPUT, search: 'j' })

    expect(
      vi.mocked(db.user.findMany).mock.calls[0]?.[0]?.where?.OR,
    ).toBeUndefined()
  })
})

describe('gebruiker blokkeren', () => {
  it('weigert zelfblokkade voordat de database geraakt wordt', async () => {
    await expect(
      setUserBlockedHandler({ userId: ADMIN.id, blocked: true }),
    ).rejects.toThrow('CANNOT_BLOCK_SELF')
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })

  it('weigert het blokkeren van een andere beheerder', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-2',
      name: 'Jill Pinas',
      email: 'jill@example.com',
      isPlatformAdmin: true,
    } as never)

    await expect(
      setUserBlockedHandler({ userId: 'user-2', blocked: true }),
    ).rejects.toThrow('CANNOT_BLOCK_ADMIN')
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('blokkeert, ruimt sessies op en legt de actie vast', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-2',
      name: 'Jill Pinas',
      email: 'jill@example.com',
      isPlatformAdmin: false,
    } as never)

    await setUserBlockedHandler({ userId: 'user-2', blocked: true })

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { blockedAt: expect.any(Date) },
    })
    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-2' },
    })
    expect(writeAuditLog).toHaveBeenCalledWith({
      actorId: ADMIN.id,
      action: 'UserBlocked',
      targetType: 'User',
      targetId: 'user-2',
      targetLabel: 'Jill Pinas (jill@example.com)',
    })
  })

  it('heft de blokkade op zonder sessies te wissen', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-2',
      name: 'Jill Pinas',
      email: 'jill@example.com',
      isPlatformAdmin: false,
    } as never)

    await setUserBlockedHandler({ userId: 'user-2', blocked: false })

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { blockedAt: null },
    })
    expect(db.session.deleteMany).not.toHaveBeenCalled()
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UserUnblocked' }),
    )
  })
})

describe('beheerdersrol wijzigen', () => {
  it('weigert dat een beheerder zijn eigen rol aanpast', async () => {
    await expect(
      setUserPlatformAdminHandler({
        userId: ADMIN.id,
        isPlatformAdmin: false,
      }),
    ).rejects.toThrow('CANNOT_CHANGE_OWN_ROLE')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('weigert het promoveren van een geblokkeerd account', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-2',
      name: 'Jill Pinas',
      email: 'jill@example.com',
      isPlatformAdmin: false,
      blockedAt: new Date(),
      deletedAt: null,
    } as never)

    await expect(
      setUserPlatformAdminHandler({ userId: 'user-2', isPlatformAdmin: true }),
    ).rejects.toThrow('CANNOT_PROMOTE_INACTIVE_USER')
  })

  it('weigert het intrekken van de laatste beheerdersrol', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-2',
      name: 'Jill Pinas',
      email: 'jill@example.com',
      isPlatformAdmin: true,
      blockedAt: null,
      deletedAt: null,
    } as never)
    vi.mocked(db.user.count).mockResolvedValue(0)

    await expect(
      setUserPlatformAdminHandler({ userId: 'user-2', isPlatformAdmin: false }),
    ).rejects.toThrow('LAST_PLATFORM_ADMIN')
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('trekt de rol in zolang er een andere beheerder overblijft', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-2',
      name: 'Jill Pinas',
      email: 'jill@example.com',
      isPlatformAdmin: true,
      blockedAt: null,
      deletedAt: null,
    } as never)
    vi.mocked(db.user.count).mockResolvedValue(1)

    await setUserPlatformAdminHandler({
      userId: 'user-2',
      isPlatformAdmin: false,
    })

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { isPlatformAdmin: false },
    })
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UserRoleRevoked',
        metadata: {
          before: { isPlatformAdmin: true },
          after: { isPlatformAdmin: false },
        },
      }),
    )
  })

  it('legt het toekennen van de rol vast in het logboek', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-2',
      name: 'Jill Pinas',
      email: 'jill@example.com',
      isPlatformAdmin: false,
      blockedAt: null,
      deletedAt: null,
    } as never)

    await setUserPlatformAdminHandler({
      userId: 'user-2',
      isPlatformAdmin: true,
    })

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN.id,
        action: 'UserRoleGranted',
        targetType: 'User',
        targetId: 'user-2',
      }),
    )
  })
})

describe('gebruiker verwijderen', () => {
  const target = {
    id: 'user-2',
    name: 'Jill Pinas',
    email: 'jill@example.com',
    isPlatformAdmin: false,
    deletedAt: null,
    organization: null,
  }

  it('weigert het verwijderen van je eigen account', async () => {
    await expect(deleteUserHandler({ userId: ADMIN.id })).rejects.toThrow(
      'CANNOT_DELETE_SELF',
    )
  })

  it('weigert het verwijderen van een beheerder', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...target,
      isPlatformAdmin: true,
    } as never)

    await expect(deleteUserHandler({ userId: 'user-2' })).rejects.toThrow(
      'CANNOT_DELETE_ADMIN',
    )
  })

  it('weigert het verwijderen van een actieve organisator', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...target,
      organization: { id: 'org-1', deletedAt: null },
    } as never)

    await expect(deleteUserHandler({ userId: 'user-2' })).rejects.toThrow(
      'CANNOT_DELETE_ORGANIZER',
    )
  })

  it('verwijdert zacht en wist nooit bestellingen', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(target as never)

    await deleteUserHandler({ userId: 'user-2' })

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { deletedAt: expect.any(Date) },
    })
    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-2' },
    })
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UserDeleted' }),
    )
  })

  it('is idempotent voor een al verwijderd account', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...target,
      deletedAt: new Date(),
    } as never)

    await expect(deleteUserHandler({ userId: 'user-2' })).resolves.toEqual({
      success: true,
    })
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(writeAuditLog).not.toHaveBeenCalled()
  })
})

describe('deriveUserRole', () => {
  it('herkent de platformbeheerder', () => {
    expect(
      deriveUserRole({ isPlatformAdmin: true, organization: { id: 'org-1' } }),
    ).toBe('platformAdmin')
  })

  it('herkent de organisator aan zijn organisatie', () => {
    expect(
      deriveUserRole({ isPlatformAdmin: false, organization: { id: 'org-1' } }),
    ).toBe('organizer')
  })

  it('behandelt de rest als klant', () => {
    expect(deriveUserRole({ isPlatformAdmin: false, organization: null })).toBe(
      'customer',
    )
  })
})
