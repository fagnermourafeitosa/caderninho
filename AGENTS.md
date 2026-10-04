# Project Guidelines

Caderninho is a local-first Electron desktop app (macOS) for notes, checklists, reminders and daily pages. Data lives in SQLite and local media files under the Electron `userData` directory. There are no accounts and no cloud sync.

## Language
- Always write documentation, instructions, comments, and project specifications in English.

## Code Creation Workflow
- **Spec-Driven Execution**: Execution must ALWAYS be based on formal specifications. NEVER generate `Walkthrough` or create/use `Implementation Plan` native artifacts. Use the workflow defined below.
- **Zero Inference & Zero Guesswork Policy**: The agent MUST NEVER assume, infer, guess, or anticipate requirements, scope, or domain models not explicitly detailed in the approved specification. Whenever ambiguity arises, information is missing, or an assumption would otherwise be made, the agent MUST STOP and explicitly ask the user for clarification before taking any action or writing code.
- **No Fallbacks & Zero Retrocompatibility (Pre-Production Stage)**: This project is in active initial development and is NOT in production. The agent MUST NOT write temporary bridges, legacy adapters, dual code paths, or ceremonial fallbacks to preserve backwards compatibility with previous iterations. When modifying an architectural boundary, IPC contract, state machine, or SQLite schema, refactor cleanly, decisively, and directly. When in doubt, ask the user, but the default directive is zero backwards compatibility.
- **Development Data vs. Production**: test fixtures, seed notes, smoke-test data and screenshot examples are placeholder data, not product decisions. Never report a development value as a product defect or propose a specification to rename it; check first whether it lives only in development data.
- **Skill Location**: Project skills are located in `.agents/skills/`. Before declaring a required skill unavailable, inspect that directory (including hidden paths) and read its `SKILL.md` or `SKILLS.md`. This includes `to-spec`, `grilling`, `tdd`.
- **Planning & Stress-Testing**: Any code creation must follow and apply the `/grilling` skill to challenge assumptions and thoroughly refine the plan and requirements.
- **TDD Implementation**: Always use the `/tdd` skill during implementation. UI tests are allowed and run as Electron smoke tests (scenarios in `tests/*-smoke.js`, runner in `tests/smoke/`, `npm run test:app`).
  - Strictly follow the Red-Green-Refactor cycle sequentially without skipping steps or running them in parallel.
  - Enforce each Red-Green cycle sequentially: write and run the failing test before changing the corresponding implementation. Multiple complete Red-Green cycles may run consecutively in the same agent turn. Never alter implementation files before or concurrently with their failing test.
- **Defect & Bug Resolution Policy**: Whenever a bug, edge case, regression, or implementation defect is identified, the agent MUST ALWAYS write a failing unit/integration test demonstrating the problem first (Red phase) before altering any implementation code or applying a fix.
- **Specification Generation & Maintenance**: All features and entities must have their specifications maintained and created through the `to-spec` skill.
- **Specification Lifecycle & Status Tracking**:
  - Every specification must use exactly one of:
    ```text
    Not Implemented
    In Progress
    Waiting Approve
    Implemented
    ```
  - Lifecycle transitions:
    ```text
    Not Implemented -> In Progress
    In Progress -> Waiting Approve
    Waiting Approve -> Implemented
    ```
  - When starting execution on a spec: `Not Implemented -> In Progress`.
  - When code is complete and all required verification passes: `In Progress -> Waiting Approve`.
  - When implementation reaches `Waiting Approve`, report:
    * files created or changed;
    * implemented behavior;
    * tests executed;
    * quality checks executed;
    * relevant deviations from the specification.
  - Only transition status from `Waiting Approve -> Implemented` after explicit user approval. Do not mark a specification as `Implemented` automatically.
  - An `Implemented` specification is a historical record and is never edited. A behavior change goes in a new specification that supersedes it; new context goes in the documentation (README, `docs/`).
  - When specifications conflict, the most recent one (by the date in its file name, then by ID) prevails, whether or not it names the earlier one. An older specification is never read as current behavior without checking the newer specifications and the code.
