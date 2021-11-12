# ibis-wiki
Yet another wiki project, built from the ground up.

This is inspired by the likes of [TiddlyWiki](https://tiddlywiki.com/) and [Logseq](https://logseq.com/), but designed from the ground up to address some of my gripes with them.
It's wasn't originally meant for use by others, and isn't exactly that stable, but if you want to play around with it, definitely feel free to!

As of 29 Aug 2021, I've been using this for almost 3 months (i.e. [dogfooding](https://indieweb.org/selfdogfood)).

Note: There are currently issues with the autosave mechanism causing loss of data.
ETag support is being worked on but is not completely stable (and is disabled by default).
Additionally, some WebDAV servers (`rclone`'s in particular) do not support ETags.

## Running

`ibis-wiki` requires a WebDAV server to operate, and the address of this will need to be set when you first use this wiki.
A WebDAV server isn't included here, but any conforming server will suffice as long as the app is able to make requests to it -- it only needs a very minimal subset of the WebDAV API.
Other than that, this wiki does not require any server-side setup.

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
