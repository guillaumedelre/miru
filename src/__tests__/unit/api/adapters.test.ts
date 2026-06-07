import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import { extractDisplayInfo, resolveMediaMetadata } from '@/api/adapters'
import type { AnilistMedia } from '@/api/anilist'
import type { TmdbMedia } from '@/api/tmdb'

const TMDB_BASE = 'https://api.themoviedb.org/3'

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
}

const tmdbSeries: TmdbMedia = {
  id: 1396,
  name: 'Breaking Bad',
  poster_path: '/breaking-bad.jpg',
  media_type: 'tv',
  number_of_episodes: 62,
  episode_run_time: [47],
}

const tmdbMovie: TmdbMedia = {
  id: 550,
  title: 'Fight Club',
  poster_path: '/fight-club.jpg',
  media_type: 'movie',
  runtime: 139,
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
    it('extracts episodes as totalEpisodes', async () => {
      const meta = await resolveMediaMetadata(anilistMedia, 'anime')
      expect(meta.totalEpisodes).toBe(25)
    })

    it('falls back to chapters when episodes is null', async () => {
      const manga = { ...anilistMedia, episodes: null, chapters: 100 }
      const meta = await resolveMediaMetadata(manga, 'anime')
      expect(meta.totalEpisodes).toBe(100)
    })

    it('sets isFinished=true for status FINISHED', async () => {
      const meta = await resolveMediaMetadata(anilistMedia, 'anime')
      expect(meta.isFinished).toBe(true)
    })

    it('sets isFinished=true for status CANCELLED', async () => {
      const cancelled = { ...anilistMedia, status: 'CANCELLED' }
      const meta = await resolveMediaMetadata(cancelled, 'anime')
      expect(meta.isFinished).toBe(true)
    })

    it('sets isFinished=false for status RELEASING', async () => {
      const releasing = { ...anilistMedia, status: 'RELEASING' }
      const meta = await resolveMediaMetadata(releasing, 'anime')
      expect(meta.isFinished).toBe(false)
    })

    it('extracts malId from idMal', async () => {
      const meta = await resolveMediaMetadata(anilistMedia, 'anime')
      expect(meta.malId).toBe(16498)
    })

    it('omits malId when idMal is null', async () => {
      const noMal = { ...anilistMedia, idMal: null }
      const meta = await resolveMediaMetadata(noMal, 'anime')
      expect(meta.malId).toBeUndefined()
    })

    it('extracts duration as episodeDuration', async () => {
      const meta = await resolveMediaMetadata(anilistMedia, 'anime')
      expect(meta.episodeDuration).toBe(24)
    })

    it('omits episodeDuration when duration is null', async () => {
      const noDuration = { ...anilistMedia, duration: null }
      const meta = await resolveMediaMetadata(noDuration, 'anime')
      expect(meta.episodeDuration).toBeUndefined()
    })

    it('returns type = anime and source = anilist', async () => {
      const meta = await resolveMediaMetadata(anilistMedia, 'anime')
      expect(meta.type).toBe('anime')
      expect(meta.source).toBe('anilist')
    })
  })

  describe('series tab (TMDB)', () => {
    it('calls getTvSeasons and sums episode_count for totalEpisodes', async () => {
      server.use(
        http.get(`${TMDB_BASE}/tv/:id`, () =>
          HttpResponse.json({
            name: 'BB', overview: '', poster_path: '/', backdrop_path: null, genres: [],
            vote_average: 9, number_of_seasons: 1, number_of_episodes: 62,
            first_air_date: '2008-01-20', status: 'Ended',
            seasons: [
              { season_number: 1, episode_count: 7, name: 'S1' },
              { season_number: 2, episode_count: 13, name: 'S2' },
            ],
          })
        )
      )
      const meta = await resolveMediaMetadata(tmdbSeries, 'series')
      expect(meta.totalEpisodes).toBe(20)
    })

    it('sets isFinished=true when status is Ended', async () => {
      const meta = await resolveMediaMetadata(tmdbSeries, 'series')
      expect(meta.isFinished).toBe(true)
    })

    it('sets isFinished=false when status is Returning Series', async () => {
      server.use(
        http.get(`${TMDB_BASE}/tv/:id`, () =>
          HttpResponse.json({
            name: 'BB', overview: '', poster_path: '/', backdrop_path: null, genres: [],
            vote_average: 9, number_of_seasons: 1, number_of_episodes: 10,
            first_air_date: '2020-01-01', status: 'Returning Series',
            seasons: [{ season_number: 1, episode_count: 10, name: 'S1' }],
          })
        )
      )
      const meta = await resolveMediaMetadata(tmdbSeries, 'series')
      expect(meta.isFinished).toBe(false)
    })

    it('extracts episode_run_time[0] as episodeDuration', async () => {
      const meta = await resolveMediaMetadata(tmdbSeries, 'series')
      expect(meta.episodeDuration).toBe(47)
    })

    it('omits episodeDuration when episode_run_time is absent', async () => {
      const noRuntime = { ...tmdbSeries, episode_run_time: undefined }
      const meta = await resolveMediaMetadata(noRuntime, 'series')
      expect(meta.episodeDuration).toBeUndefined()
    })

    it('returns type = series and source = tmdb', async () => {
      const meta = await resolveMediaMetadata(tmdbSeries, 'series')
      expect(meta.type).toBe('series')
      expect(meta.source).toBe('tmdb')
    })
  })

  describe('movie tab (TMDB)', () => {
    it('sets isFinished=true', async () => {
      const meta = await resolveMediaMetadata(tmdbMovie, 'movie')
      expect(meta.isFinished).toBe(true)
    })

    it('extracts runtime as episodeDuration', async () => {
      const meta = await resolveMediaMetadata(tmdbMovie, 'movie')
      expect(meta.episodeDuration).toBe(139)
    })

    it('omits episodeDuration when runtime is absent', async () => {
      const noRuntime = { ...tmdbMovie, runtime: undefined }
      const meta = await resolveMediaMetadata(noRuntime, 'movie')
      expect(meta.episodeDuration).toBeUndefined()
    })

    it('returns type = movie and source = tmdb', async () => {
      const meta = await resolveMediaMetadata(tmdbMovie, 'movie')
      expect(meta.type).toBe('movie')
      expect(meta.source).toBe('tmdb')
    })

    it('totalEpisodes is undefined for movies', async () => {
      const meta = await resolveMediaMetadata(tmdbMovie, 'movie')
      expect(meta.totalEpisodes).toBeUndefined()
    })
  })
})
