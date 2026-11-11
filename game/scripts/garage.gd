extends Node3D
## Visual study only. No race or economy simulation yet.
const MODEL = preload("res://assets/scrapline_hatch.glb")
const IMPORTED_MODEL_PATH = "res://assets/volkswagen_citi_golf.glb"
var imported_model_active := false
var car: Node3D
var camera: Camera3D
var yaw := 0.65
var pitch := 0.30
var distance := 6.4
var bonnet: Node3D
var bonnet_rest := Vector3.ZERO
var bonnet_open := false
var headlight_count := 4
var paint_material: StandardMaterial3D
var wheel_material: StandardMaterial3D
var touches: Dictionary = {}
var previous_pinch := 0.0
var rotating := false
var paint_index := 0
var wheel_dark := false
var status: Label
var save_path := "user://garage.json"
const PAINTS = [Color("e5e5df"), Color("193d63"), Color("7b1825"), Color("252a2e")]

func _ready() -> void:
	RenderingServer.set_default_clear_color(Color("10151b"))
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("111820")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("b5c3d2")
	env.ambient_light_energy = 0.65
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.environment = env
	add_child(environment)
	# Keep the original prototype playable until the new binary asset is actually present.
	var model_resource: PackedScene = MODEL
	if ResourceLoader.exists(IMPORTED_MODEL_PATH):
		var imported = load(IMPORTED_MODEL_PATH)
		if imported is PackedScene:
			model_resource = imported
			imported_model_active = true
	car = model_resource.instantiate()
	add_child(car)
	if imported_model_active:
		_normalize_imported_car()
	for node in car.find_children("*", "MeshInstance3D", true, false):
		var instance := node as MeshInstance3D
		var material := instance.get_active_material(0)
		if material and (material.resource_name == "BodyPaint" or (imported_model_active and material.resource_name == "Metal")):
			if not paint_material:
				paint_material = material.duplicate()
			instance.material_override = paint_material
		if instance.name.begins_with("AlloySpoke") or instance.name.begins_with("WheelHub") or (imported_model_active and instance.name.begins_with("Cylinder")):
			if not wheel_material:
				wheel_material = material.duplicate()
			instance.material_override = wheel_material
		if instance.name == "Bonnet":
			bonnet = instance
			bonnet_rest = bonnet.rotation
	_load_customization()
	_apply_customization()
	_build_garage()
	camera = Camera3D.new()
	camera.near = 0.05
	camera.fov = 42
	add_child(camera)
	_update_camera()
	_build_ui()

# Fit third-party models to the original 3.8 m-wide garage composition without
# depending on their export origin, scale, or orientation. Does not alter source meshes.
func _normalize_imported_car() -> void:
	var bounds := AABB()
	var first := true
	for node in car.find_children("*", "MeshInstance3D", true, false):
		var mesh_node := node as MeshInstance3D
		if mesh_node.mesh == null:
			continue
		var local_bounds := (car.global_transform.affine_inverse() * mesh_node.global_transform) * mesh_node.get_aabb()
		if first:
			bounds = local_bounds
			first = false
		else:
			bounds = bounds.merge(local_bounds)
	if first:
		return
	var largest := maxf(bounds.size.x, maxf(bounds.size.y, bounds.size.z))
	if largest < 0.001:
		return
	var factor := 3.8 / largest
	car.scale = Vector3.ONE * factor
	car.position = Vector3(-bounds.get_center().x, -bounds.position.y, -bounds.get_center().z) * factor

func _box(size: Vector3, position: Vector3, color: Color, metallic := 0.0) -> void:
	var item := MeshInstance3D.new()
	var shape := BoxMesh.new()
	shape.size = size
	item.mesh = shape
	item.position = position
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.metallic = metallic
	material.roughness = 0.5
	item.material_override = material
	add_child(item)

