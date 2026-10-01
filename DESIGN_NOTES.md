# LearningQuest project workspace refinement

The Incident Command addition inherits the existing observatory identity. This is a daily task workspace with an optional explanatory 3D view; it is not a marketing page. Existing books, mascot preferences, themes, challenges and saved learning data remain part of the app.

## References consulted

- [Impeccable by Paul Bakaus](https://github.com/pbakaus/impeccable): Operate/Read mode, hierarchy, semantic states and existing-system refinement. Applied through the installed skill's polish workflow.
- [Emil Kowalski's animation skills](https://github.com/emilkowalski/skills): motion frequency, feedback and interruptibility. Applied to primary-button press feedback, reading-overlay entry and the on-demand architecture model.
- [Taste Skill by Leonxlnx](https://github.com/Leonxlnx/taste-skill): installed for future design work. The current main skill explicitly excludes dashboards and multi-step product UI, so its landing-page choreography is not used as this app's design system.
- [Linear](https://linear.app): reference for a workspace centered on real tasks and their states. No assets or branded components copied.
- [Animations.dev](https://animations.dev): reference for explaining interaction through a usable demonstration rather than adding continuous decorative movement.

## Decisions implemented

- Compact header and real progress; no oversized marketing hero above the actual work.
- Grouped milestone navigator alongside one focused evidence panel. Status is expressed by both text and a semantic marker.
- Readable, searchable document index with a focused native-dialog reader and working internal document links.
- Existing theme tokens (`--bg`, `--bg-elevated`, `--card-border`, `--text`, `--text-dim`, `--cyan`) govern the new surface. System sans is appropriate for the operating UI; code keeps a monospace face.
- The architecture can be opened deliberately. Cursor movement and layer selection explain component responsibilities. Rendering pauses when settled, out of view or in a hidden tab. Native layer buttons provide the same meaning without WebGL or fine-pointer input.
- Primary button feedback uses a 160ms transform transition; document entry uses 200ms opacity/transform, using Emil's exponential ease-out curve. Repeated task switching is immediate. No custom cursor, universal click-ripple effect or repeated scroll entrances on functional task rows.
- OS reduced motion and LearningQuest quiet motion are respected. Responsive layout keeps evidence controls usable on touch screens; a document opens with native focus trapping and Escape dismissal.
- Project progress is self-verified and separate from reading XP. Failed saving is visible and retryable; a snapshot export is available. Documentation stays a clearly labeled portable snapshot.

## Installed skill locations

The user-level skills are `~/.codex/skills/impeccable`, `~/.codex/skills/taste-skill`, and `~/.codex/skills/animate`. No design hook was enabled. They were installed from the authors' GitHub repositories; automatic app runtime downloads are not needed.
