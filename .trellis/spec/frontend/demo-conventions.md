# Demo conventions

Use existing React/TypeScript conventions and the current local persistence schema. No new dependencies. Keep loading, empty, error and success feedback next to the interaction. Disable duplicate writes. Preserve user data. Add behavior regression tests with the existing stack.

Validation: npm test; npm run build; cargo test --manifest-path src-tauri/Cargo.toml; cargo fmt --manifest-path src-tauri/Cargo.toml --check; cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings; npm run tauri dev.

Ownership: root owns README, USER_GUIDE and .trellis; implementation agent owns application and test source.

Verified lessons: capture DOM event values before functional state updaters; replay tests must cover event cleanup. Unit hook adapters do not replace native/browser smoke checks. Keep dictionary front/back presentation separate from stored content.
