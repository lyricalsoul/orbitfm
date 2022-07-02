import { AutoClient } from 'discord-auto-rpc'
import { FMClient } from './fm.js'
import 'dotenv/config'

const client = new AutoClient({ transport: 'ipc' })
const fm = new FMClient('Discord RPC integration (Annoying-like)')

const fetchNowPlaying = () =>
  fm.getNPTrack().then((z) => (z.isPlaying ? z : undefined))

const updateRPC = (data, ts) => {
  let timestamp = {}
  if (data.duration) timestamp.endTimestamp = ts
  else timestamp.startTimestamp = new Date()

  client.setActivity({
    ...timestamp,
    largeImageKey: data.cover,
    largeImageText: data.artist + ' - ' + data.album,
    details: `${data.track} - ${data.artist}`,
    state: `${data.playCount} scrobble${data.playCount !== 1 ? 's' : ''}`,
    buttons: [{ label: 'Open on last.fm', url: data.url }]
  })
}

const startRPC = () => {
  console.log('...')
  client.once('ready', () => {
    console.log('RPC is ready.')
    let lastTrack, timestamp
    setInterval(async () => {
      const track = await fetchNowPlaying()
      if (!track && lastTrack) {
        console.log('Stopped playing')
        lastTrack = undefined
        timestamp = undefined
        client.clearActivity()
      } else if (lastTrack !== track.track + track.artist) {
        console.log(`Now scrobbling ${track.track} by ${track.artist}`)
        lastTrack = track.track + track.artist
        timestamp = track.duration ? Date.now() + track.duration : undefined
        updateRPC(track, timestamp)
      }
    }, 10 * 1000)
  })

  client.endlessLogin({ clientId: process.env.DISCORD_CLIENT_ID })
}

startRPC()
