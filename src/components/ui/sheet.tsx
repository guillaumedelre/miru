import * as React from 'react'
import { Drawer } from '@base-ui/react/drawer'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function Sheet({ open, onOpenChange, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-200" />
        <Drawer.Popup className="fixed inset-0 z-50 flex flex-col bg-background outline-none duration-300 data-open:animate-in data-open:slide-in-from-bottom-full data-closed:animate-out data-closed:slide-out-to-bottom-full">
          {children}
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function SheetClose({ className, ...props }: Drawer.Close.Props) {
  return (
    <Drawer.Close
      className={cn(
        'absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary hover:bg-secondary/70 transition-colors',
        className
      )}
      {...props}
    >
      <XIcon size={16} />
      <span className="sr-only">Fermer</span>
    </Drawer.Close>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('shrink-0 px-6 pt-6 pb-4 border-b border-border', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-base font-semibold leading-none pr-10', className)} {...props} />
}

function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto', className)} {...props} />
}

export { Sheet, SheetClose, SheetHeader, SheetTitle, SheetBody }
