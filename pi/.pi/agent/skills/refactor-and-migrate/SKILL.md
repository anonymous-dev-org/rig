---
name: refactor-and-migrate
description: "Use when changing the structure of existing code: a refactor, a rewrite, replacing an internal API, a migration, or the same edit applied across many files. Covers what to remove first, how to replace an API without leaving compatibility code behind, how to order the steps so each one can be checked, and when to script the edits."
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

## 3. Replacing an internal API

Migrate every caller and delete the old API in the same change.

- Do not keep a compatibility wrapper, a deprecated alias, or a flag that switches between old and new. Each one becomes permanent.
- Update the tests to assert the new contract. Delete tests that only protected details of the old implementation.
- This applies when all callers are inside the project. When external users depend on the old API, keeping it working is a requirement: put it in the requirements spec and let the user decide.

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
