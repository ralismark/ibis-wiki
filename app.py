#!/usr/bin/env python3

"""
Server for project ibis
"""

import os
import mimetypes
import flask
import werkzeug.exceptions as werr
from flask import request

mimetypes.init()

app = flask.Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

DEBUG = bool(os.getenv("IBIS_DEBUG"))
DATA_ROOT = os.getenv("IBIS_DATA_ROOT", "data")


def safe_join(*args):
    """
    Safely join paths
    """
    try:
        return flask.safe_join(*args)
    except werr.NotFound:
        return None


def send_with_mime(base, path):
    mtype, _ = mimetypes.guess_type(path)
    if mtype is None:
        mtype = "text/plain"
    return flask.send_from_directory(base, path, mimetype=mtype)


@app.route("/api/data/<path:path>")
def data_load(path: str):
    """
    Fetch the contents of a file
    """
    return send_with_mime(DATA_ROOT, path)


@app.route("/api/data/<path:path>", methods=["PUT"])
def data_store(path: str):
    """
    Fetch the contents of a file
    """
    path = safe_join(DATA_ROOT, path)
    if path is None:
        return "Not a valid path", 400

    chunk_size = 4096

    # check if empty first
    first_chunk = request.stream.read(chunk_size)
    if not first_chunk:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass
    else:
        with open(path, "wb") as file:
            file.write(first_chunk)
            while True:
                chunk = request.stream.read(chunk_size)
                if not chunk:
                    break
                file.write(chunk)

    return "", 204


@app.route("/api/list")
def api_list():
    """
    Get a list of all entries
    """
    return flask.jsonify(os.listdir(DATA_ROOT))


if __name__ == "__main__":
    app.run(debug=DEBUG, host="0.0.0.0", port=4001)
