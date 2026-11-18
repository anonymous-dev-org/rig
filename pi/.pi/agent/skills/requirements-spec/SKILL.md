---
name: requirements-spec
description: "Before implementing a new capability or an intentional change to behavior, architecture or UI, write one requirements file with checks. For a defect in existing behavior, use bug-analysis instead."
---

# Requirements spec

Before building, write down the result the user asked for, what must stay unchanged, and how to check both. Use this file as the basis for implementation.

**Why:** A request in chat leaves gaps that you would otherwise fill with guesses. Writing the requirements down shows the gaps while they are still cheap to close, and gives the user one place to correct the direction before any code exists.

## Steps

1. **Read first.** Study the request and the parts of the project it touches: the existing code, conventions, data, and screens. Answer from the project every question the project can answer.
2. **Draft the spec** at `.local/specs/<short-task-name>.md` using the sections below. Read `solution-design` before settling a design choice and `refactor-and-migrate` when planning a restructuring.
3. **Share the path.** Record assumptions and any decision only the user can make, with your recommended answer. Follow the decision rule in `AGENTS.md` section 3.
4. **Implement and verify.** Work from the file. Check each numbered requirement before calling the work done.

## Sections of the file

Leave out a section that does not apply instead of filling it with nothing. Write short, direct statements. Describe the current state only where the change depends on it.

- **Goal** — what the user wants and why, in two or three sentences.
- **Scope** — what is included, and what is explicitly left out.
- **Requirements** — give each requested outcome, structural constraint and behavior that must stay unchanged its own number (`R1`, `R2`, ...). State each so someone can check it. For example, “The UI no longer imports the storage library” and “Saving still produces the same record” need different checks.
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

- Distinguish the user's constraints from your choices. If the user requires a module boundary, it is a requirement. If you choose a module boundary to meet a behavior requirement, it belongs in Design.
- Every design element must serve a numbered requirement. Remove the ones that do not.
- Keep the file as long as the task needs and no longer. A small feature may need half a page.
- The file describes the current agreement, not its history. Edit entries in place and delete what no longer applies.
