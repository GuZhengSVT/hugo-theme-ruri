# Release-candidate QA

Validated 2026-09-18 using Hugo Extended 0.162.1 and Playwright Chromium 151.

## Passed
- Independent minimal / four-language / subpath builds and local link checks.
- Current working blog: 875 HTML pages and four search indexes; original source hashes unchanged.
- JavaScript syntax, LRC offset and original/translation grouping unit tests.
- Live browser: no page exceptions; playlist remains open while hovering its items; volume and order controls.
- Actual HTMLAudioElement decoding/playback/seek with generated silent WAV; audio element and playback persist during PJAX; cross-language navigation updates accessible control labels.
- Dark-theme toggle, search dialog/Escape, and no-JS archive rendering.
- Archive document widths 320/390/768/1440: no horizontal overflow.
- CSS formatting preserves cascade order; built minified CSS size unchanged (42102 bytes).

## Limits / unfinished gates
- Live configured playlist metadata loaded successfully. The WAV test verifies browser media controls, not every remote song's availability or audible output.
- Screenshots captured in local /tmp/ruri-qa. Image inspection was unavailable in this session; these are not accepted visual baselines or release screenshots.
- Lyric parsing is unit-tested; real-provider translated lyric display still needs acceptance.
- Full visual, keyboard/TOC and Safari/Firefox checks remain.
- CSS override consolidation deliberately deferred until screenshot comparisons can be inspected; only formatting was changed.

Do not describe this candidate as a fully accepted formal release.
