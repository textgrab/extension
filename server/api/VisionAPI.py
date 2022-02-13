from abc import ABC, abstractmethod

import io
from typing import List

from models.models import Block
import base64


class VisionAPI(ABC):
    """
    Abstract class for vision API
    """
    @abstractmethod
    def get_image_labels(self, binary_image_data: str):
        """
        Returns the image labels
        :param image_path:
        :return:
        """
        pass

    @abstractmethod
    def get_blocks_from_labels(self, image_label_response) -> List[Block]:
        """
        Returns tbe blocks given the image labels
        :param image_data:
        :return:
        """
        pass

    def annotate_image(self, b64_image_data: str) -> List[Block]:
        binary_image_data = base64.b64decode(b64_image_data)
        api_response = self.get_image_labels(binary_image_data)
        blocks = self.get_blocks_from_labels(api_response)
        
        return blocks
    
    def debug_annotation(self, image_file_path: str, image_res_path: str = None):
        from PIL import Image, ImageDraw
        image = Image.open(image_file_path)
        
        with io.open(image_file_path, "rb") as image_file:
            image_content = image_file.read()
            
        api_response = self.get_image_labels(image_content)
        blocks = self.get_blocks_from_labels(api_response)
        
        draw = ImageDraw.Draw(image)
        
        for block in blocks:
            block.bbox.debug_draw(draw, "green")
            
            for line in block.lines:
                line.bbox.debug_draw(draw, "red")
        
        if image_res_path is not None:
            image.save(image_res_path)
        else:
            image.show()
            
                