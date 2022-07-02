import fetch from 'node-fetch'
const API_URL = 'http://ws.audioscrobbler.com/2.0/'
const toQueryString = (obj, encode = true) =>
  Object.keys(obj)
    .map((k) => `${k}=${encode ? encodeURIComponent(obj[k]) : obj[k]}`)
    .join('&')

export class FMClient {
  constructor(useragent) {
    this.userAgent = useragent
  }

  userGetRecentTracks(user, other) {
    return this.request(
      { method: 'user.getRecentTracks', user, ...other },
      'recenttracks'
    )
  }

  userGetInfo(user, other) {
    return this.request({ method: 'user.getInfo', user, ...other }, 'user')
  }

  userGetTopArtists(user, other, period = 'overall') {
    return this.request(
      { period: period, method: 'user.getTopArtists', user, ...other },
      'topartists'
    )
  }

  artistGetSimilar(options) {
    return this.request(
      { method: 'artist.getSimilar', ...options },
      'similarartists'
    )
  }

  trackGetSimilar(options) {
    return this.request(
      { method: 'track.getSimilar', ...options },
      'similartracks'
    )
  }

  trackGetInfo(options) {
    return this.request({ method: 'track.getInfo', ...options }, 'track')
  }

  albumGetInfo(options) {
    return this.request({ method: 'album.getInfo', ...options }, 'album')
  }

  artistGetInfo(options) {
    return this.request({ method: 'artist.getInfo', ...options }, 'artist')
  }

  get apiKey() {
    return {
      api_key: process.env.LFM_API_KEY
    }
  }

  request(props, obj, method = 'GET') {
    props.format = 'json'
    const body = toQueryString({ ...props, ...this.apiKey })
    const url =
      method === 'GET' ? `${API_URL}?${body}` : `${API_URL}?format=json`

    const headers = {
      'User-Agent': this.userAgent,
      'Content-Type':
        method === 'GET'
          ? 'application/json'
          : 'application/x-www-form-urlencoded'
    }
    const extra = method !== 'GET' ? { body } : {}

    return fetch(url, {
      method,
      headers,
      ...extra
    })
      .then((res) => res.text())
      .then((text) => {
        if (!text.startsWith('{')) return { error: text }
        const a = JSON.parse(text)
        return (obj && a[obj]) || a
      })
  }

  async getNPTrack(user = process.env.LFM_USERNAME) {
    const a = await this.userGetRecentTracks(user, { limit: 1, extended: 0 })
    if (a.error) return { error: a.error }
    if (!a.track?.[0]) return null

    const c = {}
    const artist = a.track[0].artist.name || a.track[0].artist['#text']

    c.artist = artist
    c.username = user

    let obj = {
      artist,
      isPlaying: a.track[0]['@attr']?.nowplaying === 'true',
      cover: (a.track[0].image[3] || a.track[0].artist.image[3])['#text']
    }

    const b = await this.trackGetInfo({ ...c, track: a.track[0].name })
    obj = {
      ...obj,
      track: a.track[0].name,
      url: a.track[0].url,
      album: a.track[0].album['#text'],
      tags: (b?.toptags?.tag || [])?.map?.((z) => z.name) || [],
      duration: parseInt(b.duration) || undefined,
      playCount: parseInt(b.userplaycount || (secUser ? 0 : -1)),
      loved: parseInt(b.userloved || 0)
    }

    if (obj.tags) obj.tags = obj.tags.map((l) => l.split('-').join('_'))
    return obj
  }
}
