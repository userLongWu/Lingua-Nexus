# Lingua Nexus: demonstrable demo

## Approved goal
The user selected: improve both demos, fix defects, complete interactions and documentation, retain mock AI. Requirements are confirmed; no product decision blocks implementation.

## Acceptance
1. Dictionary review hides the definition until reveal, including previously saved dictionary cards.
2. A new dictionary lookup cannot save an old result; a saved result cannot be accidentally saved again.
3. SRT cues and plain-text lines preserve abbreviations, decimals, ellipses and numeric dialogue; preview matches Rust import.
4. Stale history/save requests cannot switch the selected card or display another card's history.
5. Batch imports and review-history/schedule writes are atomic, with SQLite failure-injection tests.
6. A newcomer can follow verified install/run instructions and a short demonstration.
7. Existing local data is preserved. No schema migration, real AI, new dependency, account, cloud sync, deployment or GitHub push.

## Task tree
- demo-flow: application fixes and regression tests, owned by the implementation agent.
- demo-docs: README.md and USER_GUIDE.md, owned by root; final wording depends on verified demo-flow behavior.
- Parent: final integration review and desktop/browser smoke verification.
The two repositories are independent.
