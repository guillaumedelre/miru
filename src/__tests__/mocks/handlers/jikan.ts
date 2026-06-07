import { http, HttpResponse } from 'msw'

const BASE = 'https://api.jikan.moe/v4'

export const mockJikanMedia = {
  mal_id: 16498,
  title: 'Shingeki no Kyojin',
  images: { jpg: { image_url: 'https://cdn.myanimelist.net/cover.jpg' } },
  episodes: 25,
  type: 'TV',
}

export const mockJikanEpisode = {
  mal_id: 1,
  title: 'To You, in 2000 Years',
}

export const jikanHandlers = [
  http.get(`${BASE}/anime`, () =>
    HttpResponse.json({ data: [mockJikanMedia] })
  ),

  http.get(`${BASE}/anime/:id/episodes`, () =>
    HttpResponse.json({
      data: [mockJikanEpisode],
      pagination: { last_visible_page: 1 },
    })
  ),

  http.get(`${BASE}/manga`, () =>
    HttpResponse.json({ data: [mockJikanMedia] })
  ),
]
