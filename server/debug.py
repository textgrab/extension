# python3 ocr_bounding_boxes.py "cs245_1.png" -o cs245_out.png

import argparse

from api.GoogleAPI import GoogleVisionAPI


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("detect_file", help="The image for text detection.")
    parser.add_argument("-out_file", help="Optional output file", default=0)
    args = parser.parse_args()

    api = GoogleVisionAPI()
    api.debug_annotation(args.detect_file, args.out_file)
