from dataclasses import dataclass
from typing import List

try:
    from PIL import ImageDraw
except ImportError:
    print("Cannot access PIL library. Please install it if running locally.")


class BoundingBox:
    def __init__(self, x: float, y: float, width: float, height: float):
        self.x = x
        self.y = y
        self.width = width
        self.height = height

    @staticmethod
    def intersects(self, a: "BoundingBox", b: "BoundingBox"):
        return (
            a.left <= b.right
            and a.right >= b.left
            and a.top <= b.bottom
            and a.bottom >= b.top
        )

    @property
    def area(self):
        return self.width * self.height

    @property
    def left(self):
        return self.x

    @property
    def right(self):
        return self.x + self.width

    @property
    def top(self):
        return self.y

    @property
    def bottom(self):
        return self.y + self.height

    def isUnder(self, bbox: "BoundingBox"):
        return self.top >= bbox.bottom

    def isAbove(self, bbox: "BoundingBox"):
        return self.bottom <= bbox.top

    def __str__(self):
        return f"BoundingBox(x={self.x}, y={self.y}, width={self.width}, height={self.height})"

    @property
    def json(self):
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }

    def debug_draw(self, imageDraw: "ImageDraw.ImageDraw", color: str = "green"):
        imageDraw.polygon(
            [
                self.left,
                self.top,
                self.right,
                self.top,
                self.right,
                self.bottom,
                self.left,
                self.bottom,
            ],
            None,
            color,
        )


@dataclass
class Line:
    bbox: BoundingBox
    text: str

    @property
    def json(self):
        return {
            "bounding_box": self.bbox.json,
            "text": self.text,
        }


@dataclass
class Block:
    bbox: BoundingBox
    lines: List[Line]

    @property
    def json(self):
        return {
            "bounding_box": self.bbox.json,
            "lines": [line.json for line in self.lines],
        }

    @property
    def text(self):
        return "\n".join([line.text for line in self.lines])
