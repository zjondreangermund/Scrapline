extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var garage = load("res://scenes/garage.tscn").instantiate()
	root.add_child(garage)
	await process_frame
	assert(garage.car != null, "Car loads")
	assert(garage.bonnet != null, "Bonnet node resolves")
	assert(garage.paint_material != null, "Paint material resolves")
	assert(garage.wheel_material != null, "Wheel material resolves")
	for count in [2, 4]:
		garage.headlight_count = count
		garage._apply_customization()
		for node in garage.car.find_children("*", "MeshInstance3D", true, false):
			if node.name.begins_with("Headlights2_"):
				assert(node.visible == (count == 2))
			if node.name.begins_with("Headlights4_"):
				assert(node.visible == (count == 4))
	garage.bonnet_open = false
	garage._toggle_bonnet()
	await create_timer(0.6).timeout
	assert(absf(garage.bonnet.rotation.x - garage.bonnet_rest.x) > 1.0, "Bonnet opens")
	garage.paint_index = 2
	garage.wheel_dark = true
	garage.headlight_count = 2
	garage._save_customization()
	garage.paint_index = 0
	garage.wheel_dark = false
	garage.headlight_count = 4
	garage._load_customization()
	assert(garage.paint_index == 2 and garage.wheel_dark and garage.headlight_count == 2, "Save round trip")
	# Restore the default reference configuration after isolated smoke run.
	garage.paint_index = 0
	garage.wheel_dark = false
	garage.headlight_count = 4
	garage._save_customization()
	print("GARAGE_SMOKE_OK: model, paint, wheels, headlights, bonnet, persistence")
	quit()