func _build_garage() -> void:
	_box(Vector3(14, 0.1, 16), Vector3(0, -0.12, 0), Color("333c43"), 0.15)
	_box(Vector3(14, 4, 0.15), Vector3(0, 1.9, -5), Color("222a33"))
	_box(Vector3(0.15, 4, 16), Vector3(-6, 1.9, 0), Color("202831"))
	for x in [-2.0, 2.0]:
		_box(Vector3(0.025, 0.005, 5), Vector3(x, -0.065, 0), Color("ad793d"))
	for x in [-4.0, 4.0]:
		_box(Vector3(1.5, 0.9, 0.7), Vector3(x, 0.4, -3.8), Color("303b46"), 0.3)
	for p in [Vector3(2, 4, 3), Vector3(-3, 3, 0), Vector3(0, 3, -3)]:
		var light := SpotLight3D.new()
		light.position = p
		light.light_energy = 7.0
		light.spot_range = 12
		light.spot_angle = 65
		light.shadow_enabled = false
		add_child(light)
		light.look_at(Vector3(0, 0.5, 0))
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-45, -30, 0)
	sun.light_energy = 1.6
	add_child(sun)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var panel := PanelContainer.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	panel.offset_left = 20
	panel.offset_right = -20
	panel.offset_top = 18
	layer.add_child(panel)
	var column := VBoxContainer.new()
	panel.add_child(column)
	var title := Label.new()
	title.text = "SCRAPLINE  /  GARAGE STUDY 01"
	title.add_theme_font_size_override("font_size", 25)
	column.add_child(title)
	status = Label.new()
	status.text = ("Imported Volkswagen model" if imported_model_active else "Reference-guided prototype") + " • drag to orbit • pinch / wheel to zoom"
	column.add_child(status)
	var buttons := HFlowContainer.new()
	column.add_child(buttons)
	_button(buttons, "Paint", func():
		paint_index = (paint_index + 1) % PAINTS.size()
		_apply_customization()
		_save_customization())
	_button(buttons, "Alloy finish", func():
		wheel_dark = not wheel_dark
		_apply_customization()
		_save_customization())
	if not imported_model_active:
		_button(buttons, "2 / 4 headlights", func():
			headlight_count = 2 if headlight_count == 4 else 4
			_apply_customization()
			_save_customization())
	if bonnet:
		_button(buttons, "Open / close bonnet", _toggle_bonnet)
	_button(buttons, "Front", func(): yaw = 0.65; _update_camera())
	_button(buttons, "Rear", func(): yaw = PI - 0.65; _update_camera())
	if bonnet:
		_button(buttons, "Engine", func():
			bonnet_open = false
			_toggle_bonnet()
			yaw = 0.3
			pitch = 0.65
			distance = 3.5
			_update_camera())
	_button(buttons, "−", func(): distance = minf(9, distance + 0.5); _update_camera())
	_button(buttons, "+", func(): distance = maxf(2.6, distance - 0.5); _update_camera())

func _button(parent: Control, title: String, action: Callable) -> void:
	var button := Button.new()
	button.text = title
	button.custom_minimum_size = Vector2(115, 48)
	button.pressed.connect(action)
	parent.add_child(button)

func _apply_customization() -> void:
	if paint_material:
		paint_material.albedo_color = PAINTS[paint_index]
	if wheel_material:
		wheel_material.albedo_color = Color("252b30") if wheel_dark else Color("aab5c0")
	for node in car.find_children("*", "MeshInstance3D", true, false):
		if node.name.begins_with("Headlights2_"):
			node.visible = headlight_count == 2
		elif node.name.begins_with("Headlights4_"):
			node.visible = headlight_count == 4

func _toggle_bonnet() -> void:
	if not bonnet:
		return
	bonnet_open = not bonnet_open
	var target := bonnet_rest + Vector3(deg_to_rad(-72) if bonnet_open else 0.0, 0, 0)
	create_tween().tween_property(bonnet, "rotation", target, 0.45)

func _update_camera() -> void:
	var target := Vector3(0, 0.7, 0)
	camera.position = target + Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * distance
	camera.look_at(target)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			rotating = event.pressed
		if event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
			distance = clampf(distance + (-0.4 if event.button_index == MOUSE_BUTTON_WHEEL_UP else 0.4), 2.6, 9)
			_update_camera()
	elif event is InputEventMouseMotion and rotating:
		_orbit(event.relative)
	elif event is InputEventScreenTouch:
		if event.pressed:
			touches[event.index] = event.position
		else:
			touches.erase(event.index)
		previous_pinch = 0
	elif event is InputEventScreenDrag:
		touches[event.index] = event.position
		if touches.size() == 1:
			_orbit(event.relative)
		elif touches.size() == 2:
			var points := touches.values()
			var span: float = points[0].distance_to(points[1])
			if previous_pinch > 0:
				distance = clampf(distance * previous_pinch / maxf(span, 1), 2.6, 9)
				_update_camera()
			previous_pinch = span

func _orbit(delta: Vector2) -> void:
	yaw -= delta.x * 0.007
	pitch = clampf(pitch + delta.y * 0.005, 0.04, 1.05)
	_update_camera()

func _save_customization() -> void:
	var file := FileAccess.open(save_path, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify({"version": 1, "paint": paint_index, "headlights": headlight_count, "wheel_dark": wheel_dark}))

func _load_customization() -> void:
	if not FileAccess.file_exists(save_path):
		return
	var data = JSON.parse_string(FileAccess.get_file_as_string(save_path))
	if data is Dictionary and data.get("version") == 1:
		paint_index = clampi(int(data.get("paint", 0)), 0, PAINTS.size() - 1)
		headlight_count = 2 if data.get("headlights") == 2 else 4
		wheel_dark = bool(data.get("wheel_dark", false))
