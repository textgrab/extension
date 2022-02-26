import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    try:
        PORT = os.environ["PORT"]
        PROJECT_ID = os.environ["PROJECT_ID"]
    except KeyError as e:
        raise Exception("Missing Environment Variable: %s" % str(e))
