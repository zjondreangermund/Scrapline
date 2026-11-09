# Game design

## Vision
Build a car players recognize as their own, through scavenging, disassembly, restoration, tuning, and drag racing. The scavenging reference is ARC Raiders: meaningful finds and decisions about what to recover. Scrapline uses its own world, art, systems, and identity.

## World and recovery
Begin with a compact scrapyard, garage, and drag strip. Later expand into abandoned workshops, farms, and industrial areas. Old cars can become restoration projects or donor vehicles. Recovery exposes condition, transport cost, storage needs, and likely reusable assemblies.

## Parts and assemblies
Support whole-assembly removal and optional component-level work at a bench. Each part instance needs an identity, definition, condition, wear, fitted location, provenance, and repair state. Each definition specifies compatible interfaces, required supporting parts, performance contributions, and salvage outputs.

| System | Examples | Main roles |
| --- | --- | --- |
| Engine | Pistons, rods, crankshaft, cams, cylinder head | Torque curve, rev limit, durability |
| Air and fuel | Turbo, intercooler, injectors, fuel pump, ECU | Boost response, fuel delivery, calibration |
| Cooling | Radiator, fan, oil cooler | Heat rejection and reliability |
| Drivetrain | Clutch, gearbox, differential, shafts | Torque capacity, ratios, launch behavior |
| Grip | Tyres, pressure, suspension, alignment | Traction, wheelspin, stability |
| Body | Panels, wheels, paint, interior, weight reduction | Appearance, mass, personalization |

Compatibility must be explicit. A turbo upgrade can require more fuel delivery, cooling, and clutch capacity. Engine swaps can require mounts, wiring, gearbox interfaces, and bay clearance. Do not allow every part to fit every car.

Dismantling consumes time and may require tools. Define recoverable outputs before the action, preserve part identity, and prevent duplication. Adapting parts must use authored recipes and interfaces rather than unrestricted crafting.

## Workshop and customization
Lift, workbench, inventory storage, inspection view, and assembly view. Touch users can rotate and zoom the car, select visible components, inspect dependencies, and remove or fit compatible parts. Provide readable condition and compatibility explanations. Visual customization includes paint, wheels, removable panels, and later body kits, interiors, decals, and stance.

## Racing
Quarter-mile races with a staging sequence, launch timing, throttle control, manual shifting, tyre temperature, traction, gearing, and boost response. Display elapsed time, reaction time, trap speed, and a separate total result definition. Vehicle performance comes from installed parts and tuning. A repeatable simulation allows fair comparisons and useful diagnosis.

Start with practice and local AI rivals. Championships and online competition come later.

## AI mechanic
The game simulation owns faults, measurements, compatible repairs, costs, and outcomes. The mechanic receives structured snapshots of installed parts, inventory, tuning, known inspections, and race telemetry. It explains supported findings and suggests affordable fixes or temporary compromises.

Example: fuel pressure falls under boost. Recommend reducing boost or installing a compatible higher-capacity pump when supported by the simulation.

Do not invent faults or silently alter the car. Confirm purchases, fitting, or tuning through explicit player actions. Use deterministic diagnostic responses when network access is unavailable. Any later language-model service must run behind a backend; never ship API secrets in the game client.

## Mobile presentation
Detailed car body and engine bay, realistic materials, authored lighting, mechanical animation, and strong sound. Use quality tiers, bounded texture sizes, mesh LODs, controlled shadows and reflections, and scene streaming where measured results justify it. Final settings depend on profiling.

## Initial boundaries
One car platform, one donor restoration car, one garage, one scrapyard, and one strip. No large open world, online economy, or multiplayer in the first playable. These remain expansion possibilities.
