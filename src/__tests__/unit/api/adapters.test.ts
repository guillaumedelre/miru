import { extractDisplayInfo, resolveMediaMetadata } from '@/api/adapters'
import type { AnilistMedia } from '@/api/anilist'
import type { TmdbMedia } from '@/api/tmdb'

const anilistMedia: AnilistMedia = {
  id: 101,
  idMal: 16498,
  title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
  coverImage: { large: 'https://cdn.anilist.co/cover.jpg' },
  episodes: 25,
  chapters: null,
  duration: 24,
  type: 'ANIME',
  status: 'FINISHED',
  nextAiringEpisode: null,
  _source: 'anilist',
}

const tmdbSeries: TmdbMedia = {
  id: 1396,
  name: 'Breaking Bad',
  poster_path: '/breaking-bad.jpg',
  media_type: 'tv',
  number_of_episodes: 62,
  episode_run_time: [47],
  _source: 'tmdb',
}

const tmdbMovie: TmdbMedia = {
  id: 550,
  title: 'Fight Club',
  poster_path: '/fight-club.jpg',
  media_type: 'movie',
  runtime: 139,
  _source: 'tmdb',
}

describe('extractDisplayInfo', () => {
  describe('AniList media', () => {
    it('uses english title when available', () => {
      const { title } = extractDisplayInfo(anilistMedia)
      expect(title).toBe('Attack on Titan')
    })

    it('falls back to romaji when english is null', () => {
      const noEnglish = { ...anilistMedia, title: { romaji: 'Shingeki no Kyojin', english: null } }
      const { title } = extractDisplayInfo(noEnglish)
      expect(title).toBe('Shingeki no Kyojin')
    })

    it('uses coverImage.large as image', () => {
      const { image } = extractDisplayInfo(anilistMedia)
      expect(image).toBe('https://cdn.anilist.co/cover.jpg')
    })

    it('returns source = anilist', () => {
      expect(extractDisplayInfo(anilistMedia).source).toBe('anilist')
    })
  })

  describe('TMDB series', () => {
    it('uses name as title', () => {
      expect(extractDisplayInfo(tmdbSeries).title).toBe('Breaking Bad')
    })

    it('builds full poster URL from path', () => {
      expect(extractDisplayInfo(tmdbSeries).image).toBe('https://image.tmdb.org/t/p/w300/breaking-bad.jpg')
    })

    it('returns source = tmdb', () => {
      expect(extractDisplayInfo(tmdbSeries).source).toBe('tmdb')
    })
  })

  describe('TMDB movie', () => {
    it('uses title when name is absent', () => {
      expect(extractDisplayInfo(tmdbMovie).title).toBe('Fight Club')
    })

    it('uses placeholder when poster_path is null', () => {
      const noPoster = { ...tmdbMovie, poster_path: null }
      expect(extractDisplayInfo(noPoster).image).toBe('/placeholder.png')
    })
  })
})

