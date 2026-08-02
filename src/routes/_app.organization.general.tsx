import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'

import { updateOrganizationGeneral } from '#/server/organization.ts'
import { organizationGeneralSchema } from '#/lib/validation/organization.ts'
import { useZodForm } from '#/lib/use-zod-form.ts'
import { toast } from '#/components/ui/sonner.tsx'
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

export const Route = createFileRoute('/_app/organization/general')({
  component: OrganizationGeneral,
})

const workspaceRoute = getRouteApi('/_app/organization')

function OrganizationGeneral() {
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
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit}>
      <FormError message={form.formError} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Algemeen</CardTitle>
          <CardDescription>
            De naam en beschrijving die bezoekers van je evenementen zien.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            id="name"
            label="Naam"
            required
            error={form.errorFor('name')}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
          <CardDescription>
            Hoe bezoekers en klanten je kunnen bereiken.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="email"
            label="E-mailadres"
            error={form.errorFor('email')}
          >
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
            label="Telefoonnummer"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adres</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Bezig met opslaan…' : 'Wijzigingen opslaan'}
        </Button>
      </div>
    </form>
  )
}
