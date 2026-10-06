# Changelog

All notable changes to Cookie Lab are documented in this file.

## [v1.0.0] - 2026-10-07

Cookie Lab is now ready for production with complete multi-format cookie exports, fluid responsive layouts across all device sizes, and an enhanced inspection dashboard.

### Added

- Added multi-format export panel supporting Netscape (`cookies.txt`), JSON, and standard HTTP `Cookie` request headers.
- Added separate Download and Copy to clipboard actions with dynamic format dropdown selectors.
- Added inclusion filters to optionally include or exclude session and expired cookies during export.
- Added animated skeleton shimmer loading states during cookie analysis.
- Added paged carousel navigation for Domain summary and Security observations.
- Added custom slim scrollbars styled consistently across light and dark modes.
- Added container query support for the `Ctrl + Enter` shortcut badge to adapt dynamically on smaller cards.
- Added comprehensive test suites verifying Netscape, JSON, and Header string generation.

### Changed

- Refactored page layout and typography to use fluid scaling across compact desktops, tablets, and mobile viewports down to 320px.
- Replaced solid hearts in the header attribution badge and footer with the Lucide outline heart icon, styled with `text-red-500` and `animate-pulse`.
- Enhanced the light mode theme toggle pill with calibrated background tints and soft glow shadows.
- Balanced mobile action buttons (`Clear` and `Analyze`) to share equal widths with comfortable touch targets.
- Preserved sticky header behavior during scroll by eliminating restrictive overflow clipping.
- Bumped application version references to `v1.0.0` across the interface and package metadata.

### Fixed

- Fixed wrapping and crowding issues on the `Ctrl + Enter to analyze` shortcut badge across intermediate screen widths.
- Fixed layout shift and hidden label spacing above the cookie textarea.
- Fixed carousel control overlap on narrow mobile viewports by repositioning controls below section headings.
- Fixed missing interactive feedback on export and copy buttons by displaying temporary status indicators.
- Fixed horizontal page overflow across mobile and tablet viewports.

### Changelog

Full Changelog: https://github.com/zigzag-007/CookieLab/compare/v0.8.0...v1.0.0

* [e1c4e30](https://github.com/zigzag-007/CookieLab/commit/e1c4e30) feat(export): add JSON and standard HTTP Cookie header export formats @zigzag-007
* [565ecbf](https://github.com/zigzag-007/CookieLab/commit/565ecbf) feat(export): implement compact format dropdowns with download and copy actions @zigzag-007
* [3400fbd](https://github.com/zigzag-007/CookieLab/commit/3400fbd) style(ui): customize scrollbar styling and enhance light mode theme pill @zigzag-007
* [29094b3](https://github.com/zigzag-007/CookieLab/commit/29094b3) fix(responsive): balance mobile action buttons and touch targets @zigzag-007
* [f922a52](https://github.com/zigzag-007/CookieLab/commit/f922a52) docs: add comprehensive project README and badges @zigzag-007
* [6922e3d](https://github.com/zigzag-007/CookieLab/commit/6922e3d) style(ui): replace solid filled hearts in header attribution badge and footer with Lucide outline heart icon @zigzag-007

---

## [v0.8.0] - 2026-08-22

Introduced paged carousel browsing and animated skeleton loading states.

### Added

- Added paged carousels for Domain summary and Observations sections with page counters and progress bars.
- Added keyboard arrow navigation and touch swipe gestures for carousel viewports.
- Added randomized skeleton loading shimmer placeholder cards during analysis.

### Changelog

Full Changelog: https://github.com/zigzag-007/CookieLab/compare/v0.5.0...v0.8.0

* [d5226b8](https://github.com/zigzag-007/CookieLab/commit/d5226b8) feat(carousel): add paged carousel for domain summary and observations @zigzag-007
* [d7b0b42](https://github.com/zigzag-007/CookieLab/commit/d7b0b42) feat(feedback): add randomized skeleton loading shimmer during analysis @zigzag-007

---

## [v0.5.0] - 2026-07-29

Built out the full client-side analysis dashboard and state management.

### Added

- Added dashboard overview metrics for Total, Live, Session, Expired, and Domains.
- Added inventory table with row expansion to inspect detailed cookie scopes and flags.
- Added search and multi-criteria filters for status, domain, and export state.
- Added MIT license.

### Changelog

Full Changelog: https://github.com/zigzag-007/CookieLab/compare/v0.3.0...v0.5.0

* [2bfe428](https://github.com/zigzag-007/CookieLab/commit/2bfe428) feat(ui): connect application state controller and event handlers @zigzag-007
* [6c4f4c5](https://github.com/zigzag-007/CookieLab/commit/6c4f4c5) chore(license): add MIT license @zigzag-007
* [fecc7e8](https://github.com/zigzag-007/CookieLab/commit/fecc7e8) feat(layout): build responsive single-page application dashboard @zigzag-007

---

## [v0.3.0] - 2026-06-26

Styling upgrade with Tailwind CSS v4 and initial Netscape cookie export.

### Added

- Added Tailwind CSS v4 styling with oklch color palettes for light and dark themes.
- Added initial Netscape format generator with dedicated test suite.
- Added persistent dark and light theme toggle using local storage.

### Changelog

Full Changelog: https://github.com/zigzag-007/CookieLab/compare/v0.1.0...v0.3.0

* [4a613aa](https://github.com/zigzag-007/CookieLab/commit/4a613aa) feat(theme): add dark and light mode toggle with local storage persistence @zigzag-007
* [261641d](https://github.com/zigzag-007/CookieLab/commit/261641d) feat(export): add Netscape HTTP cookie format generator @zigzag-007
* [63053ec](https://github.com/zigzag-007/CookieLab/commit/63053ec) test(export): add test suite for Netscape cookies.txt output @zigzag-007
* [6b30f6a](https://github.com/zigzag-007/CookieLab/commit/6b30f6a) feat(css): add Tailwind CSS v4 styling and oklch theme system @zigzag-007

---

## [v0.1.0] - 2026-04-18

Initial foundation for local browser cookie table parsing and classification.

### Added

- Added tab-separated DevTools cookie row parser and validation.
- Added cookie lifetime estimation and security observation heuristics.
- Added kinetic canvas background and ambient glow effects.
- Added initial test suites for parser and analyzer modules.

### Changelog

* [984fc67](https://github.com/zigzag-007/CookieLab/commit/984fc67) feat(core): initialize Cookie Lab project and workspace @zigzag-007
* [98ffb90](https://github.com/zigzag-007/CookieLab/commit/98ffb90) feat(parser): add DevTools tab-separated row parser @zigzag-007
* [f3611e3](https://github.com/zigzag-007/CookieLab/commit/f3611e3) test(parser): add unit tests for cookie parsing and validation @zigzag-007
* [49cbc0f](https://github.com/zigzag-007/CookieLab/commit/49cbc0f) feat(analyzer): implement cookie lifetime and security classification @zigzag-007
* [d7d7873](https://github.com/zigzag-007/CookieLab/commit/d7d7873) test(analyzer): add tests for security observations and scopes @zigzag-007
* [923d839](https://github.com/zigzag-007/CookieLab/commit/923d839) feat(ui): add kinetic background canvas and cursor glow effect @zigzag-007
