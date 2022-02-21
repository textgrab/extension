# import psycopg2
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin

from config import Config

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import shortuuid

from api.GoogleAPI import GoogleVisionAPI


app = Flask(__name__)
cors = CORS(app)

limiter = Limiter(app, key_func=get_remote_address)

visionAPI = GoogleVisionAPI()


@app.route("/", methods=["GET"])
def root():
    return {"message": "Welcome to TextGrab API!"}


@app.route("/health", methods=["get"])
def test():
    return {"message": "Status OK"}


@app.route("/new_session", methods=["GET"])
@cross_origin()
def new_session():

    return {"uuid": shortuuid.uuid()}


@app.route("/process", methods=["POST"])
@cross_origin()
@limiter.limit("10/minute")  # maximum of 10 requests per minute
def process():
    """
    Payload:
        imageData: base64 image string
    """
    # imageData base64 image string
    # Fetch image data
    data = request.get_json()

    imageData = data.get("imageData")

    blocks = visionAPI.annotate_image(imageData)
    lines = []

    for b in blocks:
        lines.extend(b.lines)

    response = make_response(
        jsonify(
            {
                "full_text": "\n".join([block.text for block in blocks]),
                "lines": [line.json for line in lines],
                "blocks": [
                    block.json
                    for block in sorted(blocks, key=lambda x: [x.bbox.top, x.bbox.left])
                ],
            }
        )
    )
    print(f"Processed {len(blocks)} blocks, {len(lines)} lines")
    return response


if __name__ == "__main__":
    app.run(port=Config.PORT, debug=True)
