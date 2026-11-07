"""Rebuild offline articulated hand exhibits from the retained upstream STL and MJCF.

Uses the Python standard library only. This exports visual geometry and authored
joint-angle demonstrations, not MuJoCo dynamics or a validated grasp controller.
"""
from pathlib import Path
import base64
import hashlib
import json
import math
import struct
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MODEL = sys.argv[1] if len(sys.argv)>1 else 'allegro'
assert MODEL in ('allegro','sharpa')
SHARPA = MODEL == 'sharpa'
SOURCE = ROOT / f'shared/models/robots/{MODEL}-source'
OUT = ROOT / f'shared/models/robots/{MODEL}.glb'


def quat(value):
    w, x, y, z = map(float, value.split())
    length = math.sqrt(w*w+x*x+y*y+z*z)
    return [x/length, y/length, z/length, w/length]


def multiply(a, b):
    x, y, z, w = a
    X, Y, Z, W = b
    return [w*X+x*W+y*Z-z*Y, w*Y-x*Z+y*W+z*X,
            w*Z+x*Y-y*X+z*W, w*W-x*X-y*Y-z*Z]


def joint_angle(name, closure):
    if SHARPA:
        if name.endswith('_AA'): return 0
        return closure * (.45 if '_CMC_' in name or '_PCMC' in name else .9)
    index = int(name[-1])
    if name.startswith('th'):
        return [.4+.4*closure, .15+.3*closure, .1+.6*closure, .12+.6*closure][index]
    return [0, .05+.9*closure, .04+closure, .06+.8*closure][index]


