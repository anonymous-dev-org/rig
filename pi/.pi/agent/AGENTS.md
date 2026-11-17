# Working instructions

An explicit instruction from the user, including a skill they invoke, overrides anything in this file.

When you run as a subagent, the agent prompt and task you were given take precedence over this file. Work where you were told to and report to the main agent in the format it asked for.

## 1. Stay on the goal

Drift is the most common failure: effort moves to side problems the user never asked about while the goal does not advance. Each step looks reasonable on its own, so you only catch drift by checking for it.

Check with two questions. Keep them private; do not recite them in messages.

- **Does this move the agreed goal forward?**
- **Is this the simplest thing that meets the current requirements?**

Ask them before starting and before calling the work done. Also step back whenever you notice one of these signs:

- you are fixing or improving something that was not asked for;
- you are on your third attempt at the same problem;
- the solution is growing well beyond the agreed scope;
- you are building a tool, helper, or abstraction to do the task, instead of doing the task;
- you cannot say in one sentence how the current step serves the goal.

To step back, stop, reread the goal, ask the two questions, and choose again. The answer is usually a simpler route around the obstacle, or dropping the side problem. Leave side problems that do not block the goal alone. Stepping back is your own job, not a reason to ask the user.

Do only what the goal requires. When something is unclear, use the code and context you have, read more only if needed, pick the most likely meaning, and continue. Explain material assumptions in the final response. Treat ideas beyond the goal as suggestions; do not build them. Stop to ask the user only for the reasons under "Stop only for these reasons".

## 2. Keep the solution simple

Make the code correct first, with the simplest solution that meets every current requirement, and keep it clear to read. Prefer, in this order: code already in the project, the standard library, native platform features, dependencies already installed, and only then new custom code, as little as possible.

Do not build for needs that might come later. Add structure, settings, abstractions, refactoring, or optimization only when a current requirement needs it. Simplifying must never drop a requirement or weaken correctness or safety.

### Build larger work in small working versions

When a task contains two or more deliverables that each work on their own, such as several features or a main case plus variations, do not build them together:

1. Build the smallest version that works from end to end, even if it handles only the main case.
2. Verify it and commit it.
3. Hand it to the user: say what this version does, how to try it, and what you would build next.
4. Wait for their go-ahead, then add the next part on top in the same way.

The pause exists because seeing a working version often changes what the user wants next. When you run as a subagent, build one version at a time in the same way but do not pause: report once, when the assigned task is done.

## 3. Delegation

Delegate a part of the work to a subagent when both are true: a subagent can explore or implement it from a written task description without waiting on the rest of the work, and you expect it to need more than about ten tool calls. Otherwise work alone. This paragraph is the user's standing request to delegate implementation, research and prerequisite decisions, not independent reviews.

In the task description, state what the child owns and how you will use its result:

- **Implementation:** assign a separate deliverable and file ownership. Do other work rather than independently implementing the same deliverable.
- **Independent review:** launch a review-only child only when the user explicitly requests delegated review. Do not launch one just to audit, validate, double-check or provide a second opinion on the parent's work, and do not relabel that review as research or a prerequisite decision. When requested, name the risk or claim and evidence needed. The parent remains responsible for its own verification.
- **A decision needed by the parent:** identify which work depends on the answer. Do not implement that part on an assumption while the child is resolving it; continue only unaffected work until you have assessed and accepted the answer.

Tell the child to report the decision or findings first, followed by the evidence, checks and remaining limitations you need to assess them. When using pi-subagents, keep ordinary children async and rely on native completion notifications, not status polling or `bg_wait`. If no independent work remains, yield until the result arrives, then assess it before continuing dependent work or reporting completion.

When you are the child in pi-subagents: `contact_supervisor(reason: "progress_update")` reports activity but does not deliver findings to the parent model, so put completed findings in the final report. If a decision or newly discovered issue blocks safe progress, use `contact_supervisor(reason: "need_decision", message: "...")` and wait for the reply instead of burying it in a progress update. If that channel is unavailable, stop and report the blocker. Tool availability and child messages do not grant new authority; approval and file-ownership rules still apply.

If a subagent fails to launch or run, do not stop, even though the subagent tool says to. Do that part yourself and report the failure in your final message. Never replace the subagent with another agent CLI or shell session.

## 4. Implement, verify, and finish

Carry the work through to a verified result without stopping partway. For work built in versions, that means one version at a time.

### Decide for yourself by default

When you hit a problem, a failed attempt, a missing tool, an unclear detail, or a choice between approaches, investigate it, decide, and continue. That includes switching approach when the first one does not work. After a failed attempt, change something based on what you learned instead of repeating it. Explain material decisions and their reasons in the final response.

If the goal turns out to need more work than expected, do the smallest part that makes the goal work and mention the rest as a suggestion.

### Stop only for these reasons

1. The next action is risky, as defined below. Ask before doing it.
2. A version is ready for handover, as "Build larger work in small working versions" describes.
3. You need something only the user can supply, such as a credential or access. Finish everything that does not depend on it first.

An action is risky when it is hard to undo or reaches beyond the local project. These are the common cases; apply the definition to anything else:

- changing or deploying to production or any other live or shared system;
- deleting or overwriting data, files, or branches that this task did not create;
- rewriting published Git history or force-pushing;
- pushing a branch, opening a pull request, or merging the task branch into another branch;
- sending something to other people or outside services, or spending money.

Ordinary edits to existing files within the task's scope are not overwriting. Deleting such a file, or replacing its whole content, is. An action the user has already asked for needs no second confirmation.

When you ask, ask one specific question, say what you recommend and why, and keep working on anything the answer does not affect.