- **Formal Code Reviewer Gate**:
  Upon completing the implementation of any specification or code change (with unit tests and quality checks passing), the agent **MUST** trigger the formal Code Reviewer step before requesting approval or awaiting new orders. The flow strictly follows 4 steps:
  1. **Implementation Report**:
     Objectively report what was built (files created/changed, behavior implemented, and checks executed).
  2. **Explicit Reviewer Signaling**:
     The agent must formally signal the stance transition to the user:
     > *"As a code reviewer, I will critically analyze the generated implementation to identify weaknesses, concurrency/leak issues, edge cases, contracts, and technical improvement opportunities."*
  3. **Descriptive Diagnosis and Comparative Table**:
     The agent conducts an in-depth code analysis and presents findings in two mandatory formats:
     - **Descriptive**: detailed technical explanation of each identified weakness or opportunity (domain invariants, IPC payload validation, main/renderer process boundaries, SQLite transactions and migrations, listener/timer/worker leaks, HTML escaping, data loss on quit).
     - **Comparative Table**:
       | CURRENT IMPLEMENTATION | PROBLEM | IMPROVEMENT (GAIN) |
       | :--- | :--- | :--- |
       | [Current snippet/pattern] | [Technical risk/edge case/leak] | [Proposal and positive impact] |
  4. **Self-Correction Block & User Prompt**:
     - **AUTOMATIC CORRECTION PROHIBITED**: The agent **MUST NOT** apply any fix or code alteration on its own during this step.
     - **MANDATORY QUESTION**: The agent must end the turn by explicitly asking if the user wants the improvements identified in the review to be performed.

### Anti-Completion Bias & Authentic Review Mandate (Zero Rubber-Stamping)

LLM agents possess an intrinsic training bias (RLHF task-completion bias) that subconsciously drives them to declare tasks finished, stamp code as "ready for approval", and conduct superficial reviews simply to terminate the trajectory.

In this repository, **rubber-stamp reviews are strictly classified as a severe engineering failure**.

The agent MUST actively counter its internal completion bias by enforcing the following behavioral constraints:

1. **Forbid Premature Closure & Approval Pushing**: The agent MUST NEVER push the user to approve a specification, ask "posso aprovar a spec?", or transition a specification to `Implemented` unless the user explicitly directs it. The agent must remain in an analytical, vigilant stance.
2. **Skeptical Code Audit (Assume Flaws Exist)**: Rather than seeking to prove that the code works, the reviewer must actively search for how the code will break, drift, or silently degrade under stress. Identify edge cases, race conditions, resource leaks, unhandled error paths, and architectural contract violations.
3. **No Decorative Checklist Stamping**: Checking acceptance criteria checkboxes (`[x]`) must never be a perfunctory act to conclude a turn. Every single criterion must be backed by an active, verified test.
4. **Deliberate Pace & Zero Urgency**: Architectural robustness, correctness, and critical scrutiny ALWAYS supersede speed or turn-count efficiency.

#### Pragmatism & Anti-Pedantry Filter (Zero Hypotheticals)

To prevent theoretical pedantry and speculative overengineering during reviews, the reviewer MUST adhere to the following evaluation boundaries:

* **Execution Reality over Speculative Scenarios**: Evaluate the code strictly against its active runtime execution path and documented contract. It is strictly FORBIDDEN to raise risks based on hypothetical future usages outside the active contract.
* **YAGNI & KISS (Accidental Complexity Prohibition)**: Do NOT propose additional concurrency, channels, background workers, synchronization primitives, or defensive abstractions if the standard library, runtime, or operating system already sufficiently handles the condition.
* **Concrete Failure Criteria**: Findings MUST correspond to demonstrable bugs, specification violations, reproducible race conditions, genuine resource leaks, or project architecture rule violations.
* **Strict Audit Verdict Policy**: If after thorough, adversarial investigation no flaws exist, the reviewer may declare:
  > *"No actionable defects or boundary violations found after rigorous audit."*
  Do NOT fabricate low-value or academic remarks simply to populate a comparative table.
- **Architecture Gate**: Before writing a failing test or implementation code, the feature specification MUST define the bounded context, ubiquitous language, aggregate root and state transitions, commands/queries/domain events, application use cases, ports/adapters, package ownership map, the IPC contract it adds or changes, and a test matrix for each layer. Do not implement until this section is complete.
- **Architecture Review Gate**: Before concluding implementation, verify that every changed file has one primary responsibility, all dependencies point inward toward the domain, and no layer violates the DDD rules below. Record any approved exception in the feature specification.
- **Target Directory for Specs**: `specs/`.

