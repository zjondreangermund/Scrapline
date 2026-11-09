# Garage study 01

## Implemented
Original reference-guided 3D hatchback mesh, four-headlight front with selectable two-headlight alternative, rolled arches, black front/rear spoilers, smoked rear lamps, engine bay, machined wheels, paint and wheel finish changes, animated bonnet, orbit/zoom, and saved customization.

The user's four-headlight white car is the primary reference. Side and rear details are inferred from their description; this is not a scan or exact replica. The source photo has not been published in this public repository.

## Run
Open `game/project.godot` in Godot 4.6 or run `godot --path game` from the repository root. First import: `godot --headless --path game --editor --import --quit`.

Controls: drag outside the toolbar to orbit; mouse wheel or two-finger pinch to zoom. Toolbar includes front, rear, engine views, paint, alloy finish, headlight layout, and bonnet.

## Rebuild model
Run `blender -b --python tools/build_car.py -- "$PWD/game/assets"` from the repository root. The script creates the GLB, editable Blender source under `art/source`, and studio renders under `docs/previews`. Blender source is reproducible and excluded from git; the runtime GLB is committed.

## Validation
- Godot 4.6.3 headless asset import succeeds.
- Garage scene instantiates without script errors.
- Smoke checks verify material lookup, exclusive 2/4-headlight visibility, bonnet movement, and customization save/load.
- Command: `godot --headless --path game --script res://tests/garage_smoke.gd`. Run with a disposable user-data directory; it restores default colors/layout after testing.
- Front and rear Blender renders inspected; a gap below the rear glass was identified and repaired.
- Studio renders show the actual model, but are offline Blender renders, not evidence of mobile rendering quality.

## Remaining before visual milestone acceptance
This is an early geometry and interaction study, not final high-quality vehicle art. Refine body curvature, panel joins, lamp lenses, materials, interior, and photo matching. Review the rendered Godot scene interactively; the execution environment did not expose a display server for the automated in-engine capture. No device FPS, thermal, memory, Android APK, or phone graphics validation is claimed. Optimize draw calls and profile the real Galaxy A14 before expanding.

Godot Compatibility is used for this prototype as an experiment, not a final engine decision. Racing, salvage gameplay, mechanical fitting, and AI mechanic are not implemented yet.

![Front model study](previews/front-study.jpg)
![Rear model study](previews/rear-study.jpg)
