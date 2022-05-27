# ibis-wiki
Yet another wiki project, built from the ground up.

This is inspired by the likes of [TiddlyWiki](https://tiddlywiki.com/) and [Logseq](https://logseq.com/), but designed from the ground up to address some of my gripes with them.
It's wasn't originally meant for use by others, and isn't exactly that stable, but if you want to play around with it, definitely feel free to!

As of 16 April 2022, I've been using this for almost a year (see: [dogfooding](https://indieweb.org/selfdogfood)).

Note: the autosave mechanism does not have any protection against overwriting newer version of the file and causing data loss.
This means that you should be very careful when you have multiple instances of this wiki open at the same time (e.g. across different devices).

## Running

See <https://ralismark.xyz/ibis-wiki/static/> for the actual website for this.

`ibis-wiki` will save and load documents from an external storage backend.
The two kinds supported are **S3** (and S3-compatible APIs) and WebDAV.
Other than that, you don't need to run anything yourself.

## CORS

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS), or Cross-Origin Resource Sharing, is a security mechanism that forbids webpages from making requests to a URL with a different origin (i.e. different domain, port, or protocol) unless that server is explicitly configured to allow it.
Unfortunately, many servers do not have this configured by default (notably, it currently cannot be allowed in `rclone serve webdav` at all).
`cors.py` is provided as a way to proxy another service in a way that allows CORS requests.
To run it, pass the URL of the webdav service to proxy, including the trailing slash e.g.

```
./cors.py http://localhost:1729/ibis-wiki-data/
```

Now, all requests to port 4002 will be forwarded to that URL.

## Design Notes

The main motivation behind this project was to use markdown as the document format, instead of alternatives that other wiki systems use.
However, there are some additions to this to make it more "wiki-like", such as the use of `[[double brackets]]` for internal linking.

There's a few experimental things here:

- Using ETags to avoid writes that cause data loss.
  Support for this is pretty spotty, and I haven't implemented any UI for actually dealing with a conflict.
