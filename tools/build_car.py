"""Original, reference-guided Citi-style hatchback study. Blender 4+.
Run: blender -b --python tools/build_car.py -- /absolute/path/to/game/assets
Dimensions are approximations, not a scan. No third-party meshes/textures.
"""
import bpy, math, sys, os, json
from mathutils import Vector
out=sys.argv[sys.argv.index('--')+1]
os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.4):
 m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 return m
paint=mat('BodyPaint',(.82,.84,.82),.55,.25)
black=mat('SatinBlack',(.012,.016,.019),.15,.35)
rubber=mat('TyreRubber',(.022,.025,.029),0,.8)
glass=mat('SmokedGlass',(.028,.055,.065),.5,.16)
chrome=mat('MachinedAlloy',(.53,.58,.63),.9,.22)
steel=mat('EngineAlloy',(.22,.26,.28),.8,.38)
lens=mat('HeadlampGlass',(.64,.72,.73),.5,.18)
red=mat('SmokedTailLens',(.13,.018,.022),.3,.25)
blue=mat('SiliconeBlue',(.025,.09,.46),.1,.42)
seam=mat('PanelGaps',(.035,.04,.045),.1,.5)
objects=[]
def finish(obj,name,m):
 obj.name=name; obj.data.materials.append(m); objects.append(obj); return obj
def mesh(name,verts,faces,m,bevel=0):
 d=bpy.data.meshes.new(name); d.from_pydata(verts,[],faces); d.update(); o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); finish(o,name,m)
 if bevel:
  mod=o.modifiers.new('Soft panel edges','BEVEL'); mod.width=bevel; mod.segments=3
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def box(name,loc,scale,m,bev=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,name,m)
 if bev:
  q=o.modifiers.new('Edge radii','BEVEL');q.width=bev;q.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,m,axis='Z',n=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=loc);o=bpy.context.object
 if axis=='X':o.rotation_euler[1]=math.pi/2
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 finish(o,name,m);o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def tube(name,points,r,m):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=2;curve.resolution_u=1
 s=curve.splines.new('POLY');s.points.add(len(points)-1)
 for p,v in zip(s.points,points):p.co=(*v,1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);return finish(o,name,m)
def panel(name,v,m):return mesh(name,v,[tuple(range(len(v)))],m)
# Correct small hatchback proportions, body-side strips following actual arch openings.
# Longitudinal y negative is the nose.
ys=sorted(set([-1.87,-1.72,-1.5,-1.1,-.78,-.3,.3,.8,1.12,1.5,1.77,1.85]+[c+math.cos(i*math.pi/40)*.405 for c in [-1.12,1.18] for i in range(41)]))
def width(y):return .805 if abs(y)<1.55 else .775
for side in [-1,1]:
 verts=[]
 for y in ys:
  lower=.30
  for c in [-1.12,1.18]:
   if abs(y-c)<=.405:lower=max(lower,.39+math.sqrt(max(0,.405**2-(y-c)**2)))
  verts.extend([(side*width(y),y,lower),(side*(width(y)+.008),y,.82),(side*.77,y,.94)])
 faces=[]
 for i in range(len(ys)-1):
  for j in range(2):faces.append((3*i+j,3*(i+1)+j,3*(i+1)+j+1,3*i+j+1))
 mesh('BodySide_'+str(side),verts,faces,paint,.005)
 # Rolled lip follows arch with short downward legs, no bolt-on extensions.
 for cy in [-1.12,1.18]:
  vs=[]
  for i in range(49):
   a=i*math.pi/48
   for r,x in [(.405,.812),(.421,.82),(.43,.8)]:vs.append((side*x,cy+math.cos(a)*r,.39+math.sin(a)*r))
  fs=[]
  for i in range(48):
   for j in range(2):fs.append((i*3+j,i*3+j+1,(i+1)*3+j+1,(i+1)*3+j))
  mesh('RolledArch',vs,fs,paint)
 # lower sill and factory black side rub strip between arches
 box('Sill',(side*.79,.04,.32),(.045,1.46,.10),paint)
 box('SideMoulding',(side*.816,.04,.61),(.018,1.46,.055),black,.008)
 # door shut lines and handles
 for y in [-.51,.58,1.05]:tube('DoorGap',[(side*.811,y,.36),(side*.819,y,.81),(side*.772,y,.935)],.004,seam)
 for y in [.39,.92]:box('DoorHandle',(side*.824,y,.86),(.025,.14,.035),black,.008)
 # front fender indicators
 box('SideIndicator',(side*.819,-.63,.81),(.015,.075,.028),lens,.005)
