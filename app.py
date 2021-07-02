#!/usr/bin/env python3

"""
Server for project ibis
"""

import os
import flask
from werkzeug.utils import safe_join as w_safe_join
import werkzeug.exceptions as werr
from flask import request

app = flask.Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

DEBUG = bool(os.getenv("IBIS_DEBUG"))
DATA_ROOT = os.getenv("IBIS_DATA_ROOT", "data")


def safe_join(*args):
    """
    Safely join paths
    """
    try:
        return w_safe_join(*args)
    except werr.NotFound:
        return None


@app.route("/")
def index():
    """
    Redirect to index page
    """
    return flask.redirect("/static/index.html")


@app.route("/build/<path:path>")
def static_build(path: str):
    """
    Build artifacts
    """
    return flask.send_from_directory("build", path)


@app.route("/api/data/<path:path>")
def data_load(path: str):
    """
    Fetch the contents of a file
    """
    return flask.send_from_directory(DATA_ROOT, path)


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


def main():
    app.run(debug=DEBUG, host="0.0.0.0", port=4001)


if __name__ == "__main__":
    main()