## Documentation & Specification Reading Guidelines
The coding agent must proactively consult and read specific documentation and specification files according to the task context:

- **Strict Workspace Boundary**: The agent MUST NEVER inspect, read, reference, or consider files, directories, or paths outside the root directory of this project. Accessing external repositories or paths outside this workspace is strictly prohibited under all circumstances. The only exception is the app's own `userData` directory when the user explicitly asks to inspect local app data.
- **Do Not Prioritize Open Files in IDE**: The agent MUST NOT prioritize or assume relevance of files merely because they are open or active in the user's IDE / editor tabs. Context and authoritative scope must be derived strictly from the project's explicit specifications, approved tasks, and workspace files.
- **Project References**:
  - `README.md`: user-facing product description.
  - `docs/PRODUCT.md`: product register, users, personality and anti-references.
  - `docs/DESIGN.md`: design tokens, typography, components and interaction rules.
  - `docs/ROADMAP.md`: planned ideas that are NOT approved for implementation.
  - `docs/DEVELOPMENT.md`: how to run, test, package and capture screenshots.
  - `docs/USER_GUIDE.md`: user-facing behavior of every feature.

### Feature Specifications (`specs/`)
- **All Specs**: All specification files follow the format `<ID>-YYYY-MM-DD-<slug>.md` (e.g., `001-2026-10-04-pdf-attachments.md`) and are organized by domain. When implementing or modifying a feature, you MUST read the corresponding specification file first, as it contains the authoritative requirements and architectural decisions for that feature. Always read and follow the ID order. **The last specs created indicate the most recent ones, so the most recent history must be prioritized.**

- **`specs/`**:
  - **When to read**: Read the active target feature spec (e.g. `specs/000-YYYY-MM-DD-<slug>.md`) before starting any implementation. When refactoring or integrating with existing subsystems, read the relevant historical spec.

- Follow format in `specs/000-YYYY-MM-DD-template.md` to create new specs.

- When finishing each task, mark `[x]` in the active feature specification (`specs/<ID>-YYYY-MM-DD-<slug>.md`) to indicate that the task is completed. Never modify the template file itself for task progress.

## Project Structure
- `src/main/`: Electron main process, preload, persistence and related-content modules.
- `src/shared/`: pure modules loaded by both processes (no Electron, Node or DOM APIs).
- `src/renderer/`: `index.html`, styles and renderer scripts (ordered global `<script defer>` files).
- `tests/`: unit/integration tests (`*.test.cjs`), smoke scenarios (`*-smoke.js`) and the smoke runner (`tests/smoke/`).
- `scripts/`: build and maintenance tooling. `native/`: Swift OCR/PDF helper. `assets/`: icons and sounds.
- `docs/`, `specs/`: documentation and specifications.
- The repository root holds only configuration and entry documents. Do not add source files to the root.

## Code Quality & Validation
- **Node Version**: Run all npm/node commands with Node 22 or newer. The default shell may resolve an older Node through nvm, which fails with `node: bad option: --test`.
- **Mandatory Quality Check**: Before concluding ANY task that changes code, ALWAYS execute:
  - `npm test` (unit/integration tests in `tests/*.test.cjs`).
  - `node --check <file>` for every changed `.js`/`.cjs` file.
  - When the change touches the renderer, `src/main/preload.cjs` or IPC handlers, run the affected Electron smoke tests (`npm run test:app`, or its scoped flags). Run smoke processes sequentially; they share the test data directory and desktop focus.
  - When the change touches `native/`, run `node scripts/build-ocr.cjs` and confirm the helper builds.
  - When the change touches packaging, resource paths, `native/`, `assets/` or dependencies, run `npm run package` and confirm the packaged app starts.
- **Isolated Test Data**: Tests MUST use a temporary data directory. Never read, write or delete the user's real notebooks, SQLite database or media.

## Electron Quality Rules

