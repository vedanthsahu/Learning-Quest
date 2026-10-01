# Incident Command workspace

Open LearningQuest normally with `run.bat`, then select **Incident Command** in the sidebar or the dashboard project card.

Direct bookmark: `http://localhost:8642/#/projects/incident-command`.

The workspace imports 43 project documents from `5_Hierarchy_AI/docs` as a portable snapshot under `content/incident-command`. It contains 19 core steps and 3 optional AWS steps, with acceptance checklists, status, notes/blockers, and supporting documents. Reading a document does not complete a build task. Check the evidence and explicitly mark the step complete; change status or uncheck an item to reopen it.

Progress is stored in the existing `data.json` under `buildProjects.incident-command` using stable task IDs. Existing books, highlights, XP and challenge progress are preserved. Project completion is deliberately separate from reading XP. The normal server backup mechanism applies. Wait for **Progress saved** before closing; failed saves offer retry and an export snapshot. Export is an additional portable report, not an import/restore mechanism.

Open **Explore architecture** to reveal the cursor-responsive model; selecting a layer explains its responsibility. Task changes remain immediate, while primary-button feedback and the document opening transition provide restrained motion. Quiet motion in the architecture panel or existing preferences, plus the operating system's reduced-motion setting, suppress decorative motion. A textual architecture selector remains available without WebGL. All build controls also work with keyboard/touch.

Documents are a snapshot dated October 1, 2026, not a live filesystem link. Update the copied Markdown and `app-src/src/data/incidentDocuments.json` when importing a newer vision. Task definitions live in `app-src/src/data/incidentProject.js`; retain IDs when changing wording to preserve progress. No credentials or private environment files are imported.

Development checks:

```
cd app-src
node --test src/data/incidentProject.test.mjs
npm run lint
npm run build
```

The build updates `dist`, so the normal Python launcher serves the new workspace without Node at runtime.
