import * as React from 'react'
import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { ImageIcon, Upload } from 'lucide-react'

import { uploadOrganizationImage } from '#/server/upload.ts'
import { toast } from '#/components/ui/sonner.tsx'
import { cn } from '#/lib/utils.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Button } from '#/components/ui/button.tsx'

export const Route = createFileRoute('/_app/organization/branding')({
  component: OrganizationBranding,
})

const workspaceRoute = getRouteApi('/_app/organization')

function OrganizationBranding() {
  const { organization } = workspaceRoute.useRouteContext()

  return (
    <div className="flex flex-col gap-4">
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
    </div>
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
    // Reset zodat hetzelfde bestand opnieuw gekozen kan worden.
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
        error instanceof Error
          ? error.message
          : 'Uploaden is niet gelukt. Probeer het opnieuw.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted',
            aspect === 'square' ? 'size-24' : 'h-24 w-40',
          )}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={`${title} van de organisatie`}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2">
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
      </CardContent>
    </Card>
  )
}