### Process Model & Security
- **Hardened BrowserWindow**: every window keeps `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` and default `webSecurity`. Never enable `nodeIntegrationInWorker`, `nodeIntegrationInSubFrames`, `allowRunningInsecureContent` or `experimentalFeatures`.
- **Untrusted Renderer**: treat the renderer as untrusted input. Business rules, persistence, filesystem access, network access and child processes live only in the main process (or its workers).
- **Minimal Preload Surface**: `src/main/preload.cjs` exposes one purpose-specific function per capability through `contextBridge`. Never expose `ipcRenderer`, a generic `invoke(channel, ...)`, `require`, `process` or Node modules to the page.
- **IPC Contracts**: use `ipcMain.handle` / `ipcRenderer.invoke` only; never synchronous IPC (`sendSync`). Every handler validates its payload in the main process (types, required fields, identifier format, enum values, size limits) before acting, and rejects with a clear error. Every new or changed channel is documented in the feature specification.
- **Content Security Policy**: the app page keeps a restrictive CSP. No `eval`, `new Function`, inline event handler attributes or remote scripts/styles. All assets ship with the app.
- **Navigation & New Windows**: block unexpected navigation (`will-navigate`) and deny `window.open` through `setWindowOpenHandler`. External links open only via `shell.openExternal` after validating an `http:`/`https:` URL in the main process.
- **Local Files**: `shell.openPath` and custom protocol handlers (e.g. `caderno-media://`) resolve only identifiers that map to files inside the app media directory. Never accept raw paths from the renderer; reject path traversal.
- **Permissions**: deny permission requests (camera, microphone, geolocation, notifications, etc.) by default through the session permission handlers unless a specification approves one.
- **Child Processes**: spawn helpers with `execFile` and an argument array, never through a shell. Always set `timeout` and `maxBuffer`, and handle non-zero exits. Resolve binaries with `app.isPackaged ? process.resourcesPath : project path`.
- **Outbound Network**: network calls from the main process (link previews, model downloads) must enforce timeouts, response size limits, redirect limits and the private-address (SSRF) guard. Never send note content to the network.
- **HTML Escaping**: every value interpolated into `innerHTML` or a generated HTML document (including PDF export) MUST be escaped or sanitized. Prefer `textContent` and DOM APIs for user content.

### Main Process Reliability
- **Never Block the Main Process**: CPU-heavy or long-running work (embeddings, OCR, PDF parsing, large media hashing) runs in a worker thread, utility process or child process. Keep synchronous SQLite and filesystem work in IPC handlers short and bounded.
- **Data Integrity**: multi-statement writes run inside one SQLite transaction. Schema changes are explicit migrations in the store. Files written to `userData` use restrictive permissions (`0o600`) and are written atomically (temporary file + rename) when overwriting existing content.
- **No Data Loss on Quit**: pending renderer edits are flushed to the main process and committed before the window closes or the app quits. A save is reported as successful only after the transaction commits.
- **Single Instance**: keep the single-instance lock. Tests acquire an isolated `userData` path before requesting the lock.
- **Lifecycle & Leaks**: remove IPC listeners, timers, intervals, watchers and workers when their window or service is disposed. Check `win.isDestroyed()` before `webContents.send`. Do not register duplicate handlers on window re-creation.
- **Error Handling**: never swallow errors silently. Main-process failures are logged with context and surfaced to the user as readable messages; unhandled rejections are not acceptable.

### Packaging & Production Boundary
- **No Dev Code in Production Paths**: production modules MUST NOT `require` files from `tests/`, `scripts/` or `artifacts/`. Test harnesses, smoke runners and screenshot capture live outside the production entry point.
- **Packaged Paths**: every resource resolved at runtime (assets, native helper, workers, model cache) must work both unpacked and inside the packaged `.app`/asar. Native binaries and files read by external processes ship as extra resources or unpacked asar content.
- **Pinned Toolchain**: Electron, `@electron/packager` and runtime dependencies are pinned to exact versions. Upgrading Electron requires its own specification and a packaged-app verification.
- **Native Helper**: `native/caderninho-ocr` is a build output of `native/ocr.swift`. Rebuild it before testing or packaging any change to the Swift source.

