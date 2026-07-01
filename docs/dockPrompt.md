# AI Integration — superseded

This document tracked earlier iterations of the AI feature (DockPrompt → AIPrompt floating panel).

The current implementation uses an inline dock prompt mode with per-entry-point system messages and an embedded-card creation path. See **[docs/build/prompt.md](./build/prompt.md)** for the full reference.

`AIPrompt.jsx` / `AIPrompt.css` remain in `src/ai/` but are not mounted anywhere. The floating panel approach was replaced by the inline dock transformation described in the build doc.
