import { http, HttpResponse } from 'msw'

const BASE = 'https://api.themoviedb.org/3'

export const mockTmdbSeries = {
  id: 1396,
  name: 'Breaking Bad',
  poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  media_type: 'tv' as const,
  number_of_episodes: 62,
}

export const mockTmdbMovie = {
  id: 550,
  title: 'Fight Club',
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  media_type: 'movie' as const,
  runtime: 139,
}

export const mockTmdbTvDetails = {
  name: 'Breaking Bad',
  overview: 'A chemistry teacher turns drug lord.',
  poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
  genres: [{ id: 18, name: 'Drama' }],
  vote_average: 9.5,
  number_of_seasons: 5,
  number_of_episodes: 62,
  first_air_date: '2008-01-20',
  status: 'Ended',
  seasons: [{ season_number: 1, episode_count: 7, name: 'Season 1' }],
}

export const mockTmdbMovieDetails = {
  title: 'Fight Club',
  overview: 'A mind-bending thriller.',
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  backdrop_path: null,
  genres: [{ id: 28, name: 'Action' }],
  vote_average: 8.4,
  runtime: 139,
  release_date: '1999-10-15',
}

export const mockTmdbEpisode = {
  episode_number: 1,
  name: 'Pilot',
  air_date: '2008-01-20',
  season_number: 1,
}

export const tmdbHandlers = [
  http.get(`${BASE}/search/multi`, () =>
    HttpResponse.json({ results: [mockTmdbSeries, mockTmdbMovie], page: 1, total_pages: 1 })
  ),

  http.get(`${BASE}/search/tv`, () =>
    HttpResponse.json({ results: [mockTmdbSeries], page: 1, total_pages: 2 })
  ),

  http.get(`${BASE}/search/movie`, () =>
    HttpResponse.json({ results: [mockTmdbMovie], page: 1, total_pages: 1 })
  ),

  http.get(`${BASE}/tv/:id/season/:season/episode/:ep`, () =>
    HttpResponse.json(mockTmdbEpisode)
  ),

  http.get(`${BASE}/tv/:id/season/:season`, () =>
    HttpResponse.json({ episodes: [mockTmdbEpisode] })
  ),

  http.get(`${BASE}/tv/:id/watch/providers`, () =>
    HttpResponse.json({
      results: {
        FR: {
          link: 'https://www.netflix.com',
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }],
        },
      },
    })
  ),

  http.get(`${BASE}/movie/:id/watch/providers`, () =>
    HttpResponse.json({
      results: {
        FR: {
          link: 'https://www.netflix.com',
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }],
        },
      },
    })
  ),

  http.get(`${BASE}/tv/:id`, () =>
    HttpResponse.json(mockTmdbTvDetails)
  ),

  http.get(`${BASE}/movie/:id`, () =>
    HttpResponse.json(mockTmdbMovieDetails)
  ),
]