# front structure, open engine bay and detachable bonnet
box('FrontValance',(0,-1.79,.39),(1.56,.14,.23),paint,.04)
box('RearValance',(0,1.78,.43),(1.57,.14,.30),paint,.035)
box('RearHatchLower',(0,1.80,.80),(1.53,.07,.29),paint,.02)
box('FrontBumper',(0,-1.88,.40),(1.62,.12,.085),black,.025)
box('FrontBumperPaint',(0,-1.94,.465),(1.55,.055,.055),paint,.014)
box('BlackFrontSpoiler',(0,-1.88,.265),(1.61,.20,.06),black,.02)
box('LowerIntake',(0,-1.873,.32),(.74,.025,.085),black)
for x in [-.52,.52]:box('FrontIndicator',(x,-1.88,.51),(.20,.025,.045),lens,.006)
box('Grille',(0,-1.825,.735),(1.52,.06,.255),black,.005)
for z in [.645,.68,.715,.75,.785,.82]:box('GrilleSlat',(0,-1.865,z),(1.50,.012,.007),steel,.001)
# headlights and visible reflector rings; distinct two/four setups
for layout in [2,4]:
 for x in ([-.60,.60] if layout==2 else [-.60,-.35,.35,.60]):
  rr=.112 if abs(x)>.5 else .091
  cyl('Headlights%d_Bezel'%layout,(x,-1.875,.741),rr+.012,.025,chrome,'Y',48)
  cyl('Headlights%d_Lens'%layout,(x,-1.893,.741),rr,.012,lens,'Y',48)
  # fluted lens facets
  for offset in [-.06,-.03,0,.03,.06]:
   h=math.sqrt(max(0,rr*rr-offset*offset))*.83
   tube('Headlights%d_Flute'%layout,[(x+offset,-1.902,.741-h),(x+offset,-1.902,.741+h)],.0025,chrome)
# front emblem uses original S instead of copying a manufacturer's badge
cyl('ScraplineBadge',(0,-1.88,.74),.052,.014,chrome,'Y')
# engine bay cavity, rails, firewall, inner arches
box('EngineBayFloor',(0,-1.12,.52),(1.44,1.30,.08),black)
box('Firewall',(0,-.51,.78),(1.44,.055,.30),black)
for s in [-1,1]:
 box('InnerWing',(s*.62,-1.14,.78),(.22,1.22,.15),paint,.045)
 cyl('StrutTop',(s*.60,-.85,.89),.09,.045,steel)
box('EngineBlock',(0,-1.12,.70),(.52,.52,.28),steel,.035)
box('ValveCover',(0,-1.10,.89),(.56,.26,.11),black,.04)
for x in [-.21,-.07,.07,.21]:
 box('CamRib',(x,-1.1,.949),(.012,.20,.008),chrome,.002)
 for y in [-1.19,-1.01]:cyl('CoverBolt',(x,y,.958),.012,.014,chrome,n=8)
box('Radiator',(0,-1.62,.70),(.98,.06,.27),black)
for x in [i*.04 for i in range(-11,12)]:box('RadiatorFin',(x,-1.66,.70),(.009,.015,.24),steel,.001)
cyl('TurboHousing',(.36,-1.32,.78),.12,.14,steel,'X')
for i in range(4):
 x=-.21+i*.14
 tube('IntakeRunner',[(x,-.97,.87),(x,-.85,.84),(x,-.80,.77)],.034,chrome)
