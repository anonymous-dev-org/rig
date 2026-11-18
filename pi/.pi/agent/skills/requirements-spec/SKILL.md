---
name: requirements-spec
description: "Use before implementing a new feature or a change to behavior, architecture or UI. Collects what the user wants into one requirements file that the user approves and the implementation follows. Not for bugs (use bug-analysis), questions, or mechanical edits."
---

# Requirements spec

Before building, write down what will be built in one file and get the user's approval. The file is the base for the implementation: anything not in it is not built, and anything in it can be checked when the work is done.

**Why:** A request in chat leaves gaps that you would otherwise fill with guesses. Writing the requirements down shows the gaps while they are still cheap to close, and gives the user one place to correct the direction before any code exists.

## Steps

1. **Read first.** Study the request and the parts of the project it touches: the existing code, conventions, data, and screens. Answer from the project every question the project can answer.
2. **Ask what only the user can decide.** These are questions about wanted behavior, scope, and preference, where a wrong guess would change what gets built. Ask them all in one message, each with the answer you recommend and why. Do not ask about things you can find out yourself, and do not ask when there is nothing open.
3. **Write the spec** at `.local/specs/<short-task-name>.md` in the project, using the sections below. Create the folder if it is missing and never commit it. Before writing the Design section, read the `solution-design` skill. When the work restructures existing code, also read `refactor-and-migrate`.
4. **Hand it over.** Give the path, summarize the requirements and the main design decision in a few lines, list the assumptions the user should confirm, and wait for approval. Skip the wait only when the user has said to proceed without review.
5. **Implement from the spec.** When requirements change during the work, update the file first, then the code. Before calling the work done, check every acceptance check in the file.

## Sections of the file

Leave out a section that does not apply instead of filling it with nothing. Write short, direct statements. Describe the current state only where the change depends on it.

- **Goal** — what the user wants and why, in two or three sentences.
- **Scope** — what is included, and what is explicitly left out.
- **Requirements** — numbered statements (`R1`, `R2`, ...) of behavior the result must have. Each one is a single observable behavior that can be checked, written from the user's side: "When X, the system does Y." Include error cases and limits the user cares about.
- **Design** — how the requirements will be met, covering only the parts this task has:
  - *Architecture:* the components involved, what each is responsible for, and how data or control flows between them. Use a `mermaid` diagram when several parts talk to each other.
  - *UI:* each screen or view, what it shows, and what each action does, including empty, loading and error states.
  - *Data and interfaces:* new or changed data shapes, storage, endpoints, commands, or settings.
  - *Changes:* the files and functions to add or change, with what changes in each.
- **Decisions** — each choice between real alternatives, with the option chosen and the reason.
- **Assumptions and open questions** — what you assumed without confirmation, and anything still unanswered.
- **Acceptance checks** — how each requirement will be verified, referring to it by number: the command to run, the action to take, and the result to expect.
- **Versions** — only when the work has two or more parts that each work on their own: the order to build them in, smallest working version first.

## Rules

- State requirements as behavior, not as implementation. "The list keeps its scroll position after a refresh" is a requirement; "store the offset in a ref" belongs in Design.
- Every design element must serve a numbered requirement. Remove the ones that do not.
- Keep the file as long as the task needs and no longer. A small feature may need half a page.
- The file describes the current agreement, not its history. Edit entries in place and delete what no longer applies.
