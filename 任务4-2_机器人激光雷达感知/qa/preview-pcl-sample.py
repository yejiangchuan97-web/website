"""Orthographic QA plots of original sample points; no reconstruction or filling."""
import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont

base=Path(__file__).resolve().parents[2]
sample=json.loads((base/'assets/lidar/sample.json').read_text(encoding='utf8'))
points=np.array([v['point'] for v in sample['points']],dtype=np.float64)
font_path=Path('C:/Windows/Fonts/arial.ttf')
font=lambda size:ImageFont.truetype(str(font_path),size)
image=Image.new('RGB',(1920,1320),'#f4f8fc')
draw=ImageDraw.Draw(image)
draw.text((48,25),'PCL table_scene_lms400 | Fixed-stride sample of original points',font=font(28),fill='#143756')
draw.text((48,70),f"{len(points):,} / {sample['originalCount']:,} points; stride 38; no reconstruction; source coordinate unit unspecified",font=font(19),fill='#5d7388')

def panel(bounds,title,u,v,xlabel,ylabel,depth=None):
    x0,y0,x1,y1=bounds
    draw.rounded_rectangle(bounds,radius=16,fill='white',outline='#d8e4ef',width=2)
    draw.text((x0+20,y0+15),title,font=font(23),fill='#173d60')
    p0=np.array([x0+85,y0+72]);p1=np.array([x1-42,y1-68])
    minx,maxx=float(np.min(u)),float(np.max(u));miny,maxy=float(np.min(v)),float(np.max(v))
    span=max(maxx-minx,maxy-miny)*1.08
    scale=min(*(p1-p0))/span
    center=(p1+p0)/2
    mid=np.array([(minx+maxx)/2,(miny+maxy)/2])
    xy=np.column_stack([u,v]);xy=(xy-mid)*np.array([scale,-scale])+center
    for k in range(5):
        f=k/4
        xx=p0[0]+f*(p1[0]-p0[0]);yy=p0[1]+f*(p1[1]-p0[1])
        draw.line((xx,p0[1],xx,p1[1]),fill='#e8eff5',width=1)
        draw.line((p0[0],yy,p1[0],yy),fill='#e8eff5',width=1)
    order=np.argsort(depth) if depth is not None else np.arange(len(xy))
    z=points[:,2];zf=(z-z.min())/(z.max()-z.min())
    for i in order:
        x,y=xy[i]
        shade=float(zf[i]);color=(int(30+60*shade),int(101+67*shade),int(169+52*shade))
        draw.ellipse((x-1.2,y-1.2,x+1.2,y+1.2),fill=color)
    draw.rectangle((*p0,*p1),outline='#a1b5c7',width=1)
    draw.text((center[0]-30,y1-38),xlabel,font=font(19),fill='#5a7187')
    draw.text((x0+15,center[1]-10),ylabel,font=font(19),fill='#5a7187')
    draw.text((x0+20,y0+47),f'X [{points[:,0].min():.3f}, {points[:,0].max():.3f}]  Y [{points[:,1].min():.3f}, {points[:,1].max():.3f}]  Z [{points[:,2].min():.3f}, {points[:,2].max():.3f}]',font=font(15),fill='#8194a6')

panel((38,120,944,690),'Original XY',points[:,0],points[:,1],'source X','Y')
panel((976,120,1882,690),'Original XZ',points[:,0],points[:,2],'source X','Z')
panel((38,718,944,1288),'Original YZ',points[:,1],points[:,2],'source Y','Z')
az=np.deg2rad(-55);el=np.deg2rad(31)
right=np.array([-np.sin(az),np.cos(az),0.])
forward=np.array([np.cos(az)*np.cos(el),np.sin(az)*np.cos(el),np.sin(el)])
up=np.cross(forward,right)
panel((976,718,1882,1288),'Isometric display (Z-up, original axes)',points@right,points@up,'projected horizontal','up',points@forward)
path=base/'qa/lidar/source/pcl-sample-shape.png'
image.save(path)
print(path)
