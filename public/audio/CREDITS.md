# Ocean Atlas audio

All files here were generated with ElevenLabs Sound Effects (model `eleven_text_to_sound_v2`) on the
project owner's ElevenLabs account (flow `pqo52edL0YrjXqz7UvRM`, 2026-10-22). They are covered by the
ElevenLabs terms for that account's plan; they are not CC0. Processed with ffmpeg: mono, loudness-normalised,
ambience loops given a 1.5 s self-crossfade at the loop point. AAC 48–64 kbps (.m4a) plus MP3 fallback.

| file | prompt (abridged) |
|---|---|
| amb-abyss | deep abyssal ambience, low rumble, pressure creaks, dark drone, faint sonar ping |
| amb-open | open blue ocean, gentle water movement, airy ambient pad |
| amb-reef | sunlit coral reef, snapping shrimp, bubbles, warm marimba-like tones |
| amb-midwater | blue mid-water hush, ethereal glassy pad |
| amb-surface | sea surface, waves lapping, breeze, distant seabird |
| amb-twilight | twilight reef slope, muffled water, sparse clicks, slow bass pad |
| whale-song | humpback whale song |
| whale-blow | blowhole exhale spout |
| whale-breach | breach and crash splash |
| whale-lobtail | tail fluke slap |
| jaw-snap | predator fish jaw snap |
| jet-whoosh | squid jet propulsion whoosh |
| bubbles | rising bubble stream |

Other sounds (lure hum, sonar ping, glow chime, jelly pulse, sand thud, grazing crunch) and the
music pad under each ambience are synthesised live with WebAudio in `src/audio.js`.