tube('BoostPipe',[(.43,-1.3,.80),(.49,-1.5,.82),(.24,-1.52,.86),(.15,-1.35,.90)],.04,chrome)
tube('BlueCoupler',[(.46,-1.43,.82),(.41,-1.51,.84)],.046,blue)
box('Battery',(-.43,-.66,.82),(.23,.25,.18),black)
box('BatteryLabel',(-.43,-.66,.915),(.17,.17,.008),blue)
for x in [-.49,-.37]:cyl('BatteryTerminal',(x,-.72,.93),.017,.02,chrome)
cyl('CoolantTank',(.45,-.65,.84),.075,.13,lens)
cyl('CoolantCap',(.45,-.65,.92),.04,.025,black)
bonnet=box('Bonnet',(0,-1.18,.949),(1.48,1.27,.038),paint,.025)
# hinge origin at rear so opening exposes the engine
bpy.context.scene.cursor.location=(0,-.545,.95);bpy.context.view_layer.objects.active=bonnet;bonnet.select_set(True)
for o in bpy.context.selected_objects:
 if o!=bonnet:o.select_set(False)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bonnet.select_set(False)
# greenhouse and roof
box('Roof',(0,.37,1.405),(1.34,1.48,.055),paint,.06)
panel('Windscreen',[(-.72,-.51,.97),(.72,-.51,.97),(.64,-.32,1.37),(-.64,-.32,1.37)],glass)
panel('RearGlass',[(-.64,1.08,1.37),(.64,1.08,1.37),(.73,1.65,1.0),(-.73,1.65,1.0)],glass)
for s in [-1,1]:
 # four-door Citi-style glazing with explicit pillars and window seals
 for name,v in [('FrontWindow',[(s*.75,-.46,.98),(s*.75,.48,.98),(s*.65,.48,1.36),(s*.65,-.28,1.36)]),('RearWindow',[(s*.75,.54,.98),(s*.75,1.47,.98),(s*.65,1.04,1.36),(s*.65,.54,1.36)])]:
  panel(name,v,glass);tube('WindowSeal',v+[v[0]],.014,black)
 tube('APillar',[(s*.76,-.52,.94),(s*.66,-.32,1.40)],.028,paint)
 tube('BPillar',[(s*.76,.51,.94),(s*.66,.51,1.40)],.026,black)
 tube('CPillar',[(s*.76,1.63,.95),(s*.66,1.09,1.40)],.048,paint)
 tube('RoofGutter',[(s*.67,-.32,1.42),(s*.67,1.08,1.42)],.01,black)
 box('MirrorStem',(s*.81,-.37,1.02),(.13,.045,.04),black)
 box('DoorMirror',(s*.90,-.38,1.04),(.15,.14,.09),black,.028)
 box('MirrorGlass',(s*.90,-.30,1.04),(.11,.008,.06),chrome,.01)
# cabin silhouette visible through glazing
box('Dashboard',(0,-.30,1.01),(1.32,.24,.13),black,.03)
for s in [-1,1]:
 box('SeatBase',(s*.36,.25,.60),(.43,.47,.16),black,.04)
 seat=box('SeatBack',(s*.36,.47,.88),(.43,.12,.55),black,.045);seat.rotation_euler[0]=.12
 box('Headrest',(s*.36,.51,1.18),(.24,.11,.15),black,.035)
# Close the sloping hatch shoulder between the rear glass and rear lamp panel.
mesh('HatchShoulder',[(-.73,1.65,1.0),(.73,1.65,1.0),(.765,1.835,.94),(-.765,1.835,.94)],[(0,1,2,3)],paint,.008)
for s in [-1,1]:
 panel('RearQuarterInfill',[(s*.75,1.47,.98),(s*.73,1.65,1.0),(s*.765,1.835,.94),(s*.77,1.47,.94)],paint)
box('FrontLowerPanel',(0,-1.815,.565),(1.54,.075,.11),paint,.012)
# normal rear with smoked lights and black spoilers
box('RearBumper',(0,1.89,.46),(1.64,.14,.11),black,.025)
box('RearRoofSpoiler',(0,1.15,1.425),(1.37,.19,.055),black,.018)
for s in [-1,1]:
 box('SmokedTailLight',(s*.62,1.85,.79),(.24,.035,.22),red,.018)
 for z in [.735,.79,.845]:box('TailLensRib',(s*.62,1.872,z),(.21,.008,.006),black,.001)
