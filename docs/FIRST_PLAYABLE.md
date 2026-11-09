# First playable

## Objective
Prove that the car looks good on a phone, workshop interactions are enjoyable, and mechanical changes produce a measurable difference on the strip.

## Milestone 0: visual and performance proof
Build one original car with selectable paint and wheels, removable bonnet, visible engine assembly, garage lighting, and touch orbit/zoom.

Acceptance:
- Inspect body shape, materials, lighting, wheel proportions, and engine bay on a real Samsung Galaxy A14.
- Record the exact device variant, graphics settings, resolution, build version, frame times, memory, loading time, and temperature behavior.
- Proposed baseline: sustained 30 FPS target during a 10-minute garage interaction run. This is a target, not a measured claim.
- Test repeated customization and scene reloads for crashes and accumulating memory.
- User reviews actual in-engine screenshots or footage before visual scope expands.
- Engine choice is recorded only after assessing this proof.

## Milestone 1: workshop
Implement inventory, component condition, dependencies, fit/remove operations, inspection, repair, and saving.
- A player can remove a turbo assembly and inspect its components.
- A fitted part cannot simultaneously remain in storage.
- Incompatible parts show a specific reason.
- Closing and reopening preserves parts, condition, customization, and money.
- Transactions are atomic; interruption cannot duplicate or lose parts.

## Milestone 2: salvage
One compact scrapyard, one donor vehicle, recoverable assemblies, and authored salvage recipes.
- Player recovers a damaged assembly, dismantles it, repairs a usable component, and fits it to the race car.
- Material costs and inventory capacity are checked before committing changes.
- Irreversible dismantling clearly previews outputs.

## Milestone 3: race
One quarter-mile strip with staging, launch, throttle, manual gears, finish detection, result screen, and telemetry.
- Repeated runs with identical inputs and seed produce repeatable results.
- Poor launches and missed shifts have observable consequences.
- Compatible upgrades and tuning affect recorded performance.
- Finish timing uses simulation time and interpolated crossing rather than rendered frames.
- Race state survives pause/resume safely.

## Milestone 4: mechanic and complete loop
A simulation-backed diagnostic helper reads the latest run and current build.
- Detect a deliberately under-capacity fuel system from actual telemetry.
- Suggest a valid temporary tuning change and compatible repair.
- Advice reflects parts available and funds.
- Offline fallback remains useful.
- Complete the full find → dismantle → repair → fit → tune → race journey on the target phone.

## Completion evidence
For each milestone record build identifier, checks, device measurements, screenshots/footage, known issues, and user feedback. Documentation and desktop previews do not count as phone validation.
