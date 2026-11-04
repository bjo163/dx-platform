# NeuralForge autonomous task list

Each task is scoped so an agent can implement it, run local checks, and mark it
done without waiting for an account owner, external contributor, or approver.
Use fixtures and local test data instead of live provider accounts or secrets.

## CLI and provider reliability

- [ ] Add a CLI test for each supported provider name and for rejecting an unknown provider before browser startup.
- [ ] Add fixture tests for provider login states: signed out, signed in, and unsupported.
- [ ] Add a recovery test proving an unconfirmed send is not submitted a second time.
- [ ] Add a media-download test for a truncated response and verify it reports an actionable error.
- [ ] Add a CLI help test that checks documented options against the registered command options.

## Jobs and workspace

- [ ] Add job-service tests for pending, running, completed, failed, and cancelled state transitions.
- [ ] Add an API test for the job event stream when a client disconnects and reconnects.
- [ ] Add workspace-path tests for traversal attempts, symlinks, and paths outside the configured root.
- [ ] Add a backup-and-restore round-trip test using a temporary data directory.
- [ ] Add an API test for expired-job cleanup that preserves active jobs.

## Tooling and maintenance

- [ ] Add tests for invalid and boundary values in the API's environment-based configuration.
- [ ] Add a shutdown test that verifies timers, the job service, and the database close cleanly.
- [ ] Add a local smoke-test script that packs the CLI, installs it into a temporary project, and checks its help output.
- [ ] Document each root package script with the command that runs it and its expected local prerequisites.
- [ ] Add a regression test for every bug fixed in the preceding tasks before marking that task complete.
