#!/usr/bin/env python3

import sys
import flask
from flask_cors import CORS
from flask import request
import requests

app = flask.Flask(__name__)
CORS(app)

TARGET_BASE = sys.argv[1]

dav_methods = [
    "OPTIONS",
    "LOCK",
    "GET",
    "HEAD",
    "POST",
    "DELETE",
    "PROPPATCH",
    "COPY",
    "MOVE",
    "UNLOCK",
    "PROPFIND",
    "PUT",
]

@app.route("/", methods=dav_methods, defaults={"path": ""})
@app.route("/<path:path>", methods=dav_methods)
def cors_forward(path: str):
    """
    Forward requests to configured server
    """
    target_url = TARGET_BASE + path
    resp = requests.request(
        method=request.method,
        url=target_url,
        headers={key: value for (key, value) in request.headers if key != "Host"},
        data=request.get_data(),
        cookies=request.cookies,
        allow_redirects=False,
        stream=True,
    )

    excluded_headers = [
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
    ]
    headers = {
        name: value
        for (name, value) in resp.raw.headers.items()
        if name.lower() not in excluded_headers
    }
    headers["Access-Control-Allow-Origin"] = "*"

    if request.method == "OPTIONS":
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Max-Age"] = "86400"

    def download_file(streamable):
        with streamable as stream:
            for chunk in stream.iter_content(chunk_size=8192):
                yield chunk

    return flask.Response(download_file(resp), resp.status_code, headers)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4002)
