from pathlib import Path
import zlib
import struct

width, height = 128, 128
pixels = bytearray()
for y in range(height):
    pixels.append(0)
    for x in range(width):
        if 32 < x < 96 and 32 < y < 96:
            pixels.extend([255, 255, 255, 255])
        else:
            pixels.extend([13, 105, 239, 255])

png = bytearray(b"\x89PNG\r\n\x1a\n")

def chunk(tag, data):
    png.extend(struct.pack('>I', len(data)))
    png.extend(tag)
    png.extend(data)
    crc = zlib.crc32(tag)
    crc = zlib.crc32(data, crc)
    png.extend(struct.pack('>I', crc & 0xFFFFFFFF))

chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
chunk(b'IDAT', zlib.compress(bytes(pixels), level=9))
chunk(b'IEND', b"")

path = Path('public/icons/icon.png')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_bytes(png)
print('created', path)
