---
name: refactor-and-migrate
description: "Use when restructuring existing code, migrating an API or stored format, changing a contract, or repeating an edit across many files. Identify consumers, verify compatibility, and sequence changes in working units."
---

# Refactor and migrate

Restructuring fails in two typical ways: old and new code end up living side by side for good, or a break is found only after many steps were built on top of it. The rules below prevent both. Apply the parts that match the work.

## 1. Remove before you build

- In the area the task changes, first delete what is dead or redundant: unused code, validators that check what is already guaranteed, stubs, references to things that no longer exist. Then build on the simpler base.
- Get to the minimum before polishing. Do not improve code that is about to be removed.
- Design for the usage you can observe in the code, not for cases nobody has.
- Stay inside the area the task changes. Dead code elsewhere is a suggestion for the final message.

## 2. Make the smallest change that solves the problem

- Prefer the smaller diff. Fewer changed lines are easier to review and to revert.
- Do not make the same decision in several places. Put it in one place and pass the result on.
- Add a layer, an abstraction, or a setting only when a current requirement needs it.

## 3. Changing a contract

Before assuming all callers can move together, look for consumers a symbol search misses: old files on disk, scripts that parse CLI output, or clients released separately. Name the assumption that makes the change safe and check it through a real consumer. For a stored-field rename, for example, open a record written by the old version with the new reader. A round trip using only the new writer and reader cannot show backward compatibility.

- If all consumers can move together and no compatibility promise applies, migrate them and remove the old API in the same change.
- Otherwise preserve the required behavior and exercise the affected versions or data. If you cannot run that check, say what remains unverified; do not treat a successful build as evidence. Take any consequential compatibility decision back to the spec.

## 4. Rewrites and migrations done in phases

Aim at the end state. Do not write throwaway code only to keep every intermediate state fully working.

- Keep any temporary breakage inside a reversible local step. Do not commit or hand over a version with a new failure.
- While a phase is in progress, keep running the checks for the areas you are touching.
- At the end, run the full static and runtime verification.

## 5. Work in units you can check

- Check the starting state and record existing failures so you can distinguish them from failures introduced by the change.
- Make one change, run its checks, and resolve any new failure before starting the next unit.
- For a regression, observe the check fail before the fix and pass afterwards. If the test belongs in the repository, commit it together with the fix, not as a failing checkpoint.

## 6. Script edits that repeat

When the same edit applies to many places, write a script or codemod instead of editing by hand. A script does every place the same way, and a reviewer can read and rerun it.

- Do the first place by hand to learn the recipe. Then write the script and prove it by running it on that place and comparing with your manual result.
- Make it safe to run again.
- Write the smallest script that does the job, never a framework. For a handful of obvious edits, edit by hand.
- Keep the script with the change when a reviewer needs it to check the work.