box('RearPlateRecess',(0,1.846,.74),(.48,.02,.12),black,.012)
box('RearPlate',(0,1.861,.74),(.39,.008,.083),chrome,.004)
box('HatchHandle',(0,1.85,.9),(.12,.025,.035),black)
cyl('Exhaust',(-.55,1.91,.28),.038,.18,steel,'Y')
tube('RearWiper',[(0,1.59,1.055),(.36,1.40,1.19)],.008,black)
# Wheels: rounded tyre section, deep alloy lip, spokes, brake discs, bolts.
for s in [-1,1]:
 for cy in [-1.12,1.18]:
  cx=s*.775;cz=.355
  vs=[];fs=[];profile=[(-.115,.225),(-.11,.285),(-.085,.318),(-.04,.328),(.04,.328),(.085,.318),(.11,.285),(.115,.225)]
  for i in range(64):
   a=2*math.pi*i/64
   for dx,r in profile:vs.append((cx+dx,cy+math.sin(a)*r,cz+math.cos(a)*r))
  for i in range(64):
   for j in range(len(profile)-1):fs.append((i*8+j,((i+1)%64)*8+j,((i+1)%64)*8+j+1,i*8+j+1))
  tyre=mesh('Tyre',vs,fs,rubber)
  for p in tyre.data.polygons:p.use_smooth=True
  face=cx+s*.116
  cyl('WheelBarrel',(cx,cy,cz),.229,.19,black,'X',48)
  cyl('BrakeDisc',(cx+s*.045,cy,cz),.18,.018,steel,'X',48)
  box('BrakeCaliper',(cx+s*.06,cy+.13,cz),(.06,.075,.15),blue,.018)
  for rad in [.226,.212]:
   pts=[(face,cy+math.sin(i*2*math.pi/64)*rad,cz+math.cos(i*2*math.pi/64)*rad) for i in range(65)]
   tube('AlloyLip',pts,.008,chrome)
  cyl('WheelHub',(face,cy,cz),.057,.027,chrome,'X',32)
  for k in range(8):
   a=k*math.pi/4
   o=box('AlloySpoke',(face-s*.012,cy+math.sin(a)*.133,cz+math.cos(a)*.133),(.029,.032,.165),chrome,.007);o.rotation_euler[0]=-a
  for k in range(4):
   a=k*math.pi/2+.5;cyl('LugBolt',(face+s*.02,cy+math.sin(a)*.037,cz+math.cos(a)*.037),.009,.014,black,'X',6)
  # tread grooves kept coarse enough to read without expensive textures
  for i in range(40):
   a=i*2*math.pi/40
   tube('TreadGroove',[(cx-.065,cy+math.sin(a)*.328,cz+math.cos(a)*.328),(cx+.065,cy+math.sin(a+.025)*.328,cz+math.cos(a+.025)*.328)],.002,seam)
# Recalculate consistent face normals before export.
for o in objects:
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
# Export only car. All parts remain individually addressable.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'scrapline_hatch.glb'),export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'../../art/source/scrapline_hatch.blend'))
# studio rendering evidence, not a fabricated concept image
floor=mat('StudioFloor',(.055,.065,.075),.15,.42)
box('StudioFloor',(0,0,-.045),(200,200,.05),floor)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.world.color=(.18,.18,.18)
for loc,power,size in [((1,-3,5),1300,5),((-3,-1,3),1000,4),((0,3,4),1500,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4.4,-6.3,3.0));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.72))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=50;scene.camera=cam
# hide two-headlight parts in evidence render
for o in objects:
 if o.name.startswith('Headlights2_'):o.hide_render=True
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.filepath=os.path.join(out,'../../docs/previews/front-study.png');bpy.ops.render.render(write_still=True)
cam.location=(4.4,6.3,2.8);cam.rotation_euler=(Vector((0,0,.72))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=os.path.join(out,'../../docs/previews/rear-study.png');bpy.ops.render.render(write_still=True)
print('SCRAPLINE_MODEL_COMPLETE')
