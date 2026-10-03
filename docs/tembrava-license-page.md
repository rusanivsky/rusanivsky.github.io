# Tembrava Display licence page

## Contract

AC5 of the Tembrava Display 0.9.6 brief: publish English and Ukrainian pages
at `/tembrava/license/` and `/ua/tembrava/license/`, with working language
links, canonical/hreflang metadata and sitemap entries. Keep the portfolio's
existing typography and layout. Discoverable from the word&music case page
(`/work/wordmusic-design/`, `/ua/work/wordmusic-design/`) and the sitemap;
not linked from Info (owner decision, 3 October 2026; earlier: linked from Info).

The English EULA 1.0 (1 October 2026) is authoritative. Copy the existing
`LICENSE.txt` without changing its terms. Its original SHA-256 is
`250b40c2ffdb8a74cf54e5f506d3f7303aedac4b5eb91b95b7717d75b1e08deb`.
`data/tembrava-license.txt` is the build input; the build copies its exact bytes
to `/tembrava/license/LICENSE.txt`. No Tembrava font binaries are published.

The Ukrainian overview explains the existing licence; it is not a translated
agreement. Both pages render all 12 English EULA sections as readable prose,
with the English language declared. Defaults remain subject to the buyer's
Licence Certificate. No prices or additional rights are introduced.

## Implementation and validation

1. Independently author the AC5 acceptance tests and establish RED.
2. Add the source text and bilingual page renderer to `scripts/build.mjs`.
3. Reuse existing `prose`, `spec-list`, section and grid styles; add no CSS.
4. Run the acceptance checks, the repository's existing tests and two live
   builds, checking output identity and `git diff --check`.
5. Obtain independent acceptance and visual review, then commit, push, create
   and merge a pull request. Wait for deployment and verify the live pages,
   language links and downloadable text.

## Review log

- 1 October 2026: discovery confirmed clean checkout and
  `rusanivsky/rusanivsky.github.io` remote. Branch starts at fresh `origin/main`.
- 1 October 2026: root critic approved the implementation plan. Existing
  portfolio styling and the unchanged EULA are the accepted constraints.
- 1 October 2026: independently authored AC5 checks established RED before
  implementation; all 5 checks now pass. The 46 existing repository tests pass,
  including two byte-identical live builds. `git diff --check` is clean.
- 1 October 2026: independent acceptance critic approved the unchanged EULA,
  byte-identical download, language metadata and discoverability. The acceptance
  tests now run in CI.
- 1 October 2026: root visually approved the English mobile page: readable prose,
  no horizontal overflow. The live Ukrainian and desktop review follows deploy.
- Sitemap dates: preserve prior dates for existing routes, recording 1 October
  2026 only for the edited Info pages and new licence pages. Content detection
  was rejected because existing fixture tests temporarily rebuild modified
  content; those fixture changes must not alter the publication dates.
- 3 October 2026: owner removed the licence link from Info. The page is
  reached from the word&music case page in its language and from the
  sitemap. Acceptance test updated by an independent author.
