# Execution

1. Record baseline checks and inspect relevant code.
2. Add regression tests for changed behavior.
3. Implement focused fixes and retain existing features.
4. Validate: npm test; npm run build; cargo test --manifest-path src-tauri/Cargo.toml; cargo fmt --manifest-path src-tauri/Cargo.toml --check; cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings; npm run tauri dev.
5. Update documentation after final behavior is verified.
6. Independently review diffs and manually exercise the main workflow.
7. Record evidence, make local scoped commits, and complete the task. Do not push.
