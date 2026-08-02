import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toast-meldingen (DESIGN_SYSTEM.md §17): kort, met kleur per soort
 * (succes groen, fout rood, info blauw). We mappen de sonner-varianten op de
 * design-tokens zodat de kleuren consistent blijven met de rest van de UI.
 */
function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group rounded-lg border bg-background text-foreground shadow-md',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          success: 'border-success/30 [&_[data-icon]]:text-success',
          error: 'border-destructive/30 [&_[data-icon]]:text-destructive',
          warning: 'border-warning/40 [&_[data-icon]]:text-warning',
          info: 'border-primary/30 [&_[data-icon]]:text-primary',
        },
      }}
    />
  )
}

export { Toaster }
export { toast } from 'sonner'
