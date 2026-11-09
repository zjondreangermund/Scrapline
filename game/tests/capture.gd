extends SceneTree
func _initialize() -> void:
	call_deferred("_capture")
func _capture() -> void:
	var garage = load("res://scenes/garage.tscn").instantiate()
	root.add_child(garage)
	await process_frame
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://../docs/previews/garage-engine.png")
	print("GARAGE_CAPTURE_OK")
	quit()