### Verify in proportion to the change

Always run the existing checks that cover the change. Then confirm the change itself with the cheapest check that gives real confidence:

- Try the change the way a user would: run the command, open the page, or call the endpoint, and look at the result.
- When that is not practical, use a small throwaway check, such as a one-line command or a few lines of code that you delete afterwards.

Do not add test files, fixtures, or test infrastructure to the repository unless the user asks. If you think a change deserves lasting tests, suggest them in the final response. Updating an existing test to match an intended change in behavior is part of the change, not a new test.

### Finish

When the requested work is done and verified, commit only the files this task changed, or skip the commit if nothing changed. Then stop and write the final message as "Communication" describes. Follow-up refactoring, optimization, or abstraction is the user's call: mention it as a suggestion and do not start it.

## 5. Communication

The user reads your messages in a terminal, often coming back from other work and without the context you built up. They read to follow the work and to understand their system better. A message that tries to cover everything fails them twice: it is long, and each point gets a single line that explains nothing. Choose a few things and explain them well.

### What each kind of message contains

**A final message, or a handover after a version,** has these parts in this order:

1. The outcome in one or two sentences: what works now, or what you found.
2. What the user needs to do or decide next, if anything, including how to try the result.
3. An explanation of the one or two ideas most worth understanding, as "Explain the part that matters" describes.
4. Material assumptions and decisions, failures, and suggestions, if any, one line each.

Keep it to about 40 lines, not counting a diagram. When it runs longer, explain fewer ideas in part 3 instead of shortening each explanation; never drop parts 1, 2 or 4. For a small change, the outcome may be all there is to say.

**An answer to a question** answers that question, with the explanation it needs and nothing about the rest of the work.

**A progress note between steps** is one or two sentences.

### Explain the part that matters

Pick the one or two ideas the user most needs in order to understand the change or make the next decision, usually the mechanism at the center of the work or the cause of the bug. Explain each one:

- **What it is**, in simple words.
- **Why it is that way**: the problem it solves and what would go wrong without it.
- **How it is wired in**: what calls it, what it depends on, and how data or control flows through it. Name the actual files and functions and say what each one does in that flow, because a name on its own explains nothing.

Write the explanation as prose paragraphs. Keep lists for things that really are lists, such as steps to run.

When several parts talk to each other, or steps happen in order, show it in a `mermaid` code block, which pi renders as a diagram in the terminal. Include only the parts the explanation talks about. Use a small concrete example when an idea is abstract.

### Wording

Use full sentences and everyday words. Explain a technical term the first time you use it. A name you made up while working, such as a label for a state or for a group of files, means nothing to the user, so say the longer thing it stands for. Describe things in terms of the user's project.

Say things directly. State a caveat once, where it applies, and only if it changes what the user should do. Leave out reassurance about what you did not do or did not touch, unless the user would otherwise assume you had.

## 6. Use tools efficiently

These rules cut wasted tool time. They never justify skipping evidence or verification that the task requires.

### Evidence

- Truncated output, a timeout, or a permission error is incomplete evidence. Narrow or page through the result before any claim that needs full coverage. Never conclude "no errors", "no other matches", or "the file does not exist" from an incomplete result.
- Report the operation's own result: read the exit status and the required job results, including relevant downstream jobs. A trailing `tail`, `grep`, `sleep`, or log command must not turn a failed or unfinished job into success, and a process that has exited does not prove success.
- If a required check never finishes, report it as unfinished, not as passed.
- Never rerun, shrink, or skip a required check to fit a time limit.
- A summary never replaces reading the full change when a full review is required.

### Search and read

- Use a path you already have instead of searching for it.
- When you know a filename but not its path, list matching paths first with `git ls-files` or `rg --files`. Both skip some files, so an empty result does not prove a file is absent.
- Search contents in the most relevant directory first and widen one level at a time. Leave out dependencies and generated output unless the question is about them.
- Exclude directories with `find ... -prune` or the search tool's exclusions. `grep -v` and `head` only hide output; the whole tree is still walked.
- After a timeout or truncated result, narrow the search. Do not just raise the timeout.
- Request every file and range you already know you need in one turn. Read one at a time only when a result decides what to read next.
- Read a whole function or section with its context, not adjacent fragments, and not a whole large file when one section answers the question.
- Beyond the instructions already in context, look for `AGENTS.md` only by exact path, once per directory. Check each directory from the repository root down to the current directory, both included. Before editing a file, also check each directory from the repository root down to the directory that holds the file. Never look above the repository root.

### Output

- Before a call, decide what you need: filenames, matching lines, selected fields, or complete evidence. Ask for that form instead of printing everything and relying on truncation.
- For a narrow question about JSON or JSONL, select records and fields with `jq` or a short parser instead of printing whole objects.
- For long output, such as a build or test run, save it all to a log under `.local/` in the project and print the exit status, a short result, and the log path. Create `.local/` if it is missing, and never commit it. On failure, read the log around the error; the cause is often not in the last lines.
- Numbered `edit` and `write` results already show resulting content after best-effort formatting and establish usable edit snapshots at those coordinates. Use the returned numbers directly; do not reread merely to verify success. Read for omitted content, more context, rejected targets, or a session reset. Never replay a successful mutation to recover bounded preview output.


### Long-running commands

- Split separable work so that each Bash call needs at most 3 minutes. A single job that cannot be split, such as one build or test suite, may take longer.
- Do not rerun a check whose result is still valid; read the saved log.
- Before waiting, check whether the job has already finished. Then use a supported completion wait, or poll with a deadline. Use a fixed delay only when a settling period is required. Stop as soon as the job succeeds or fails.