def build():
    xml = ET.parse(SOURCE/'right_hand.xml').getroot()
    defaults = {}

    def collect_defaults(element, inherited):
        values = {k: dict(v) for k, v in inherited.items()}
        for child in element:
            if child.tag != 'default':
                values.setdefault(child.tag, {}).update(child.attrib)
        if element.get('class'):
            defaults[element.get('class')] = values
        for child in element.findall('default'):
            collect_defaults(child, values)

    collect_defaults(xml.find('default'), {})
    data = bytearray()
    doc = {'asset': {'version':'2.0', 'generator':'course Allegro STL/MJCF exporter'},
           'scene':0, 'scenes':[{'nodes':[0]}], 'nodes':[], 'meshes':[],
           'materials':[], 'accessors':[], 'bufferViews':[], 'animations':[]}

    def accessor(values, width, kind='f'):
        while len(data) % 4:
            data.append(0)
        offset = len(data)
        data.extend(struct.pack('<'+str(len(values))+kind, *values))
        doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(data)-offset})
        a = {'bufferView':len(doc['bufferViews'])-1,'componentType':5126 if kind=='f' else 5125,
             'count':len(values)//width,'type':{1:'SCALAR',3:'VEC3',4:'VEC4'}[width]}
        if values:
            a['min'] = [min(values[i::width]) for i in range(width)]
            a['max'] = [max(values[i::width]) for i in range(width)]
        doc['accessors'].append(a)
        return len(doc['accessors'])-1

    materials = {}
    for material in xml.findall('asset/material'):
        materials[material.get('name')] = len(doc['materials'])
        doc['materials'].append({'name':material.get('name'), 'doubleSided':False,
            'pbrMetallicRoughness':{'baseColorFactor':([.08,.32,.5,1] if SHARPA and material.get('name')=='green' else list(map(float,material.get('rgba').split()))),
                                  'metallicFactor':.15,'roughnessFactor':.53}})

    mesh_cache = {}
    triangle_count = 0
    for source in xml.findall('asset/mesh'):
        filename = source.get('file')
        if not filename.lower().endswith('.stl'): continue
        blob = (SOURCE / xml.find('compiler').get('meshdir','assets') / filename).read_bytes()
        count = struct.unpack_from('<I',blob,80)[0]
        if len(blob) != 84+50*count:
            raise ValueError('Expected binary STL: '+filename)
        positions, normals = [], []
        for i in range(count):
            values = struct.unpack_from('<12f',blob,84+50*i)
            positions.extend(values[3:])
            normals.extend(list(values[:3])*3)
        mesh_cache[source.get('name',Path(filename).stem)] = {'attributes':{
            'POSITION':accessor(positions,3),'NORMAL':accessor(normals,3)},'mode':4}
        triangle_count += count

    # Preserve source body transforms. This display-only world rotation makes the
    # palm upright: original local +Z becomes screen/world +Y; no parts rescaled.
    palm = xml.find('worldbody/body')
    original = quat(palm.get('quat','1 0 0 0'))
    display = multiply([-.5,-.5,-.5,.5],[-original[0],-original[1],-original[2],original[3]])
    if SHARPA: display = [-.707106781,0,0,.707106781]
    doc['nodes'].append({'name':'display_orientation','rotation':display,'children':[]})
    joints = []

    def add_body(body, parent, inherited_class):
        default_class = body.get('childclass',inherited_class)
        node = {'name':body.get('name'),'translation':list(map(float,body.get('pos','0 0 0').split())),
                'rotation':quat(body.get('quat','1 0 0 0')),'children':[]}
        joint = body.find('joint')
        if joint is not None:
            spec = {**defaults.get(joint.get('class',default_class),{}).get('joint',{}), **joint.attrib}
            axis = list(map(float,spec.get('axis','0 1 0').split()))
            node['extras'] = {'joint':joint.get('name'),'axis':axis,
                              'range':list(map(float,spec['range'].split())),'restQuaternion':node['rotation'][:], **({'finger':joint.get('name').split('_')[1], 'closeAngle':joint_angle(joint.get('name'),1)} if SHARPA else {})}
        index = len(doc['nodes'])
        doc['nodes'].append(node)
        doc['nodes'][parent]['children'].append(index)
        if joint is not None:
            joints.append((index,node['extras']))
        for i, geom in enumerate(body.findall('geom')):
            spec = {**defaults.get(geom.get('class',default_class),{}).get('geom',{}),**geom.attrib}
            if spec.get('group') != '2' or 'mesh' not in spec:
                continue
            primitive = dict(mesh_cache[spec['mesh']])
            primitive['material'] = materials[spec['material']]
            doc['meshes'].append({'name':spec['mesh'],'primitives':[primitive]})
            visual = {'name':body.get('name')+'_visual_'+str(i),'mesh':len(doc['meshes'])-1,
                      'translation':list(map(float,spec.get('pos','0 0 0').split())), 'rotation':quat(spec.get('quat','1 0 0 0'))}
            node['children'].append(len(doc['nodes']))
            doc['nodes'].append(visual)
        for child in body.findall('body'):
            add_body(child,index,default_class)

    add_body(palm,0,'sharpa' if SHARPA else 'allegro_right')
    times = [i/10 for i in range(81)]
    time_accessor = accessor(times,1)
    for clip_index, name in enumerate(['五指舒展与合拢' if SHARPA else '四指张合示意','手指依次活动']):
        clip = {'name':name,'samplers':[],'channels':[]}
        for node_index, spec in joints:
            values = []
            finger_index = ['index','middle','ring','pinky','thumb'].index(spec['finger']) if SHARPA else ['ff','mf','rf','th'].index(spec['joint'][:2])
            for t in times:
                phase = t/8
                closure = (1-math.cos(phase*2*math.pi))/2
                if clip_index:
                    local = phase*(5 if SHARPA else 4)-finger_index
                    closure = math.sin(math.pi*local)**2 if 0 <= local <= 1 else 0
                angle = max(spec['range'][0],min(spec['range'][1],joint_angle(spec['joint'],closure)))
                assert spec['range'][0] <= angle <= spec['range'][1]
                sine = math.sin(angle/2)
                values.extend(multiply(spec['restQuaternion'],[v*sine for v in spec['axis']]+[math.cos(angle/2)]))
            clip['channels'].append({'sampler':len(clip['samplers']),'target':{'node':node_index,'path':'rotation'}})
            clip['samplers'].append({'input':time_accessor,'output':accessor(values,4),'interpolation':'LINEAR'})
        doc['animations'].append(clip)
    doc['buffers'] = [{'byteLength':len(data)}]
    encoded = json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode()
    encoded += b' '*((-len(encoded)) % 4)
    data += b'\0'*((-len(data)) % 4)
    result = struct.pack('<III',0x46546c67,2,12+8+len(encoded)+8+len(data))
    result += struct.pack('<II',len(encoded),0x4e4f534a)+encoded
    result += struct.pack('<II',len(data),0x004e4942)+data
    OUT.write_bytes(result)
    (OUT.with_suffix('.data.js')).write_text('window.RobotBuffers=window.RobotBuffers||{};window.RobotBuffers['+json.dumps(MODEL)+']='+json.dumps(base64.b64encode(result).decode())+';\n',encoding='utf-8')
    (ROOT/f'shared/models/licenses/{MODEL}.txt').write_bytes((SOURCE/'LICENSE').read_bytes())
    provenance = json.loads((SOURCE/'source.json').read_text())
    manifest_path = ROOT/'shared/models/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest = [row for row in manifest if row['id'] not in ('allegro','sharpa')]
    rendered_triangles = sum(doc['accessors'][mesh['primitives'][0]['attributes']['POSITION']]['count']//3 for mesh in doc['meshes'])
    manifest.append({'id':MODEL,'folder':provenance['directory'],'bytes':len(result),'triangles':rendered_triangles,'uniqueSourceTriangles':triangle_count,
        'animations':[{'name':c['name'],'seconds':8,'frames':81} for c in doc['animations']],
        'method':'Source STL and MJCF hierarchy; authored kinematics, no physics simulation',
        'file':OUT.relative_to(ROOT).as_posix(),'runtime':OUT.with_suffix('.data.js').relative_to(ROOT).as_posix(),
        'license':f'shared/models/licenses/{MODEL}.txt','licenseId':'Apache-2.0' if SHARPA else 'BSD-2-Clause',
        'provenance':f'shared/models/robots/{MODEL}-LICENSE.html',
        'sha256':hashlib.sha256(result).hexdigest(),
        'source':provenance['repository']+'/tree/'+provenance['commit']+'/'+provenance['directory'],
        'nature':'Licensed model mesh; authored finger demonstration, not a validated grasp controller'})
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Built {MODEL}: {len(result):,} bytes; {len(joints)} articulated joints; {triangle_count:,} source triangles')


if __name__ == '__main__':
    build()
