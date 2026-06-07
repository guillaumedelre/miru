import type { MediaType, Status } from '@/types'

export const TYPE_LABEL: Record<MediaType, string> = {
  anime: 'Anime',
  series: 'Série',
  movie: 'Film',
}

export const TYPE_LABEL_PLURAL: Record<MediaType, string> = {
  anime: 'Animes',
  series: 'Séries',
  movie: 'Films',
}

export const STATUS_LABEL: Record<Status, string> = {
  watching: 'En cours',
  completed: 'Terminé',
  plan_to_watch: 'À voir',
}
