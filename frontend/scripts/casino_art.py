"""Generates the casino artwork (lobby room, lobby stations, game backgrounds)
as hand-drawn style SVGs matching login-bg.svg: crimson walls, gold bulbs,
bokeh, a sketchy displacement filter and grain."""
import math
import random
import sys

# Usage: python3 scripts/casino_art.py public/assets/images
OUT = sys.argv[1]
W, H = 1920, 1080

# ---------------------------------------------------------------- shared defs

def defs(w=W, h=H, seed=3):
    return f'''<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#160205"/><stop offset=".55" stop-color="#4a0a10"/><stop offset="1" stop-color="#2a0407"/>
  </linearGradient>
  <linearGradient id="carpet" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a0a10"/><stop offset=".5" stop-color="#9c1520"/><stop offset="1" stop-color="#c8262c"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe7a3"/><stop offset=".5" stop-color="#e2a83c"/><stop offset="1" stop-color="#9a6416"/>
  </linearGradient>
  <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#9a6416"/><stop offset=".5" stop-color="#ffe7a3"/><stop offset="1" stop-color="#9a6416"/>
  </linearGradient>
  <linearGradient id="seat" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e2343a"/><stop offset="1" stop-color="#7a0b12"/>
  </linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6b2a14"/><stop offset="1" stop-color="#2a0c05"/>
  </linearGradient>
  <linearGradient id="drape" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3a0509"/><stop offset=".25" stop-color="#8a1018"/><stop offset=".5" stop-color="#4a070c"/>
    <stop offset=".75" stop-color="#8a1018"/><stop offset="1" stop-color="#3a0509"/>
  </linearGradient>
  <radialGradient id="felt" cx=".5" cy=".4" r=".65">
    <stop offset="0" stop-color="#2f8a63"/><stop offset=".6" stop-color="#1d6247"/><stop offset="1" stop-color="#0f3a29"/>
  </radialGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".35" stop-color="#ff8a2a" stop-opacity=".45"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="bulbG" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#fff8e0"/><stop offset=".25" stop-color="#ffd77a"/><stop offset=".6" stop-color="#ff9a30" stop-opacity=".45"/><stop offset="1" stop-color="#ff7a20" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx=".5" cy=".45" r=".75">
    <stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/>
  </radialGradient>
  <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
  <g id="bulb"><circle r="9" fill="url(#bulbG)"/><circle r="2.6" fill="#fffaf0" stroke="#a8660f" stroke-width=".8"/></g>
  <g id="spark"><path d="M0-9 1.6-1.6 9 0 1.6 1.6 0 9-1.6 1.6-9 0-1.6-1.6Z" fill="#fff1c4"/></g>
  <filter id="sketch" filterUnits="userSpaceOnUse" x="0" y="0" width="{w}" height="{h}">
    <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="{seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="soft" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="softer" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="11"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/>
  </filter>
</defs>'''


def svg(body, w=W, h=H, seed=3, slice_=True):
    par = 'xMidYMid slice' if slice_ else 'xMidYMid meet'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" preserveAspectRatio="{par}">\n'
            + defs(w, h, seed) + '\n' + body + '\n</svg>\n')


def f(x):
    return f'{x:.1f}'


def bulb(x, y, s=0.85, o=1.0):
    return f'<use href="#bulb" transform="translate({f(x)} {f(y)}) scale({s:.2f})" opacity="{o:.2f}"/>'


def bulbs_line(x1, y1, x2, y2, n, s=0.85):
    return '\n'.join(bulb(x1 + (x2 - x1) * i / (n - 1), y1 + (y2 - y1) * i / (n - 1), s) for i in range(n))


def bulbs_quad(p0, p1, p2, n, s=0.85):
    out = []
    for i in range(n):
        t = i / (n - 1)
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        out.append(bulb(x, y, s))
    return '\n'.join(out)


def bulbs_ellipse(cx, cy, rx, ry, n, s=0.7, a0=0, a1=360):
    out = []
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * i / n)
        out.append(bulb(cx + rx * math.cos(a), cy + ry * math.sin(a), s))
    return '\n'.join(out)


