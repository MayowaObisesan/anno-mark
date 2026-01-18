Product Requirements Document (PRD): Full‑Page Capture + Smart Annotation (Chrome MV3)

1. Product Summary

A Chrome extension that reliably captures full‑page screenshots across modern websites, opens an in‑browser editor, and provides smart annotation tools (blur/redact, arrows, text, shapes, freehand), with high‑quality export and optional team workflows. Built on Manifest V3 with minimal permissions, strong privacy posture, and monetization via premium features.

2. Goals

- High‑fidelity capture: Accurate full‑page stitching with devicePixelRatio handling, minimal seams, and robust performance on tall pages.

- Fast, intuitive annotation: Essential tools with smooth interaction, layering, undo/redo, and clean exports for professional use.

- Privacy‑first: No hidden data collection; all processing local by default.

- MV3‑compliant architecture: Service worker orchestration, minimal permissions, single‑purpose utility.

- Extensibility: Clear interfaces to add premium features (multi‑page capture, cloud sync, collaboration).

3. Non‑Goals

- Web automation (e.g., scraping beyond the capture pipeline).

- Editing beyond annotation basics (no Photoshop‑level features).

- Cross‑browser parity at v1 (focus on Chrome).

4. Target Users

- Product managers, UX/designers, QA engineers, developers capturing page states and annotating feedback.

- Content creators producing walkthroughs/tutorials.

- Customer‑facing roles needing redacted evidence or step‑by‑step visuals.

5. User Stories

- As a PM, I capture a full page and mark three areas with arrows and blur sensitive content, then export a PNG.

- As a QA, I capture a dynamic page (sticky header) with no seams and annotate with rectangles and text.

- As a developer, I quickly capture tall pages, annotate, and copy to clipboard with minimal friction.

6. Scope and Feature List (v1)

- Trigger capture from popup button.

- Full‑page capture via scroll‑and‑stitch; fallback via html2canvas for restricted contexts.

- Smart annotation tools: arrow, rectangle, ellipse, freehand, text, blur/redaction.

- Layered actions with undo/redo.

- Export to PNG (and JPEG), file naming scheme, optional copy‑to‑clipboard.

- Local persistence of last capture and last settings.

- Minimal settings: color, stroke size, text size, export format.

- Basic onboarding note/tooltips.

7. Constraints and Assumptions

- Manifest V3 service worker lifecycle constraints; avoid long‑running state in background.

- captureVisibleTab may fail on certain Chrome pages/contexts; must fallback gracefully.

- DevicePixelRatio differences and zoom levels must be normalized for alignment.

- No network access in v1 (unless explicitly toggled for optional features later).

8. Success Metrics

- Technical: Capture success rate >95% across top site archetypes; stitch seam errors <1% reports.

- UX: Time to first annotated export <30 seconds for new users.

- Quality: Export fidelity (dimensions, clarity) matches page height within 1% tolerance.

- Adoption: Day‑7 retention of active users >25% in early cohorts (post‑launch).

9. UX Requirements

- Popup: One primary CTA “Capture Full Page”; brief helper note.

- Editor: Fixed top toolbar with tool selector, color picker, size input, Undo/Redo, Export. Canvas area scrolls with captured image.

- Interaction:

▫ Click‑drag for shapes/blur regions.

▫ Arrow draws line with head; text uses inline input field with Enter to commit.

▫ Freehand draws with continuous stroke.

- Feedback: Progress indicator during capture; error toast when fallback is used or when capture fails.

- Accessibility: Keyboard support for undo/redo (Ctrl/Cmd+Z/Y), Enter to commit text, Esc to cancel text/edit.

10. Technical Architecture (MV3)

- Manifest: MV3 with action popup, service worker background, “activeTab”, “scripting”, “storage”, and “tabs” permissions; host_permissions: <all_urls>.

- Service worker (background): Orchestrates capture steps; invokes content script to compute plan and scroll; calls captureVisibleTab; stitches images using OffscreenCanvas; persists result in chrome.storage.local; opens editor.

- Content script (capture): Computes document metrics, scroll plan, performs precise scrolling, and executes html2canvas fallback slice with viewport cropping.

- Editor page: Loads last capture, manages layers/actions, performs annotation rendering, and exports flattened image.

- Storage: chrome.storage.local keys for lastCapture, settings (color, size, format).

11. Full‑Page Capture Algorithm

- Read document metrics: scrollHeight, scrollWidth, viewportH/W, devicePixelRatio.

- Plan steps:

▫ Use viewport height minus overlap (≈30px) increment to generate scroll positions covering full height.

▫ Compute offsetY in physical pixels per step using devicePixelRatio.

- Execution loop:

a. Scroll to step.scrollY (instant).

b. Delay ~120ms for layout/resources to settle.

c. Try chrome.tabs.captureVisibleTab(format: png).

d. If capture fails or page context is restricted, request content fallbackSlice(viewport) via html2canvas, cropped to current viewport.

e. Append piece with dataUrl + offsetY.

- Stitch:

▫ Create OffscreenCanvas(width=scrollWidthdpr, height=scrollHeightdpr).

▫ For each piece, drawImage at (0, offsetY).

▫ Export blob → dataURL (PNG).

- Edge handling:

▫ Overlap reduces seam artifacts; last segment clamps to total height.

▫ Normalize using dpr to ensure accurate final dimensions.

▫ Optional blending across overlaps (future enhancement).

12. Annotation Engine

- Two stacked canvases: base (captured image + committed actions) and overlay (live preview during drawing).

- Action model: array of actions {tool, color, size, startX, startY, endX, endY, text?}.

- Tools:

▫ Arrow: line + polygon head with angle calculation.

