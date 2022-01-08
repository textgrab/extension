# python3 ocr_bounding_boxes.py "cs245_1.png" -o cs245_out.png

import argparse
from enum import Enum
import io

from google.cloud import vision
from PIL import Image, ImageDraw
import json


class FeatureType(Enum):
    PAGE = 1
    BLOCK = 2
    PARA = 3
    WORD = 4
    SYMBOL = 5


def draw_boxes(image, bounds, color):
    """Draw a border around the image using the hints in the vector list."""
    draw = ImageDraw.Draw(image)

    for bound in bounds:
        draw.polygon(
            [
                bound.vertices[0].x,
                bound.vertices[0].y,
                bound.vertices[1].x,
                bound.vertices[1].y,
                bound.vertices[2].x,
                bound.vertices[2].y,
                bound.vertices[3].x,
                bound.vertices[3].y,
            ],
            None,
            color,
        )
    return image

def draw_boxes_2(image, bounds, color):
    """Draw a border around the image using the hints in the vector list."""
    draw = ImageDraw.Draw(image)

    for bound in bounds:
        bound = bound["bounding_box"]
        draw.polygon(
            [
                bound["x"],
                bound["y"],
                bound["x"] + bound["width"],
                bound["y"],
                bound["x"] + bound["width"],
                bound["y"] + bound["height"],
                bound["x"],
                bound["y"] + bound["height"],
            ],
            None,
            color,
        )
    return image 

def get_document_bounds(image_file, feature):
    """Returns document bounds given an image."""
    client = vision.ImageAnnotatorClient()

    bounds = []

    with io.open(image_file, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    response = client.document_text_detection(image=image)

    document = response.full_text_annotation

    print(document.text)

    # Collect specified feature bounds by enumerating all document features
    for page in document.pages:
        for block in page.blocks:
            for paragraph in block.paragraphs:
                for word in paragraph.words:
                    for symbol in word.symbols:
                        if feature == FeatureType.SYMBOL:
                            bounds.append(symbol.bounding_box)

                    if feature == FeatureType.WORD:
                        bounds.append(word.bounding_box)

                if feature == FeatureType.PARA:
                    bounds.append(paragraph.bounding_box)

            if feature == FeatureType.BLOCK:
                bounds.append(block.bounding_box)

    # The list `bounds` contains the coordinates of the bounding boxes.
    return bounds


def gcp_ocr(image_file, feature):
    client = vision.ImageAnnotatorClient()

    bounds = []

    with io.open(image_file, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    response = client.document_text_detection(image=image)

    document = annotation = response.full_text_annotation

    breaks = vision.TextAnnotation.DetectedBreak.BreakType
    paragraphs = []
    lines = []

    # print ("Paragraph")
    # print (annotation.pages[0].blocks[0].paragraphs[0])
    
    for page in annotation.pages:
        # print(page)
        for block in page.blocks:
            for paragraph in block.paragraphs:
                para = ""
                line = ""
                line_bounding_box = {"x": 0, "y": 0, "width": 0, "height": 0}

                for i in range(len(paragraph.words)):
                    word = paragraph.words[i]
                    word_box = word.bounding_box
                    if len(word_box.vertices) != 4:
                        continue
                    # set top left corner if it's the first word of the line
                    # also set height for the line
                    if line == "":
                        line_bounding_box["x"] = word_box.vertices[0].x
                        line_bounding_box["y"] = word_box.vertices[0].y

                    line_bounding_box["height"] = max(
                        line_bounding_box["height"],
                        word_box.vertices[3].y - word_box.vertices[0].y,
                    )
                    line_bounding_box["width"] = word_box.vertices[1].x - line_bounding_box["x"]

                    for symbol in word.symbols:
                        print (symbol.text)
                        line += symbol.text
                        if symbol.property.detected_break.type_ == breaks.SPACE:
                            print ("SPACE")
                            line += " "
                        if (
                            symbol.property.detected_break.type_
                            == breaks.EOL_SURE_SPACE
                        ):
                            print("EOL_SURE_SPACE")

                            line += " "
                            lines.append(
                                {"text": line, "bounding_box": line_bounding_box}
                            )
                            para += line
                            line = ""
                            line_bounding_box = {
                                "x": 0,
                                "y": 0,
                                "width": 0,
                                "height": 0,
                            }

                        if symbol.property.detected_break.type_ == breaks.LINE_BREAK:
                            print("LINE_BREAK")
                            lines.append(
                                {"text": line, "bounding_box": line_bounding_box}
                            )
                            para += line
                            line = ""
                            line_bounding_box = {
                                "x": 0,
                                "y": 0,
                                "width": 0,
                                "height": 0,
                            }

                paragraphs.append(para)

    # print(lines)
    return paragraphs, lines

def render_doc_text(filein, fileout):
    image = Image.open(filein)
    # bounds = get_document_bounds(filein, FeatureType.BLOCK)
    # draw_boxes(image, bounds, "blue")
    # bounds = get_document_bounds(filein, FeatureType.PARA)
    # draw_boxes(image, bounds, "red")
    # bounds = get_document_bounds(filein, FeatureType.WORD)
    # draw_boxes(image, bounds, "black")
    
    _, bounds = gcp_ocr(filein, FeatureType.BLOCK)
    draw_boxes_2(image, bounds, "green")

    if fileout != 0:
        image.save(fileout)
    else:
        image.show()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("detect_file", help="The image for text detection.")
    parser.add_argument("-out_file", help="Optional output file", default=0)
    args = parser.parse_args()

    render_doc_text(args.detect_file, args.out_file)

    client = vision.ImageAnnotatorClient()

    # with io.open(image_file, "rb") as image_file:
    #     content = image_file.read()

    # image = vision.Image(content=content)

    # response = client.document_text_detection(image=image)

    # document = response.full_text_annotation