## UI & Screen Validation
- **No Automated Screen / HTML Inspection**: Never inspect the HTML DOM or use automated browser subagents to validate UI/screen visual results. Always ask the user to verify and validate the screen in the running app. This does not restrict committed UI smoke tests, which assert behavior.

## Flow and Architecture Documentation
- Always use Mermaid diagrams (`mermaid` code blocks) when documenting flows, system architectures, sequences, or topologies.
- Do not use ASCII art or text boxes to draw flows or architecture.
- Every architectural flow, interaction sequence, or topology in specifications, documentation, and READMEs must be rendered using standard Mermaid syntax (e.g., `flowchart`, `sequenceDiagram`, `stateDiagram-v2`).

## Architecture & Design Principles
- **Modularity**: Code must be strictly modularized across the codebase, ensuring clear boundaries, separation of concerns, and reusable components.
- **SOLID Principles**: Always apply SOLID principles across all codebase layers (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion).

## DDD & Layered Architecture
- **Bounded Contexts**: Every new feature MUST be implemented as an explicit bounded context. Do not create catch-all modules, feature logic in generic root files, or single-file implementations spanning multiple responsibilities.
- **Required Layers**: Each bounded context MUST use explicit `domain/`, `application/`, `infrastructure/`, and `presentation/` packages.
  - `domain/` contains entities, value objects, domain events, invariants, and ports. It MUST NOT import Electron, `node:sqlite`, `fs`, `child_process`, HTTP clients, `@huggingface/transformers`, the DOM, or other infrastructure.
  - `application/` contains commands, queries, and one use case per file. It orchestrates domain behavior exclusively through domain ports.
  - `infrastructure/` implements SQLite repositories, the media file store, HTTP clients, the native OCR/PDF helper adapter, embedding workers and Electron integrations.
  - `presentation/` covers IPC handlers (main side) and renderer UI. IPC handlers validate input, invoke one application use case and map output. Renderer UI MUST NOT contain business rules, persistence logic or network calls.
- **Dependency Direction**: Dependencies MUST point inward: presentation and infrastructure depend on application/domain; application depends on domain; domain depends on no outer layer.
- **Integration Boundaries**: Every external integration, including SQLite, the filesystem, the native helper, embedding models, HTTP services and Electron APIs (`shell`, `dialog`, `Notification`, `BrowserWindow`), MUST be represented by a domain port and implemented by an infrastructure adapter. Do not invoke them directly from IPC handlers, renderer code or domain entities.
- **Shared Modules**: code that runs in both the main process and the renderer stays pure (no Electron, Node or DOM APIs) and may not absorb feature-specific rules without an explicit domain-level justification.
- **File Responsibility Limits**: Every file must have one primary responsibility. Files above 250 lines MUST be evaluated for splitting; files above 350 lines are prohibited unless the specification documents a concrete exception and its owner.
- **Package Ownership**: The feature specification MUST name the owner/responsibility of every new package and public module before implementation.

## Git Workflow
- **Branching Policy**:
  - Every specification/task that modifies code MUST have its own dedicated branch.
  - Modifying markdown documentation only does NOT require creating a new branch.
- **Strict Prohibition on Unprompted Commits & Pushes**:
  - **NEVER** commit or push changes automatically or proactively.
  - Upon completing a task, **DO NOT** ask if you should commit. Simply conclude your response leaving the changes in the branch.
- **Explicit User Trigger Only**:
  - **Review Docs**: Before commit, review `docs/DEVELOPMENT.md` and `docs/USER_GUIDE.md` and check whether they need updates. Only review current content; do not document every implementation detail.
  - **Review Specs**: Before commit, review the active `specs/<ID>-YYYY-MM-DD-<slug>.md` and check whether it needs updates. Record divergences in the spec. Check the spec status and the list of specs in `README.md`.
  - **Approval Review (README)**: At the end of every task, before it is approved and integrated into `main`, formally review `README.md`: descriptions, screenshots, Mermaid diagrams, commands, versions and the specifications index. The approval report states either "reviewed, no change needed" or what was changed.
  - **Commit**: Commit only when explicitly requested by the user.
  - **Push**: Push only when explicitly requested by the user. When requested to push:
    1. Push the task branch.
    2. Merge / integrate the task branch into `main` without creating a PR using fast forward if possible. If not, ask user.
    3. Push `main`.