def bokeh(rng, n, y0=0, y1=H, rmax=16):
    out = ['<g opacity=".8">']
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(y0, y1)
        r = rng.uniform(4, rmax)
        c = rng.choice(['#ffd27a', '#ffb050', '#fff1c4', '#ff9a40'])
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{c}" opacity="{rng.uniform(.15, .45):.2f}" filter="url(#soft)"/>')
    for _ in range(n // 2):
        x, y = rng.uniform(0, W), rng.uniform(y0, y1)
        out.append(f'<use href="#spark" transform="translate({f(x)} {f(y)}) scale({rng.uniform(.4, 1.1):.2f})" opacity="{rng.uniform(.4, .9):.2f}"/>')
    out.append('</g>')
    return '\n'.join(out)


def carpet(y0, vx=960, vy=380):
    """Red carpet floor from y0 down, with a gold grid in perspective."""
    out = [f'<rect x="0" y="{y0}" width="{W}" height="{H - y0}" fill="url(#carpet)"/>',
           '<g stroke="#e2a83c" stroke-opacity=".35" stroke-width="2" fill="none">']
    for i in range(-14, 15):
        bx = vx + i * 230
        # Line from the vanishing point through (bx, H), drawn from y0 down.
        t0 = (y0 - vy) / (H - vy)
        out.append(f'<path d="M{f(vx + (bx - vx) * t0)} {y0} L{f(bx)} {H}"/>')
    for k in range(1, 9):
        y = y0 + (H - y0) * (k / 8) ** 1.7
        out.append(f'<path d="M0 {f(y)} H{W}"/>')
    out.append('</g>')
    # Glowing dots where the grid crosses.
    out.append(f'<line x1="0" y1="{y0}" x2="{W}" y2="{y0}" stroke="url(#goldH)" stroke-width="5"/>')
    return '\n'.join(out)


def chandelier(cx, cy, scale=1.0):
    out = [f'<g transform="translate({cx} {cy}) scale({scale})">',
           '<ellipse cx="0" cy="40" rx="330" ry="160" fill="url(#glow)" opacity=".5"/>',
           '<path d="M0 -200 V-20" stroke="#c88a2c" stroke-width="4"/>',
           '<path d="M-40 -40 Q0 -80 40 -40 Z" fill="url(#gold)" stroke="#5a3608" stroke-width="2"/>']
    for i, (rx, ry, y) in enumerate([(250, 38, 0), (190, 30, 55), (125, 22, 105), (70, 14, 145)]):
        out.append(f'<ellipse cx="0" cy="{y}" rx="{rx}" ry="{ry}" fill="none" stroke="url(#gold)" stroke-width="5"/>')
        n = max(10, rx // 10)
        for j in range(n):
            a = 2 * math.pi * j / n
            x, yy = rx * math.cos(a), y + ry * math.sin(a)
            out.append(f'<path d="M{f(x)} {f(yy)} v{18 + (j % 3) * 6}" stroke="#e2a83c" stroke-width="1.5"/>')
        out.append(bulbs_ellipse(0, y, rx, ry, n, 0.8))
    out.append('</g>')
    return '\n'.join(out)


def arch(x1, x2, top, bottom, bulbs=True):
    cx = (x1 + x2) / 2
    w = x2 - x1
    out = [f'<path d="M{x1} {bottom} V{top + w * .45} Q{x1} {top} {cx} {top - 10} Q{x2} {top} {x2} {top + w * .45} V{bottom}" fill="#3a060b" stroke="#1f0306" stroke-width="4"/>',
           f'<path d="M{x1 + 30} {bottom} V{top + w * .45 + 5} Q{x1 + 30} {top + 30} {cx} {top + 22} Q{x2 - 30} {top + 30} {x2 - 30} {top + w * .45 + 5} V{bottom}" fill="none" stroke="url(#gold)" stroke-width="7"/>']
    if bulbs:
        out.append(bulbs_line(x1 + 30, bottom - 40, x1 + 30, top + w * .45 + 5, 8))
        out.append(bulbs_line(x2 - 30, bottom - 40, x2 - 30, top + w * .45 + 5, 8))
        out.append(bulbs_quad((x1 + 30, top + w * .45 + 5), (x1 + 30, top + 30), (cx, top + 22), 7))
        out.append(bulbs_quad((cx, top + 22), (x2 - 30, top + 30), (x2 - 30, top + w * .45 + 5), 7))
    return '\n'.join(out)


def pillar(x, top, bottom, w=60):
    return (f'<rect x="{x}" y="{top}" width="{w}" height="{bottom - top}" fill="#5c0c13" stroke="#1f0306" stroke-width="3"/>\n'
            f'<rect x="{x + 8}" y="{top + 12}" width="{w - 16}" height="{bottom - top - 24}" fill="none" stroke="#c88a2c" stroke-width="2" opacity=".7"/>\n'
            + bulb(x + w / 2, top - 5, 0.9))


def garland(x1, y1, x2, y2, sag, n):
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2 + sag
    return (f'<path d="M{x1} {y1} Q{mx} {my} {x2} {y2}" fill="none" stroke="#c88a2c" stroke-width="3"/>\n'
            + bulbs_quad((x1, y1), (mx, my), (x2, y2), n, 0.7))


def wall_panel(x, y, w, h):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="#3d070c" stroke="#1f0306" stroke-width="3"/>\n'
            f'<rect x="{x + 12}" y="{y + 12}" width="{w - 24}" height="{h - 24}" rx="4" fill="none" stroke="#c88a2c" stroke-width="2" opacity=".6"/>')


def finish(rng, bokeh_n=70):
    return (bokeh(rng, bokeh_n) + '\n'
            + f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>\n'
            + f'<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".18"/>')


# ----------------------------------------------------------------- the lobby

def lobby_room():
    rng = random.Random(7)
    b = [f'<rect width="{W}" height="{H}" fill="url(#wall)"/>',
         '<ellipse cx="960" cy="330" rx="900" ry="420" fill="url(#glow)" opacity=".45"/>',
         '<g filter="url(#sketch)" stroke-linejoin="round" stroke-linecap="round">']
    # Wall panels and pillars along the back wall.
    for x in (40, 330, 1450, 1740):
        b.append(wall_panel(x, 170, 150, 380))
    for x in (230, 1630):
        b.append(pillar(x, 150, 640))
    b.append(arch(640, 1280, 150, 640))
    b.append(pillar(560, 230, 640))
    b.append(pillar(1300, 230, 640))
    b.append('</g>')
    b.append(carpet(640))
    b.append(chandelier(960, 215, 0.8))
    b.append(garland(0, 60, 640, 120, 90, 16))
    b.append(garland(1280, 120, 1920, 60, 90, 16))
    # Pools of light on the carpet where the tables stand.
    for x in (270, 730, 1190, 1650):
        b.append(f'<ellipse cx="{x}" cy="900" rx="300" ry="90" fill="url(#glow)" opacity=".25"/>')
    b.append(finish(rng, 60))
    return svg('\n'.join(b), seed=3)


# -------------------------------------------------------------- the stations
# Each station is drawn in its own 440x560 box: dealer behind the table,
# the table with the game's props, stools in front. The banner and its
# chains are drawn by the page so they can light up.

SW, SH = 440, 560
# Skin: base, shadow, lips.
SKIN = {
    'light': ('#f2c6a2', '#d79c79', '#c4656a'),
    'tan': ('#dba57c', '#b87c56', '#a8554f'),
    'brown': ('#a8693f', '#7f4a29', '#7a3a34'),
    'dark': ('#6e4028', '#4c2a17', '#5a2a26'),
}
INK = '#2a0c05'
HEAD_Y = 118  # centre of the dealer's face in the station box
SHOULDER_Y = 166


def face_shape(cx, hy):
    # Rounded head, a little narrower at the chin.
    return (f'M{cx - 30} {hy - 6} C{cx - 31} {hy + 22} {cx - 20} {hy + 39} {cx} {hy + 40} '
            f'C{cx + 20} {hy + 39} {cx + 31} {hy + 22} {cx + 30} {hy - 6} '
            f'C{cx + 30} {hy - 34} {cx + 17} {hy - 45} {cx} {hy - 45} '
            f'C{cx - 17} {hy - 45} {cx - 30} {hy - 34} {cx - 30} {hy - 6}Z')


def features(cx, hy, skin, eye='#4a2a14', brow='#2a120a', female=False):
    """A friendly illustrated face: dark eyes with a glint, light brows, a
    small nose and a smile."""
    base, shade, lip = SKIN[skin]
    b = []
    for side in (-1, 1):
        ex, ey = cx + side * 12, hy + 2
        b.append(f'<ellipse cx="{ex}" cy="{ey}" rx="3.6" ry="4.6" fill="#1e0a04"/>')
        b.append(f'<circle cx="{ex + 1.2}" cy="{ey - 1.6}" r="1.2" fill="#fff"/>')
        if female:
            b.append(f'<path d="M{ex + side * 3} {ey - 3.5} l{side * 3.5} -2.5" stroke="{INK}" stroke-width="1.6"/>')
        b.append(f'<path d="M{ex - 6} {ey - 9} Q{ex} {ey - 12.5} {ex + 6} {ey - 9}" fill="none" stroke="{brow}" stroke-width="{2 if female else 2.6}"/>')
    b.append(f'<path d="M{cx - 3} {hy + 16} Q{cx} {hy + 19} {cx + 3} {hy + 16}" fill="none" stroke="{shade}" stroke-width="2"/>')
    ly = hy + 25
    b.append(f'<path d="M{cx - 9} {ly} Q{cx} {ly + 9} {cx + 9} {ly} Q{cx} {ly + 3} {cx - 9} {ly}Z" fill="{lip}" stroke="{INK}" stroke-width="1.6"/>')
    for side in (-1, 1):
        b.append(f'<ellipse cx="{cx + side * 19}" cy="{hy + 15}" rx="6.5" ry="4" fill="#e0675a" opacity="{.35 if female else .22}"/>')
    return '\n'.join(b)


def hair_back(style, cx, hy, color):
    s = '#140502'
    if style == 'long':
        return (f'<path d="M{cx - 36} {hy - 14} C{cx - 46} {hy + 40} {cx - 44} {hy + 80} {cx - 50} {hy + 112} '
                f'L{cx + 50} {hy + 112} C{cx + 44} {hy + 80} {cx + 46} {hy + 40} {cx + 36} {hy - 14} '
                f'C{cx + 30} {hy - 58} {cx - 30} {hy - 58} {cx - 36} {hy - 14}Z" fill="{color}" stroke="{s}" stroke-width="2.5"/>')
    if style == 'bun':
        return (f'<ellipse cx="{cx + 4}" cy="{hy - 52}" rx="19" ry="15" fill="{color}" stroke="{s}" stroke-width="2.5"/>'
                f'<path d="M{cx - 8} {hy - 56} Q{cx + 4} {hy - 64} {cx + 16} {hy - 54}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>')
    return ''


def hair_front(style, cx, hy, color, light):
    s = '#140502'
    sheen = f'stroke="{light}" stroke-opacity=".5" stroke-width="2" fill="none"'
    if style == 'side_part':
        # Short, parted on the left, swept right; trimmed sideburns.
        return (f'<path d="M{cx - 31} {hy + 4} C{cx - 36} {hy - 36} {cx - 16} {hy - 54} {cx + 6} {hy - 52} '
                f'C{cx + 28} {hy - 51} {cx + 38} {hy - 32} {cx + 31} {hy + 4} '
                f'L{cx + 28} {hy - 10} C{cx + 24} {hy - 28} {cx + 12} {hy - 34} {cx - 4} {hy - 32} '
                f'C{cx - 16} {hy - 30} {cx - 24} {hy - 22} {cx - 27} {hy - 10}Z" fill="{color}" stroke="{s}" stroke-width="2.5"/>'
                f'<path d="M{cx - 14} {hy - 50} Q{cx - 12} {hy - 40} {cx - 10} {hy - 33}" stroke="{s}" stroke-width="1.5" fill="none"/>'
                f'<path d="M{cx - 6} {hy - 46} Q{cx + 14} {hy - 48} {cx + 26} {hy - 30}" {sheen}/>'
                f'<path d="M{cx + 2} {hy - 40} Q{cx + 16} {hy - 40} {cx + 22} {hy - 26}" {sheen}/>')
    if style == 'bun':
        # Pulled back smooth with a centre part and two loose strands.
        return (f'<path d="M{cx - 31} {hy - 2} C{cx - 34} {hy - 40} {cx - 14} {hy - 50} {cx} {hy - 50} '
                f'C{cx + 14} {hy - 50} {cx + 34} {hy - 40} {cx + 31} {hy - 2} '
                f'C{cx + 26} {hy - 26} {cx + 14} {hy - 34} {cx + 1} {hy - 34} '
                f'C{cx - 14} {hy - 34} {cx - 26} {hy - 26} {cx - 31} {hy - 2}Z" fill="{color}" stroke="{s}" stroke-width="2.5"/>'
                f'<path d="M{cx} {hy - 50} V{hy - 35}" stroke="{s}" stroke-width="1.5"/>'
                f'<path d="M{cx - 26} {hy - 30} Q{cx - 34} {hy - 4} {cx - 30} {hy + 14}" fill="none" stroke="{color}" stroke-width="3"/>'
                f'<path d="M{cx - 18} {hy - 44} Q{cx - 8} {hy - 48} {cx - 4} {hy - 46}" {sheen}/>'
                f'<path d="M{cx + 6} {hy - 46} Q{cx + 18} {hy - 46} {cx + 24} {hy - 36}" {sheen}/>')
    if style == 'long':
        # Straight fringe across the forehead.
        return (f'<path d="M{cx - 32} {hy - 4} C{cx - 36} {hy - 44} {cx - 16} {hy - 54} {cx} {hy - 54} '
                f'C{cx + 16} {hy - 54} {cx + 36} {hy - 44} {cx + 32} {hy - 4} '
                f'L{cx + 28} {hy - 16} L{cx + 22} {hy - 12} L{cx + 16} {hy - 17} L{cx + 8} {hy - 13} L{cx} {hy - 17} '
                f'L{cx - 8} {hy - 13} L{cx - 16} {hy - 17} L{cx - 22} {hy - 12} L{cx - 28} {hy - 16}Z" fill="{color}" stroke="{s}" stroke-width="2.5"/>'
                f'<path d="M{cx - 20} {hy - 46} Q{cx} {hy - 52} {cx + 18} {hy - 46}" {sheen}/>')
    if style == 'cropped':
        # Close-cropped hair with a textured hairline and a trimmed beard.
        dots = ''.join(f'<circle cx="{cx + dx}" cy="{hy + dy}" r="1.3" fill="{light}" opacity=".35"/>'
                       for dx, dy in ((-18, -36), (-6, -42), (8, -40), (20, -34), (-24, -24), (24, -22), (0, -32), (-12, -30), (12, -30)))
        return (f'<path d="M{cx - 30} {hy - 4} C{cx - 33} {hy - 40} {cx - 16} {hy - 50} {cx} {hy - 50} '
                f'C{cx + 16} {hy - 50} {cx + 33} {hy - 40} {cx + 30} {hy - 4} '
                f'C{cx + 27} {hy - 22} {cx + 18} {hy - 28} {cx} {hy - 29} C{cx - 18} {hy - 28} {cx - 27} {hy - 22} {cx - 30} {hy - 4}Z" fill="{color}" stroke="{s}" stroke-width="2.5"/>'
                + dots)
    return ''


def facial_hair(style, cx, hy, color):
    if style == 'mustache':
        return f'<path d="M{cx - 13} {hy + 26} Q{cx - 7} {hy + 19} {cx} {hy + 23} Q{cx + 7} {hy + 19} {cx + 13} {hy + 26} Q{cx + 6} {hy + 24} {cx} {hy + 25.5} Q{cx - 6} {hy + 24} {cx - 13} {hy + 26}Z" fill="{color}" stroke="#140502" stroke-width="1.2"/>'
    if style == 'beard':
        # Around the jaw and chin, leaving the mouth clear.
        return (f'<path d="M{cx - 29} {hy + 6} C{cx - 28} {hy + 26} {cx - 16} {hy + 44} {cx} {hy + 45} C{cx + 16} {hy + 44} {cx + 28} {hy + 26} {cx + 29} {hy + 6} '
                f'C{cx + 24} {hy + 22} {cx + 16} {hy + 34} {cx} {hy + 36} C{cx - 16} {hy + 34} {cx - 24} {hy + 22} {cx - 29} {hy + 6}Z" fill="{color}" opacity=".9" stroke="#140502" stroke-width="1.5"/>'
                f'<path d="M{cx - 12} {hy + 25} Q{cx} {hy + 19} {cx + 12} {hy + 25}" fill="none" stroke="{color}" stroke-width="3.5"/>')
    return ''


def dealer(cx, skin, hair_style, hair_color, hair_light, jacket='#1c0a08', tie='#c8262c', eye='#4a2a14',
           facial='', female=False, earrings=False):
    """Dealer from the waist up, standing behind the table. Hands are drawn
    separately (hands()) on top of the table."""
    base, shade, _ = SKIN[skin]
    hy, sy = HEAD_Y, SHOULDER_Y
    b = [hair_back(hair_style, cx, hy, hair_color)]
    # Shirt underneath, then the jacket with sloping shoulders and sleeves.
    b.append(f'<path d="M{cx - 90} 310 C{cx - 92} {sy + 40} {cx - 80} {sy + 8} {cx - 50} {sy} L{cx + 50} {sy} C{cx + 80} {sy + 8} {cx + 92} {sy + 40} {cx + 90} 310Z" fill="#f4ede0" stroke="{INK}" stroke-width="2.5"/>')
    b.append(f'<path d="M{cx - 90} 310 C{cx - 92} {sy + 40} {cx - 80} {sy + 8} {cx - 50} {sy} L{cx - 16} {sy - 4} L{cx - 4} {sy + 70} L{cx - 14} 310Z" fill="{jacket}" stroke="{INK}" stroke-width="2.5"/>')
    b.append(f'<path d="M{cx + 90} 310 C{cx + 92} {sy + 40} {cx + 80} {sy + 8} {cx + 50} {sy} L{cx + 16} {sy - 4} L{cx + 4} {sy + 70} L{cx + 14} 310Z" fill="{jacket}" stroke="{INK}" stroke-width="2.5"/>')
    # Lapels and the seam where each sleeve meets the body.
    for side in (-1, 1):
        b.append(f'<path d="M{cx + side * 16} {sy - 4} L{cx + side * 34} {sy + 30} L{cx + side * 22} {sy + 34} L{cx + side * 6} {sy + 72}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="2"/>')
        b.append(f'<path d="M{cx + side * 62} {sy + 30} Q{cx + side * 58} {sy + 80} {cx + side * 60} 300" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="2.5"/>')
    # Shirt collar, buttons, bow tie and a brass name badge.
    b.append(f'<path d="M{cx - 15} {sy - 6} L{cx - 4} {sy + 12} L{cx} {sy + 2} L{cx + 4} {sy + 12} L{cx + 15} {sy - 6}" fill="#fbf6ee" stroke="{INK}" stroke-width="1.5"/>')
    for dy in (34, 52):
        b.append(f'<circle cx="{cx}" cy="{sy + dy}" r="2" fill="#d8cfc0" stroke="{INK}" stroke-width=".8"/>')
    b.append(f'<path d="M{cx} {sy + 6} L{cx - 17} {sy - 2} Q{cx - 20} {sy + 6} {cx - 17} {sy + 14}Z M{cx} {sy + 6} L{cx + 17} {sy - 2} Q{cx + 20} {sy + 6} {cx + 17} {sy + 14}Z" fill="{tie}" stroke="{INK}" stroke-width="1.5"/>')
    b.append(f'<rect x="{cx - 4}" y="{sy + 1.5}" width="8" height="9" rx="2" fill="{tie}" stroke="{INK}" stroke-width="1.5"/>')
    b.append(f'<rect x="{cx + 32}" y="{sy + 44}" width="24" height="8" rx="2" fill="url(#gold)" stroke="#5a3608" stroke-width="1"/>')
    # Neck with the jaw's shadow.
    b.append(f'<path d="M{cx - 15} {hy + 26} L{cx - 17} {sy - 2} Q{cx} {sy + 6} {cx + 17} {sy - 2} L{cx + 15} {hy + 26}Z" fill="{base}" stroke="{INK}" stroke-width="2"/>')
    b.append(f'<path d="M{cx - 13} {hy + 30} Q{cx} {hy + 48} {cx + 13} {hy + 30} V{hy + 40} Q{cx} {hy + 52} {cx - 13} {hy + 40}Z" fill="{shade}" opacity=".6"/>')
    # Ears, head, face.
    for side in (-1, 1):
        b.append(f'<ellipse cx="{cx + side * 30}" cy="{hy + 4}" rx="6" ry="10" fill="{base}" stroke="{INK}" stroke-width="2"/>')
        b.append(f'<path d="M{cx + side * 31} {hy} q{side * 2} 4 0 8" fill="none" stroke="{shade}" stroke-width="1.5"/>')
        if earrings:
            b.append(f'<circle cx="{cx + side * 30}" cy="{hy + 16}" r="3.2" fill="url(#gold)" stroke="#5a3608" stroke-width="1"/>')
    b.append(f'<path d="{face_shape(cx, hy)}" fill="{base}" stroke="{INK}" stroke-width="2.5"/>')
    b.append(features(cx, hy, skin, eye, hair_color, female))
    b.append(facial_hair(facial, cx, hy, hair_color))
    b.append(hair_front(hair_style, cx, hy, hair_color, hair_light))
    return '\n'.join(b)


def hands(cx, y, skin, jacket, spread=60):
    """Forearms resting on the table edge, hands flat toward the players."""
    base, shade, _ = SKIN[skin]
    out = []
    for side in (-1, 1):
        x = cx + side * spread
        out.append(f'<path d="M{x + side * 22} {y - 26} Q{x + side * 18} {y - 6} {x + side * 4} {y + 2} L{x - side * 10} {y - 6} Q{x + side * 4} {y - 18} {x + side * 4} {y - 30}Z" fill="{jacket}" stroke="{INK}" stroke-width="2"/>')
        out.append(f'<path d="M{x + side * 2} {y + 2} L{x - side * 12} {y - 6} L{x - side * 15} {y - 1} L{x - side * 1} {y + 7}Z" fill="#fbf6ee" stroke="{INK}" stroke-width="1.5"/>')
        out.append(f'<path d="M{x - side * 14} {y - 2} C{x - side * 30} {y - 4} {x - side * 34} {y + 6} {x - side * 26} {y + 10} '
                   f'C{x - side * 18} {y + 13} {x - side * 6} {y + 10} {x - side * 2} {y + 6}Z" fill="{base}" stroke="{INK}" stroke-width="1.8"/>')
        for k in range(3):
            out.append(f'<path d="M{x - side * (20 + k * 4)} {y + 1 + k} l{-side * 3} 6" stroke="{shade}" stroke-width="1.2"/>')
    return '\n'.join(out)


def card(x, y, rot=0, red=True, s=1.0, back=False):
    w, h = 26 * s, 36 * s
    if back:
        inner = f'<rect x="{-w / 2 + 3}" y="{-h / 2 + 3}" width="{w - 6}" height="{h - 6}" rx="2" fill="#8a1018" stroke="#e2a83c" stroke-width="1"/>'
    else:
        c = '#c8262c' if red else '#1a0804'
        inner = f'<path d="M0 {-6 * s} L{5 * s} 0 L0 {6 * s} L{-5 * s} 0Z" fill="{c}"/>' if red else f'<circle r="{5 * s}" fill="{c}"/>'
    return (f'<g transform="translate({f(x)} {f(y)}) rotate({rot}) scale(1 .62)">'
            f'<rect x="{-w / 2}" y="{-h / 2}" width="{w}" height="{h}" rx="3" fill="#fbf6ea" stroke="#2a0c05" stroke-width="2"/>{inner}</g>')


CHIP = {'red': '#c8262c', 'blue': '#2f5fb3', 'green': '#2f8a4a', 'black': '#1a1a1a', 'gold': '#e2a83c', 'purple': '#6a2c8a'}


def chips(x, y, color, n=4, r=11):
    out = []
    for i in range(n):
        yy = y - i * 4.5
        out.append(f'<ellipse cx="{f(x)}" cy="{f(yy)}" rx="{r}" ry="{r * .45}" fill="{CHIP[color]}" stroke="#1a0804" stroke-width="1.5"/>')
    out.append(f'<ellipse cx="{f(x)}" cy="{f(y - (n - 1) * 4.5)}" rx="{r * .55}" ry="{r * .25}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 3"/>')
    return '\n'.join(out)


def chip_tray(cx, cy, w=150):
    out = [f'<rect x="{cx - w / 2}" y="{cy - 12}" width="{w}" height="24" rx="5" fill="#2a0c05" stroke="#c88a2c" stroke-width="2"/>']
    cols = ['red', 'blue', 'green', 'black', 'purple', 'gold']
    n = len(cols)
    for i, c in enumerate(cols):
        x = cx - w / 2 + 12 + i * (w - 24) / (n - 1)
        out.append(f'<rect x="{f(x - 9)}" y="{cy - 9}" width="18" height="18" rx="4" fill="{CHIP[c]}" stroke="#1a0804" stroke-width="1.5"/>')
        for k in range(3):
            out.append(f'<line x1="{f(x - 9)}" y1="{cy - 5 + k * 5}" x2="{f(x + 9)}" y2="{cy - 5 + k * 5}" stroke="#000" stroke-opacity=".35"/>')
    return '\n'.join(out)


def stool(cx, top, s=1.0):
    return (f'<g transform="translate({cx} {top}) scale({s})">'
            '<ellipse cx="0" cy="92" rx="40" ry="10" fill="url(#shadow)"/>'
            '<path d="M-6 60 V90 M6 60 V90" stroke="#c88a2c" stroke-width="4"/>'
            '<path d="M-34 66 Q-36 0 0 -4 Q36 0 34 66 Z" fill="url(#seat)" stroke="#1f0306" stroke-width="3"/>'
            '<path d="M-22 56 Q-22 14 0 10 Q22 14 22 56" fill="none" stroke="#f0a0a0" stroke-width="2" opacity=".5"/>'
            '<rect x="-38" y="60" width="76" height="16" rx="7" fill="#7a0b12" stroke="#1f0306" stroke-width="3"/>'
            '</g>')


def d_table(cx, cy, rx=205, ry=72, skirt=60):
    """Half-moon table seen from the players' side: flat edge at the dealer."""
    top = (f'M{cx - rx} {cy - ry * .45} L{cx + rx} {cy - ry * .45} '
           f'A{rx} {ry * 1.45} 0 0 1 {cx - rx} {cy - ry * .45}Z')
    return [
        f'<ellipse cx="{cx}" cy="{cy + skirt + 50}" rx="{rx + 30}" ry="{ry * .6}" fill="url(#shadow)"/>',
        # Wooden skirt.
        f'<path d="M{cx - rx} {cy - ry * .45} A{rx} {ry * 1.45} 0 0 0 {cx + rx} {cy - ry * .45} V{cy - ry * .45 + skirt * .4} A{rx} {ry * 1.45} 0 0 1 {cx - rx} {cy - ry * .45 + skirt * .4}Z" fill="url(#wood)" stroke="#1a0804" stroke-width="3" transform="translate(0 {skirt * .6})"/>',
        f'<path d="M{cx - rx} {cy - ry * .45} V{cy - ry * .45 + skirt} M{cx + rx} {cy - ry * .45} V{cy - ry * .45 + skirt}" stroke="#1a0804" stroke-width="3"/>',
        f'<path d="M{cx - rx} {cy - ry * .45} A{rx} {ry * 1.45} 0 0 0 {cx + rx} {cy - ry * .45} V{cy - ry * .45 + skirt} A{rx} {ry * 1.45} 0 0 1 {cx - rx} {cy - ry * .45 + skirt}Z" fill="url(#wood)" stroke="#1a0804" stroke-width="3"/>',
        # Padded rail and felt.
        f'<path d="{top}" fill="#3b1712" stroke="#1a0804" stroke-width="3"/>',
        f'<path d="M{cx - rx + 16} {cy - ry * .45 + 4} L{cx + rx - 16} {cy - ry * .45 + 4} A{rx - 16} {ry * 1.45 - 14} 0 0 1 {cx - rx + 16} {cy - ry * .45 + 4}Z" fill="url(#felt)" stroke="#e2a83c" stroke-width="2"/>',
    ]


def station(game):
    cx = SW / 2
    b = ['<g filter="url(#sketch)" stroke-linejoin="round" stroke-linecap="round">']
    table_y = 330
    if game == 'blackjack':
        b.append(dealer(cx, 'tan', 'side_part', '#3a1a0c', '#8a5a34', facial='mustache'))
        b += d_table(cx, table_y)
        b.append(chip_tray(cx, table_y - 12))
        b.append(hands(cx, 306, 'tan', '#1c0a08', 96))
        b.append(card(cx - 60, table_y + 10, -8, True) + card(cx - 40, table_y + 12, 4, False, back=True))
        # Betting circles along the curve, some with chips and cards.
        for i, a in enumerate((160, 125, 90, 55, 20)):
            r = math.radians(a)
            x, y = cx + 150 * math.cos(r), table_y + 14 + 58 * math.sin(r)
            b.append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="17" ry="8" fill="none" stroke="#e2a83c" stroke-width="2"/>')
            if i in (1, 2, 4):
                b.append(chips(x, y, ['red', 'green', 'blue'][i % 3], 3, 10))
                b.append(card(x - 6, y - 22, -6, i % 2 == 0) + card(x + 8, y - 20, 8, i % 2 == 1))
        b.append(f'<text x="{cx}" y="{table_y + 46}" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="#e2a83c" opacity=".8" letter-spacing="2">PAYS 3 TO 2</text>')
    elif game == 'baccarat':
        b.append(dealer(cx, 'light', 'long', '#1a0f0a', '#6a4a3a', jacket='#3a0509', tie='#e2a83c', eye='#2a1a10', female=True, earrings=True))
        b += d_table(cx, table_y)
        b.append(chip_tray(cx, table_y - 12, 130))
        b.append(hands(cx, 306, 'light', '#3a0509', 92))
        # Player / Tie / Banker boxes printed on the felt.
        for x, col, label in ((cx - 95, '#2f5fb3', 'PLAYER'), (cx, '#2f8a4a', 'TIE'), (cx + 95, '#c8262c', 'BANKER')):
            b.append(f'<rect x="{x - 40}" y="{table_y + 18}" width="80" height="30" rx="8" fill="{col}" fill-opacity=".35" stroke="{col}" stroke-width="2.5"/>')
            b.append(f'<text x="{x}" y="{table_y + 38}" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-weight="bold" fill="#fbf6ea" letter-spacing="1">{label}</text>')
        b.append(chips(cx - 95, table_y + 70, 'blue', 3, 10) + chips(cx + 95, table_y + 72, 'red', 5, 10))
        b.append(card(cx - 60, table_y + 6, -5, True) + card(cx - 40, table_y + 6, 6, False))
        b.append(card(cx + 40, table_y + 6, -4, False) + card(cx + 60, table_y + 6, 5, True))
    elif game == 'poker':
        b.append(dealer(cx, 'brown', 'bun', '#2a120a', '#7a4a2a', jacket='#14281f', eye='#3a2010', female=True, earrings=True))
        ry = 70
        b.append(f'<ellipse cx="{cx}" cy="{table_y + 100}" rx="235" ry="50" fill="url(#shadow)"/>')
        b.append(f'<path d="M{cx - 210} {table_y + 10} V{table_y + 55} A210 {ry} 0 0 0 {cx + 210} {table_y + 55} V{table_y + 10}Z" fill="url(#wood)" stroke="#1a0804" stroke-width="3"/>')
        b.append(f'<ellipse cx="{cx}" cy="{table_y + 10}" rx="210" ry="{ry}" fill="#3b1712" stroke="#1a0804" stroke-width="3"/>')
        b.append(f'<ellipse cx="{cx}" cy="{table_y + 10}" rx="190" ry="{ry - 14}" fill="url(#felt)" stroke="#e2a83c" stroke-width="2"/>')
        for i in range(5):
            b.append(card(cx - 64 + i * 32, table_y + 8, 0, i % 2 == 0, back=i == 4))
        b.append(chips(cx - 30, table_y + 48, 'red', 5, 11) + chips(cx, table_y + 50, 'black', 3, 11) + chips(cx + 30, table_y + 48, 'gold', 4, 11))
        b.append(f'<ellipse cx="{cx + 120}" cy="{table_y + 30}" rx="13" ry="7" fill="#fbf6ea" stroke="#1a0804" stroke-width="2"/>'
                 f'<text x="{cx + 120}" y="{table_y + 34}" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-weight="bold" fill="#1a0804">D</text>')
        for x in (cx - 150, cx + 150):
            b.append(card(x, table_y + 20, -10, False, back=True) + card(x + 12, table_y + 20, 8, False, back=True))
        b.append(hands(cx, 282, 'brown', '#14281f', 88))
    elif game == 'roulette':
        b.append(dealer(cx + 70, 'dark', 'cropped', '#1a0804', '#5a3a2a', facial='beard', eye='#2a1408'))
        # Long table: wheel on the left, betting layout on the right.
        b.append(f'<ellipse cx="{cx}" cy="{table_y + 110}" rx="240" ry="40" fill="url(#shadow)"/>')
        b.append(f'<path d="M10 {table_y + 50} L430 {table_y + 50} V{table_y + 100} H10Z" fill="url(#wood)" stroke="#1a0804" stroke-width="3"/>')
        b.append(f'<path d="M30 {table_y - 30} L410 {table_y - 30} L430 {table_y + 50} L10 {table_y + 50}Z" fill="#3b1712" stroke="#1a0804" stroke-width="3"/>')
        b.append(f'<path d="M44 {table_y - 20} L396 {table_y - 20} L414 {table_y + 42} L26 {table_y + 42}Z" fill="url(#felt)" stroke="#e2a83c" stroke-width="2"/>')
        # Betting grid in perspective.
        gx0, gx1, gy0, gy1 = 190, 400, table_y - 14, table_y + 36
        for row in range(3):
            for col in range(8):
                t0, t1 = row / 3, (row + 1) / 3
                y0, y1 = gy0 + (gy1 - gy0) * t0, gy0 + (gy1 - gy0) * t1
                def xx(c, t):
                    left = gx0 - 8 * t
                    right = gx1 + 10 * t
                    return left + (right - left) * c / 8
                color = '#c8262c' if (row + col) % 2 == 0 else '#1a0804'
                b.append(f'<path d="M{f(xx(col, t0))} {f(y0)} L{f(xx(col + 1, t0))} {f(y0)} L{f(xx(col + 1, t1))} {f(y1)} L{f(xx(col, t1))} {f(y1)}Z" fill="{color}" fill-opacity=".85" stroke="#e2a83c" stroke-width="1"/>')
        b.append(chips(250, table_y + 8, 'gold', 3, 9) + chips(330, table_y - 4, 'blue', 2, 9) + chips(370, table_y + 26, 'red', 4, 9))
        # The wheel.
        wx, wy = 110, table_y + 10
        b.append(f'<ellipse cx="{wx}" cy="{wy + 6}" rx="92" ry="40" fill="url(#wood)" stroke="#1a0804" stroke-width="3"/>')
        b.append(f'<ellipse cx="{wx}" cy="{wy}" rx="86" ry="36" fill="#3b1712" stroke="#c88a2c" stroke-width="3"/>')
        n = 18
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            col = '#2f8a4a' if i == 0 else ('#c8262c' if i % 2 else '#1a0804')
            p = [(wx + 72 * math.cos(a0), wy + 30 * math.sin(a0)), (wx + 72 * math.cos(a1), wy + 30 * math.sin(a1)),
                 (wx + 48 * math.cos(a1), wy + 20 * math.sin(a1)), (wx + 48 * math.cos(a0), wy + 20 * math.sin(a0))]
            b.append('<path d="M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in p) + 'Z" fill="' + col + '" stroke="#e2a83c" stroke-width=".8"/>')
        b.append(f'<ellipse cx="{wx}" cy="{wy}" rx="46" ry="19" fill="url(#gold)" stroke="#5a3608" stroke-width="2"/>')
        b.append(f'<path d="M{wx} {wy - 26} V{wy - 6} M{wx - 22} {wy} H{wx + 22}" stroke="#5a3608" stroke-width="4"/>')
        b.append(f'<circle cx="{wx}" cy="{wy - 28}" r="6" fill="url(#gold)" stroke="#5a3608" stroke-width="2"/>')
        b.append(f'<circle cx="{wx + 60}" cy="{wy + 18}" r="4.5" fill="#fff" stroke="#888"/>')
        b.append(hands(cx + 70, 306, 'dark', '#1c0a08', 70))
    b.append('</g>')
    # Stools for the players.
    for x, s in ((cx - 140, .9), (cx, .95), (cx + 140, .9)):
        b.append(f'<g filter="url(#sketch)">{stool(x, 425, s)}</g>')
    return svg('\n'.join(b), SW, SH, seed=5, slice_=False)


# ---------------------------------------------------------- game backgrounds
# The floor around each game's table, seen from above like the table itself:
# an even, patterned casino carpet in the game's own colour.

SUIT = {
    'spade': 'M0 -11 C7 -4 13 0 9 6 C6 10 2 8 1 6 L3 12 H-3 L-1 6 C-2 8 -6 10 -9 6 C-13 0 -7 -4 0 -11Z',
    'heart': 'M0 10 C-13 2 -11 -9 -4.5 -9 C-1.5 -9 0 -6 0 -4.5 C0 -6 1.5 -9 4.5 -9 C11 -9 13 2 0 10Z',
    'diamond': 'M0 -12 L8.5 0 L0 12 L-8.5 0Z',
    'club': 'M0 -11 A5 5 0 1 1 -.1 -11ZM-6 -1 A5 5 0 1 1 -6.1 -1ZM6 -1 A5 5 0 1 1 5.9 -1ZM-1.5 2 L-3 12 H3 L1.5 2Z',
}


def suit(name, x, y, s=1.0, fill='#e2a83c', o=1.0, rot=0):
    if name == 'club':
        return (f'<g transform="translate({f(x)} {f(y)}) rotate({rot}) scale({s})" fill="{fill}" opacity="{o}">'
                '<circle cx="0" cy="-6" r="5"/><circle cx="-5.5" cy="1" r="5"/><circle cx="5.5" cy="1" r="5"/><path d="M-1.5 2 L-3.5 12 H3.5 L1.5 2Z"/></g>')
    return f'<path d="{SUIT[name]}" transform="translate({f(x)} {f(y)}) rotate({rot}) scale({s})" fill="{fill}" opacity="{o}"/>'


def floor(pattern_id, size, motif, color):
    """Full-bleed carpet in one solid colour with a soft repeating motif."""
    return [f'<defs><pattern id="{pattern_id}" patternUnits="userSpaceOnUse" width="{size}" height="{size}">{motif}</pattern></defs>',
            f'<rect width="{W}" height="{H}" fill="{color}"/>',
            f'<g filter="url(#sketch)" opacity=".6"><rect width="{W}" height="{H}" fill="url(#{pattern_id})"/></g>']


def bg_blackjack():
    m = ('<path d="M80 0 L160 80 L80 160 L0 80Z" fill="none" stroke="#e2a83c" stroke-width="2" opacity=".35"/>'
         + suit('spade', 80, 80, 1.3, '#e2a83c', .55) + suit('heart', 0, 0, 1.1, '#e04848', .45)
         + suit('heart', 160, 0, 1.1, '#e04848', .45) + suit('heart', 0, 160, 1.1, '#e04848', .45) + suit('heart', 160, 160, 1.1, '#e04848', .45))
    b = floor('rug', 160, m, '#6e1019')
    b.append(f'<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".15"/>')
    return svg('\n'.join(b), seed=8)


def bg_baccarat():
    m = ('<circle cx="100" cy="100" r="36" fill="none" stroke="#e2a83c" stroke-width="2.5" opacity=".5"/>'
         + ''.join(f'<ellipse cx="100" cy="58" rx="9" ry="16" fill="#e2a83c" opacity=".32" transform="rotate({k * 45} 100 100)"/>' for k in range(8))
         + '<circle cx="100" cy="100" r="8" fill="#e2a83c" opacity=".55"/>'
         + ''.join(suit('diamond', x, y, .8, '#e2a83c', .4) for x, y in ((0, 0), (200, 0), (0, 200), (200, 200)))
         + '<path d="M0 100 H40 M160 100 H200 M100 0 V40 M100 160 V200" stroke="#e2a83c" stroke-width="1.5" opacity=".35"/>')
    b = floor('rug', 200, m, '#4a0a1e')
    b.append(f'<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".15"/>')
    return svg('\n'.join(b), seed=9)


def bg_roulette():
    seg = []
    for k in range(12):
        a0, a1 = math.radians(k * 30), math.radians(k * 30 + 30)
        col = '#c8262c' if k % 2 else '#1a0804'
        p = [(90 + 44 * math.cos(a0), 90 + 44 * math.sin(a0)), (90 + 44 * math.cos(a1), 90 + 44 * math.sin(a1)),
             (90 + 28 * math.cos(a1), 90 + 28 * math.sin(a1)), (90 + 28 * math.cos(a0), 90 + 28 * math.sin(a0))]
        seg.append('<path d="M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in p) + f'Z" fill="{col}" opacity=".38"/>')
    m = (''.join(seg) + '<circle cx="90" cy="90" r="46" fill="none" stroke="#e2a83c" stroke-width="2.5" opacity=".6"/>'
         '<circle cx="90" cy="90" r="27" fill="none" stroke="#e2a83c" stroke-width="2" opacity=".5"/><circle cx="90" cy="90" r="7" fill="#e2a83c" opacity=".6"/>'
         + ''.join(f'<circle cx="{x}" cy="{y}" r="4" fill="#e2a83c" opacity=".45"/>' for x, y in ((0, 0), (180, 0), (0, 180), (180, 180))))
    b = floor('rug', 220, m, '#5a0c12')
    b.append(f'<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".15"/>')
    return svg('\n'.join(b), seed=10)


def bg_poker():
    m = ('<path d="M0 0 H150 V150 H0Z" fill="none" stroke="#e2a83c" stroke-width="1.5" opacity=".25"/>'
         + suit('spade', 37, 37, 1.1, '#e2a83c', .5) + suit('heart', 112, 37, 1.1, '#e04848', .45)
         + suit('diamond', 37, 112, 1.1, '#e04848', .45) + suit('club', 112, 112, 1.1, '#e2a83c', .5))
    b = floor('rug', 150, m, '#123a2a')
    b.append(f'<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".15"/>')
    return svg('\n'.join(b), seed=12)


files = {
    'lobby-room.svg': lobby_room(),
    'lobby-blackjack.svg': station('blackjack'),
    'lobby-poker.svg': station('poker'),
    'lobby-baccarat.svg': station('baccarat'),
    'lobby-roulette.svg': station('roulette'),
    'bg-blackjack.svg': bg_blackjack(),
    'bg-baccarat.svg': bg_baccarat(),
    'bg-roulette.svg': bg_roulette(),
    'bg-poker.svg': bg_poker(),
}
for name, content in files.items():
    with open(f'{OUT}/{name}', 'w') as fh:
        fh.write(content)
    print(name, len(content) // 1024, 'KB')
