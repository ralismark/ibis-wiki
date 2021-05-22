#!/usr/bin/env python3

"""
Server for project ibis
"""

import os
import flask
import werkzeug.exceptions as werr
from flask import request

app = flask.Flask(__name__)

def safe_join(*args):
    """
    Safely join paths
    """
    try:
        return flask.safe_join(*args)
    except werr.NotFound:
        return None

@app.route("/")
def index():
    """
    Redirect to index page
    """
    return flask.redirect("/static/index.html")

@app.route("/api/data/<path:path>")
def data_load(path: str):
    """
    Fetch the contents of a file
    """
    return flask.send_from_directory("data", path)

@app.route("/api/data/<path:path>", methods=["PUT"])
def data_store(path: str):
    """
    Fetch the contents of a file
    """
    path = safe_join("data", path)
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
    return flask.jsonify(os.listdir("data"))

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=4001)
