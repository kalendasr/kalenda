import * as React from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { ImageIcon, Upload } from 'lucide-react'

import { updateOrganizationGeneral } from '#/server/organization.ts'
import { uploadOrganizationImage } from '#/server/upload.ts'
import { organizationGeneralSchema } from '#/lib/validation/organization.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { cn } from '#/lib/utils.ts'
import { toast } from '#/components/ui/sonner.tsx'
import { errorMessage } from '#/lib/error-message.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { FormField } from '#/components/ui/form-field.tsx'
import { FormError } from '#/components/auth/form-error.tsx'

/**
 * Details-tab: contactgegevens en branding op één pagina — dezelfde opzet als
 * de Details-tab bij een evenement. Vervangt de losse tabs Algemene gegevens
 * en Branding.
 */
export const Route = createFileRoute('/_app/organization/details')({
  component: OrganizationDetails,
})

const workspaceRoute = getRouteApi('/_app/organization')

function OrganizationDetails() {
  const router = useRouter()
  const { organization } = workspaceRoute.useRouteContext()

  const form = useZodForm({
    schema: organizationGeneralSchema,
    initialValues: {
      name: organization.name,
      description: organization.description ?? '',
      email: organization.email ?? '',
      phone: organization.phone ?? '',
      website: organization.website ?? '',
      facebook: organization.facebook ?? '',
      instagram: organization.instagram ?? '',
      tiktok: organization.tiktok ?? '',
      linkedin: organization.linkedin ?? '',
      address: organization.address ?? '',
      city: organization.city ?? '',
      country: organization.country,
    },
    onSubmit: async (values) => {
      await updateOrganizationGeneral({ data: values })
      await router.invalidate()
      toast.success('Je organisatiegegevens zijn opgeslagen.')
    },
  })

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-sm text-pretty text-muted-foreground">
        Contactgegevens en branding staan op één pagina.
      </p>

      <form className="flex flex-col gap-6" onSubmit={form.handleSubmit}>
        <FormError message={form.formError} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contactgegevens</CardTitle>
            <CardDescription>
              De naam en contactgegevens die bezoekers van je evenementen zien.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="name"
              label="Organisatienaam"
              required
              error={form.errorFor('name')}
              className="sm:col-span-2"
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.name}
                  onChange={(e) => form.setValue('name', e.target.value)}
                  onBlur={() => form.handleBlur('name')}
                />
              )}
            </FormField>

            <FormField
              id="description"
              label="Beschrijving"
              error={form.errorFor('description')}
              className="sm:col-span-2"
            >
              {(aria) => (
                <Textarea
                  {...aria}
                  rows={4}
                  value={form.values.description}
                  onChange={(e) => form.setValue('description', e.target.value)}
                  onBlur={() => form.handleBlur('description')}
                />
              )}
            </FormField>

            <FormField id="email" label="E-mail" error={form.errorFor('email')}>
              {(aria) => (
                <Input
                  {...aria}
                  type="email"
                  value={form.values.email}
                  onChange={(e) => form.setValue('email', e.target.value)}
                  onBlur={() => form.handleBlur('email')}
                />
              )}
            </FormField>

            <FormField
              id="phone"
              label="Telefoon"
              error={form.errorFor('phone')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="tel"
                  value={form.values.phone}
                  onChange={(e) => form.setValue('phone', e.target.value)}
                  onBlur={() => form.handleBlur('phone')}
                />
              )}
            </FormField>

            <FormField id="city" label="Plaats" error={form.errorFor('city')}>
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.city}
                  onChange={(e) => form.setValue('city', e.target.value)}
                  onBlur={() => form.handleBlur('city')}
                />
              )}
            </FormField>

            <FormField
              id="country"
              label="Land"
              required
              error={form.errorFor('country')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.country}
                  onChange={(e) => form.setValue('country', e.target.value)}
                  onBlur={() => form.handleBlur('country')}
                />
              )}
            </FormField>

            <FormField
              id="address"
              label="Adres"
              error={form.errorFor('address')}
              className="sm:col-span-2"
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={form.values.address}
                  onChange={(e) => form.setValue('address', e.target.value)}
                  onBlur={() => form.handleBlur('address')}
                />
              )}
            </FormField>

            <FormField
              id="website"
              label="Website"
              hint="Begin met https://"
              error={form.errorFor('website')}
              className="sm:col-span-2"
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="url"
                  placeholder="https://"
                  value={form.values.website}
                  onChange={(e) => form.setValue('website', e.target.value)}
                  onBlur={() => form.handleBlur('website')}
                />
              )}
            </FormField>
          </CardContent>
        </Card>

        <BrandingCard organization={organization} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sociale media</CardTitle>
            <CardDescription>
              Optioneel. Vul in wat van toepassing is.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['facebook', 'Facebook'],
                ['instagram', 'Instagram'],
                ['tiktok', 'TikTok'],
                ['linkedin', 'LinkedIn'],
              ] as const
            ).map(([field, label]) => (
              <FormField
                key={field}
                id={field}
                label={label}
                error={form.errorFor(field)}
              >
                {(aria) => (
                  <Input
                    {...aria}
                    type="url"
                    placeholder="https://"
                    value={form.values[field]}
                    onChange={(e) => form.setValue(field, e.target.value)}
                    onBlur={() => form.handleBlur(field)}
                  />
                )}
              </FormField>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.isSubmitting}>
            {form.isSubmitting ? 'Bezig met opslaan…' : 'Wijzigingen opslaan'}
          </Button>
        </div>
      </form>
    </div>
  )
}

type Organization = ReturnType<
  typeof workspaceRoute.useRouteContext
>['organization']

function BrandingCard({ organization }: { organization: Organization }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branding</CardTitle>
        <CardDescription>Logo en coverfoto van je organisatie.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ImageUpload
          kind="logo"
          title="Logo"
          description="Vierkant beeld werkt het beste. PNG, JPG of WebP, max 5 MB."
          currentUrl={organization.logo}
          aspect="square"
        />
        <ImageUpload
          kind="coverImage"
          title="Coverfoto"
          description="Breed beeld bovenaan je organisatiepagina. Max 5 MB."
          currentUrl={organization.coverImage}
          aspect="wide"
        />
      </CardContent>
    </Card>
  )
}

function ImageUpload({
  kind,
  title,
  description,
  currentUrl,
  aspect,
}: {
  kind: 'logo' | 'coverImage'
  title: string
  description: string
  currentUrl: string | null
  aspect: 'square' | 'wide'
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', kind)

    setUploading(true)
    try {
      await uploadOrganizationImage({ data: formData })
      await router.invalidate()
      toast.success(`${title} is bijgewerkt.`)
    } catch (error) {
      toast.error(
        errorMessage(error, 'Uploaden is niet gelukt. Probeer het opnieuw.'),
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted',
          aspect === 'square' ? 'size-16' : 'h-16 w-28',
        )}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={`${title} van de organisatie`}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 w-fit"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          {uploading
            ? 'Bezig met uploaden…'
            : currentUrl
              ? 'Vervangen'
              : 'Afbeelding kiezen'}
        </Button>
      </div>
    </div>
  )
}
