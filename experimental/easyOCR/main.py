import easyocr
import time
from PIL import Image, ImageDraw
    

def draw_boxes_2(image, bounds, color):
    """Draw a border around the image using the hints in the vector list."""
    draw = ImageDraw.Draw(image)

    for bound in bounds:
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
    

def ocr(file_path):
    
    reader = easyocr.Reader(['en']) # this needs to run only once to load the model into memory

    time_start = time.time()
    print ("Starting OCR...")
    result = reader.readtext(file_path)
    print ("Done in : ", time.time() - time_start)
    
    bounds = []
    for bbox, text, confidence in result:
        bound = {
            "x": bbox[0][0],
            "y": bbox[0][1],
            "width": bbox[1][0] - bbox[0][0],
            "height": bbox[2][1] - bbox[0][1],
            "text": text,
            "confidence": confidence
        }
        bounds.append(bound)
    
    return bounds
    

def render_doc_text(filein, fileout):
    image = Image.open(filein)
    
    bounds = ocr(filein)
    draw_boxes_2(image, bounds, "red")

    if fileout != 0:
        image.save(fileout)
    else:
        image.show()

    draw_boxes_2(image, bounds, (0, 255, 0))
    
    

render_doc_text("code_presentation.png", "code_presentation_res.png")