"""Pack the already rendered PNG sizes into Safari-compatible BMP ICO entries."""

from pathlib import Path
import sys

from PIL import Image


output = Path(sys.argv[1])
sources = [Path(name) for name in sys.argv[2:]]
largest = Image.open(sources[-1]).convert("RGBA")
largest.save(output, format="ICO", sizes=[Image.open(source).size for source in sources], bitmap_format="bmp")
