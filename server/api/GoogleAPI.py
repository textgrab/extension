from google.cloud import vision
from api.VisionAPI import VisionAPI
from models.models import BoundingBox, Block, Line
from typing import List


class GoogleVisionAPI(VisionAPI):
    """
    Google Vision API
    """

    BREAK_TYPES = vision.TextAnnotation.DetectedBreak.BreakType

    def __init__(self):
        self._client = vision.ImageAnnotatorClient()

    def get_image_labels(self, binary_image_data: str):
        image = vision.Image(content=binary_image_data)

        response = self._client.document_text_detection(image=image)
        return response

    def get_blocks_from_labels(self, image_label_response) -> List[Block]:
        annotation = image_label_response.full_text_annotation
        blocks = []

        for page in annotation.pages:
            for block in page.blocks:
                block_lines = []
                for paragraph in block.paragraphs:
                    block_lines.extend(self.get_lines_from_paragraph(paragraph))

                vertices = block.bounding_box.vertices
                block_bbox = BoundingBox(
                    x=vertices[0].x,
                    y=vertices[0].y,
                    width=vertices[1].x - vertices[0].x,
                    height=vertices[3].y - vertices[0].y,
                )

                blocks.append(Block(bbox=block_bbox, lines=block_lines))
        return blocks

    def get_lines_from_paragraph(self, paragraph) -> List[Line]:
        lines = []

        # stores the text of the line
        cur_line_text: str = None
        cur_line_bbox: BoundingBox = None

        def newLine():
            nonlocal cur_line_text
            nonlocal cur_line_bbox
            lines.append(Line(bbox=cur_line_bbox, text=cur_line_text))
            cur_line_text = None
            cur_line_bbox = None

        for word in paragraph.words:
            word_bbox = word.bounding_box
            word_vertices = word_bbox.vertices

            # check that we have a rectangle
            if len(word_vertices) != 4:
                continue

            # this is the first word in the line
            if cur_line_text is None:
                cur_line_bbox = BoundingBox(
                    x=word_vertices[0].x,
                    y=word_vertices[0].y,
                    width=word_vertices[1].x - word_vertices[0].x,
                    height=word_vertices[3].y - word_vertices[0].y,
                )
                cur_line_text = ""

            # update current line bounding box
            cur_line_bbox.height = max(
                cur_line_bbox.height, abs(word_vertices[3].y - cur_line_bbox.y)
            )
            cur_line_bbox.width = max(
                cur_line_bbox.width, abs(word_bbox.vertices[1].x - cur_line_bbox.x)
            )

            cur_line_bbox.x = min(cur_line_bbox.x, word_bbox.vertices[0].x)
            cur_line_bbox.y = min(cur_line_bbox.y, word_bbox.vertices[0].y)

            for symbol in word.symbols:
                cur_line_text += symbol.text

                break_type = symbol.property.detected_break.type_
                # check for any special breaks
                if break_type == self.BREAK_TYPES.SPACE:
                    cur_line_text += " "

                elif break_type == self.BREAK_TYPES.SURE_SPACE:
                    cur_line_text += "  "

                elif break_type == self.BREAK_TYPES.EOL_SURE_SPACE:
                    cur_line_text += " "
                    newLine()

                elif break_type == self.BREAK_TYPES.LINE_BREAK:
                    newLine()

                elif break_type == self.BREAK_TYPES.HYPHEN:
                    cur_line_text += "-"
                    newLine()

        # this should never run since the line break would have
        # been caught in the previous word
        if cur_line_text is not None:
            newLine()
        return lines