▫ Rectangle/Ellipse: stroke shapes from drag bounds.

▫ Freehand: v1 simplified line; v1.1 expands to path collection.

▫ Text: positioned input, committed to actions with font scaling from size.

▫ Blur: region downscale+upscale approximation; v1.1 add Gaussian kernel pass for higher fidelity.

- Undo/Redo: stack operations; redraw base from original image + replayed actions.

- Export: compose to new canvas, draw base image, apply actions; toDataURL PNG/JPEG; trigger download; optional clipboard write.

13. Data Model

- Settings: { color: string, size: number, format: ‘png’|‘jpeg’ }.

- Capture: { lastCapture: dataURL }.

- Future premium: { projects, cloudSync, history }.

14. Permissions and Security

- Permissions: activeTab, tabs, scripting, storage, host_permissions=<all_urls>.

- No code obfuscation; readable packaged code.

- No background affiliate injection or ad modification.

- Export/download client‑side; no collection of browsing history.

- Clear privacy policy stating single‑purpose and Limited Use compliance when applicable.

15. Edge Cases and Handling

- Sticky headers/footers: overlap reduces seam visibility; consider optional detection of fixed elements for dynamic overlap tuning in v1.1.

- Very tall pages: memory constraints; stream stitching (OffscreenCanvas) and warn if exceeding safe dimensions; fallback to segment capture if needed.

- Zoom levels: rely on devicePixelRatio; test at common zooms (80–125%).

- Media and canvas‑heavy sites: fallback slice may not render video frames; inform users.

- Chrome internal pages/PDF viewer: handle failure gracefully with messaging.

- Cross‑origin images without CORS: html2canvas may skip; show notice.

16. Performance Requirements

- Capture time: <3s for typical pages (~5000px height); <10s for very tall pages (~20000px), dependent on machine.

- Memory usage: aim <200MB during stitching for tall pages; free arrays promptly; revoke Blob URLs.

- Editor responsiveness: 60fps interaction on 1080p‑height images; degrade gracefully for extremely large canvases.

17. Telemetry (optional, local and anonymous)

- Local counters: capture attempts, success/failure reason, time to export.

- Opt‑in remote telemetry in premium tier only; never collect URLs or page content. Disabled by default.

18. Monetization Plan (post‑MVP)

- Free: full‑page capture, core annotation, PNG export.

- Premium:

▫ Multi‑page/batch capture, smart redaction presets, team collaboration (comment pins), cloud history and sharing, JPEG/WEBP with quality settings, clipboard and custom templates.

- Billing integration: Stripe/ExtPay; gate premium UI features via paid status checks; maintain single‑purpose disclosure and clear refund policy.

19. Release Plan

- v0.1 (Internal prototype): Capture + stitch + editor minimal tools; manual tests on 20 sites.

- v0.5 (Beta): Robust stitching, five tools, undo/redo, PNG export; edge case handling; performance tuning.

- v1.0 (Public): Polished UI, failure messaging, JPEG export, settings persistence, store listing assets and privacy policy.

- v1.1: Better blur kernel, freehand path recording, overlap blending.

- v1.2: Multi‑page capture (premium), clipboard export.

20. QA Plan

- Functional:

▫ Capture across site types: news, e‑commerce, docs, dashboards, infinite scroll pages.

▫ Validate final image dimensions vs DOM scrollHeight*DPR.

- Visual:

▫ Inspect seams at overlap boundaries; test sticky header pages.

▫ Verify annotation alignment at multiple zooms.

- Performance:

▫ Measure capture duration and memory across heights (5k, 10k, 20k px).

- Regression:

▫ Ensure service worker wake/idle events don’t break capture loop; retry logic.

- Accessibility:

▫ Keyboard shortcuts, focus management for text tool, color contrast in toolbar.

21. Risks and Mitigations

- Risk: captureVisibleTab incompatibilities.

▫ Mitigation: robust fallback via html2canvas; clear user messaging.

- Risk: memory pressure with extremely tall pages.

▫ Mitigation: streaming draw, segment export, warn users; configurable max height.

- Risk: MV3 service worker lifecycle interrupts long operations.

▫ Mitigation: keep operations short per step, rely on event‑driven messaging; avoid long synchronous tasks; re‑wake via messaging as needed.

- Risk: Policy violations (data collection, deceptive behavior).

▫ Mitigation: single‑purpose, minimal permissions, transparent listing, no ads/affiliates.

22. Store Listing Requirements

- Clear description of single purpose: “Capture full‑page screenshots and annotate.”

- Screenshots of capture and editor.

- Permissions rationale: explain activeTab/tabs/scripting/storage.

- Privacy policy: local processing, no browsing history collection, no external calls in free tier.

23. Engineering Breakdown (Tasks)

- Manifest and scaffolding (MV3).

- Popup UI + messaging to background.

- Content script: metrics, plan, scroll, fallback slice.

- Background: orchestration, capture loop, stitching, storage, open editor.

- Editor: canvas stack, tools, actions, export, settings.

- Error handling and toasts.

- Performance profiling and memory tuning.

- Packaging assets and store metadata.

- Automated tests (where feasible) + manual test matrix.

24. Acceptance Criteria (v1.0)

- Captures full page on 90%+ of tested sites with no major seams.

- Provides arrow/rect/ellipse/freehand/text/blur tools with undo/redo.

- Exports PNG with correct dimensions and visible annotations.

- Handles restricted contexts with fallback or user messaging.

- Passes MV3 packaging and store submission checks (no obfuscation, accurate disclosures).

This PRD outlines a buildable, policy‑compliant plan that gets you to a robust v1 and leaves room for premium features without compromising the single‑purpose utility or privacy posture.