describe('resolveMediaMetadata', () => {
  describe('anime tab (AniList)', () => {
    it('extracts episodes as totalEpisodes', () => {
      expect(resolveMediaMetadata(anilistMedia, 'anime').totalEpisodes).toBe(25)
    })

    it('falls back to chapters when episodes is null', () => {
      const manga = { ...anilistMedia, episodes: null, chapters: 100 }
      expect(resolveMediaMetadata(manga, 'anime').totalEpisodes).toBe(100)
    })

    it('sets isFinished=true for status FINISHED', () => {
      expect(resolveMediaMetadata(anilistMedia, 'anime').isFinished).toBe(true)
    })

    it('sets isFinished=true for status CANCELLED', () => {
      const cancelled = { ...anilistMedia, status: 'CANCELLED' }
      expect(resolveMediaMetadata(cancelled, 'anime').isFinished).toBe(true)
    })

    it('sets isFinished=false for status RELEASING', () => {
      const releasing = { ...anilistMedia, status: 'RELEASING' }
      expect(resolveMediaMetadata(releasing, 'anime').isFinished).toBe(false)
    })

    it('extracts malId from idMal', () => {
      expect(resolveMediaMetadata(anilistMedia, 'anime').malId).toBe(16498)
    })

    it('omits malId when idMal is null', () => {
      const noMal = { ...anilistMedia, idMal: null }
      expect(resolveMediaMetadata(noMal, 'anime').malId).toBeUndefined()
    })

    it('extracts duration as episodeDuration', () => {
      expect(resolveMediaMetadata(anilistMedia, 'anime').episodeDuration).toBe(24)
    })

    it('omits episodeDuration when duration is null', () => {
      const noDuration = { ...anilistMedia, duration: null }
      expect(resolveMediaMetadata(noDuration, 'anime').episodeDuration).toBeUndefined()
    })

    it('returns type = anime and source = anilist', () => {
      const meta = resolveMediaMetadata(anilistMedia, 'anime')
      expect(meta.type).toBe('anime')
      expect(meta.source).toBe('anilist')
    })
  })

  describe('series tab (TMDB)', () => {
    const endedTv = {
      seasons: [{ episode_count: 7 }, { episode_count: 13 }],
      isFinished: true,
    }
    const ongoingTv = {
      seasons: [{ episode_count: 10 }],
      isFinished: false,
    }

    it('sums season episode_count for totalEpisodes when tvDetails provided', () => {
      const meta = resolveMediaMetadata(tmdbSeries, 'series', endedTv)
      expect(meta.totalEpisodes).toBe(20)
    })

    it('falls back to number_of_episodes when tvDetails is null', () => {
      const meta = resolveMediaMetadata(tmdbSeries, 'series', null)
      expect(meta.totalEpisodes).toBe(62)
    })

    it('sets isFinished=true from tvDetails', () => {
      expect(resolveMediaMetadata(tmdbSeries, 'series', endedTv).isFinished).toBe(true)
    })

    it('sets isFinished=false from tvDetails', () => {
      expect(resolveMediaMetadata(tmdbSeries, 'series', ongoingTv).isFinished).toBe(false)
    })

    it('sets isFinished=false when tvDetails is null', () => {
      expect(resolveMediaMetadata(tmdbSeries, 'series', null).isFinished).toBe(false)
    })

    it('extracts episode_run_time[0] as episodeDuration', () => {
      expect(resolveMediaMetadata(tmdbSeries, 'series', endedTv).episodeDuration).toBe(47)
    })

    it('omits episodeDuration when episode_run_time is absent', () => {
      const noRuntime = { ...tmdbSeries, episode_run_time: undefined }
      expect(resolveMediaMetadata(noRuntime, 'series', endedTv).episodeDuration).toBeUndefined()
    })

    it('returns type = series and source = tmdb', () => {
      const meta = resolveMediaMetadata(tmdbSeries, 'series', endedTv)
      expect(meta.type).toBe('series')
      expect(meta.source).toBe('tmdb')
    })
  })

  describe('movie tab (TMDB)', () => {
    it('sets isFinished=true', () => {
      expect(resolveMediaMetadata(tmdbMovie, 'movie').isFinished).toBe(true)
    })

    it('extracts runtime as episodeDuration', () => {
      expect(resolveMediaMetadata(tmdbMovie, 'movie').episodeDuration).toBe(139)
    })

    it('omits episodeDuration when runtime is absent', () => {
      const noRuntime = { ...tmdbMovie, runtime: undefined }
      expect(resolveMediaMetadata(noRuntime, 'movie').episodeDuration).toBeUndefined()
    })

    it('returns type = movie and source = tmdb', () => {
      const meta = resolveMediaMetadata(tmdbMovie, 'movie')
      expect(meta.type).toBe('movie')
      expect(meta.source).toBe('tmdb')
    })

    it('totalEpisodes is undefined for movies', () => {
      expect(resolveMediaMetadata(tmdbMovie, 'movie').totalEpisodes).toBeUndefined()
    })
  })
})
