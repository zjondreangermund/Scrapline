# Scrapline: Built to Race

A mobile-first 3D drag racing and car restoration game. Find abandoned cars, dismantle assemblies, salvage components, build a personalized car, and prepare for the next race with an AI mechanic.

## Project status
Early garage prototype implemented in Godot, with an original reference-guided car model. This is a geometry and interaction study; final vehicle art and phone performance validation remain pending.

Open `game/project.godot` in Godot 4.6. See [garage study, controls, and validation](docs/GARAGE_STUDY.md).

![First car study](docs/previews/front-study.jpg)

## Core loop
Explore → recover → inspect → dismantle → repair/adapt → customize → tune → race → improve the workshop.

## Design pillars
- Deep visual and mechanical customization.
- Parts have distinct roles, compatibility requirements, wear, and performance effects.
- Salvaging a damaged assembly can yield useful components for another build.
- Driving skill matters: launch, traction, throttle, shifts, and gearing.
- The AI mechanic explains simulation-backed faults and repairs using actual inventory and telemetry.
- Strong mobile visuals and stable performance must be demonstrated on a Samsung Galaxy A14 early.

## Planning
- [Game design](docs/GAME_DESIGN.md)
- [First playable and acceptance criteria](docs/FIRST_PLAYABLE.md)
- [Development roadmap](docs/ROADMAP.md)

## Development approach
Finish and verify one milestone before expanding. Start with a visual and performance proof, then implement the complete salvage-to-race loop. Engine selection is pending a device-tested prototype. Use original or appropriately licensed assets and maintain an asset register.
