import * as React from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import {
  createCategory,
  listCategoriesAdmin,
  updateCategory,
} from '#/server/admin/categories.ts'
import { errorMessage } from '#/lib/error-message.ts'
import { AdminPageHeader } from '#/components/app/admin/page-header.tsx'
import {
  AdminErrorState,
  AdminPendingState,
} from '#/components/app/admin/route-states.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { toast } from '#/components/ui/sonner.tsx'

export const Route = createFileRoute('/_admin/admin/settings')({
  loader: async () => ({ categories: await listCategoriesAdmin() }),
  component: AdminSettings,
  pendingComponent: () => <AdminPendingState rows={6} />,
  errorComponent: ({ error, reset }) => (
    <AdminErrorState error={error} reset={reset} />
  ),
})

type CategoryRow = Awaited<ReturnType<typeof listCategoriesAdmin>>[number]

function AdminSettings() {
  const { categories } = Route.useLoaderData()
  const router = useRouter()
  const [editing, setEditing] = React.useState<CategoryRow | null>(null)
  const [creating, setCreating] = React.useState(false)

  async function save(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      await router.invalidate()
      toast.success(success)
      setEditing(null)
      setCreating(false)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Instellingen"
        description="Platformbrede instellingen die daadwerkelijk effect hebben op de applicatie."
      />

      <Card className="gap-0 px-0 pb-4">
        <CardHeader className="flex-row items-start justify-between px-5 pb-4">
          <div>
            <CardTitle className="text-base">Categorieën</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Organisatoren kiezen een categorie bij het publiceren van een
              evenement, en bezoekers filteren erop. Een categorie op inactief
              zetten haalt hem uit die keuzelijsten; bestaande evenementen
              houden hun categorie.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Categorie
          </Button>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categorie</TableHead>
              <TableHead>Icoon</TableHead>
              <TableHead className="text-right">Volgorde</TableHead>
              <TableHead className="text-right">Evenementen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <span className="font-semibold">{category.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    /{category.slug}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {category.icon ?? '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {category.sortOrder}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {category._count.events}
                </TableCell>
                <TableCell>
                  {category.active ? (
                    <Badge variant="soft-success">Actief</Badge>
                  ) : (
                    <Badge variant="soft-muted">Inactief</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(category)}
                  >
                    Bewerken
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Waarom staan hier niet meer instellingen?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Betaalinstellingen horen bij de organisator (elke organisatie regelt
            zijn eigen WhatsApp- en bankgegevens), meldingsvoorkeuren staan per
            gebruiker, en het platform kent geen instelbare naam of
            functievlaggen. Een scherm bouwen voor instellingen die nergens
            effect hebben, levert alleen verwarring op — dus doen we dat niet.
          </p>
        </CardContent>
      </Card>

      <CategoryDialog
        key={editing?.id ?? (creating ? 'new' : 'closed')}
        open={creating || editing !== null}
        category={editing}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        onSubmit={(values) =>
          editing
            ? save(
                () =>
                  updateCategory({
                    data: { ...values, categoryId: editing.id },
                  }),
                'Categorie bijgewerkt.',
              )
            : save(
                () => createCategory({ data: values }),
                'Categorie aangemaakt.',
              )
        }
      />
    </div>
  )
}

type CategoryValues = {
  name: string
  icon?: string
  sortOrder: number
  active: boolean
}

function CategoryDialog({
  open,
  category,
  onClose,
  onSubmit,
}: {
  open: boolean
  category: CategoryRow | null
  onClose: () => void
  onSubmit: (values: CategoryValues) => Promise<void>
}) {
  const [name, setName] = React.useState(category?.name ?? '')
  const [icon, setIcon] = React.useState(category?.icon ?? '')
  const [sortOrder, setSortOrder] = React.useState(
    String(category?.sortOrder ?? 0),
  )
  const [active, setActive] = React.useState(category?.active ?? true)
  const [busy, setBusy] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit({
        name: name.trim(),
        icon: icon.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
        active,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {category ? 'Categorie bewerken' : 'Nieuwe categorie'}
            </DialogTitle>
            <DialogDescription>
              {category
                ? 'De naam is direct zichtbaar voor organisatoren en bezoekers. De slug blijft ongewijzigd, zodat bestaande links blijven werken.'
                : 'De categorie verschijnt meteen in de keuzelijst bij het publiceren van een evenement.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-name">Naam</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={60}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category-icon">Icoon</Label>
              <Input
                id="category-icon"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="Optioneel"
                maxLength={60}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category-sort">Volgorde</Label>
              <Input
                id="category-sort"
                type="number"
                min={0}
                max={999}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <Label htmlFor="category-active">Actief</Label>
              <p className="text-sm text-muted-foreground">
                Inactieve categorieën verdwijnen uit de keuzelijst en de
                storefrontfilters.
              </p>
            </div>
            <Switch
              id="category-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={busy || name.trim().length < 2}>
              {busy ? 'Bezig…' : category ? 'Opslaan' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
