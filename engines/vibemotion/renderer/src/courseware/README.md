# Courseware renderer — contract v2

This entry consumes the **resolved-props root object** described in `collab/COURSEWARE-CONTRACT.md` (`schemaVersion: courseware/1`). It does not invoke the server, access SQLite, download materials, or synthesize speech.

Composition IDs: `Courseware`, `CoursewareCover`. Five kinds: `title`, `screenshot`, `flow`, `bullet`, `quote`. Existing local `fonts.json`, style tokens, BrowserDOMSpotlight, SubtitleTrack and Diagram's shared sketch primitives are reused. The private gallery annotation primitives are adapted without importing gallery's registerRoot.

From `engines/vibemotion/renderer`:

```powershell
npx remotion render src/courseware/index.tsx Courseware ..\..\..\out\courseware-renderer-v2\video.mp4 --codec=h264 --overwrite --props=..\..\..\out\courseware-fixture\resolved-props.json
npx remotion still src/courseware/index.tsx CoursewareCover ..\..\..\out\courseware-renderer-v2\cover.png --image-format=png --overwrite --props=..\..\..\out\courseware-fixture\resolved-props.json
```

The verifier uses the already installed local Headless Chrome explicitly and refuses to render a second video into the same output. From the studio root:

```powershell
# Input/media checks, isolated TypeScript check, one bundle, keyframes + cover only:
node engines/vibemotion/renderer/src/courseware/verify.mjs
# Also render exactly one complete video via npx Remotion, then check media and extract frames:
node engines/vibemotion/renderer/src/courseware/verify.mjs --render
# After a passing preflight, render once without repeating the keyframes:
node engines/vibemotion/renderer/src/courseware/verify.mjs --render-only
# Existing media verification only; never renders another video:
node engines/vibemotion/renderer/src/courseware/verify.mjs --verify-output
```

Output is `out/courseware-renderer-v2/`: MP4, PNG cover, five video-extracted frames, ten-frame contact sheet, layout/input/media reports and render log. Sources and fixture/staging hashes are recorded. The fixture's `27.833` seconds is accepted as millisecond-rounded metadata; playback is exactly `835/30` seconds from its frozen frame count.

Optional `audit:true` adds read-only DOM checks for the safe area, text overflow/overlap, fonts, node width/label size, edge crossings, actual screenshot-frame position and active subtitle. It does not add anything visible. All durations and edges come from resolved props. No transition shortens the frozen sequence. Audio starts at local frame zero; an absent narration creates no Audio. Explicit empty cues disable subtitles; missing cues with caption use estimated punctuation-based timing.

Source image dimensions must match the actual standardized asset. Asset/audio paths must be relative to the default public root, prefixed by the current `stagingDir`. No remote/absolute paths or cross-task references are accepted. The fixed paths used inside the screenshot wrapper adapt the existing BrowserDOMSpotlight viewport; both the gold frame and annotation use the same contain geometry. Flow uses 720px-wide boxes and 42px labels; non-adjacent frozen edges route outside boxes.

This replaces the earlier demo entry's `{storyboard:...}` input contract. The old root-level `render-courseware.mjs` remains unchanged and is not the production adapter for resolved props. Server/API/library/review/publishing integration remains DSH's work. Original independent sample videos are retained.
