import { cn } from '@/lib/utils'

export type MaskedImageVariant = 'shape1' | 'shape2' | 'shape3' | 'shape4' | 'shape5' | 'shape6'

const MASK_MAP: Record<MaskedImageVariant, string> = {
  shape1: '/mask-shape-1.svg',
  shape2: '/mask-shape-2.svg',
  shape3: '/mask-shape-3.svg',
  shape4: '/mask-shape-4.svg',
  shape5: '/mask-shape-5.svg',
  shape6: '/mask-shape-6.svg',
}

interface Props {
  src: string
  alt: string
  variant?: MaskedImageVariant
  className?: string
}

export function MaskedImage({ src, alt, variant = 'shape1', className }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn('object-cover [mask-repeat:no-repeat] [mask-size:100%_100%] [mask-position:center]', className)}
      style={{ maskImage: `url(${MASK_MAP[variant]})` }}
    />
  )
}
