# ibis-wiki
Yet another wiki project, built from the ground up.

This is inspired by the likes of [TiddlyWiki](https://tiddlywiki.com/) and [Logseq](https://logseq.com/), but designed from the ground up to address some of my gripes with them.
It's wasn't originally meant for use by others, and isn't exactly that stable, but if you want to play around with it, definitely feel free to!

As of 21 July 2023, I've been using this for a bit over two years (see: [dogfooding](https://indieweb.org/selfdogfood)).

Note: the autosave mechanism does not have any protection against overwriting newer version of the file and causing data loss.
This means that you should be very careful when you have multiple instances of this wiki open at the same time (e.g. across different devices).

## Running

See <https://ralismark.xyz/ibis-wiki/> for the production deployment of this.
You can run locally with `npm i` + `npm run dev`.

`ibis-wiki` will save and load documents from an external storage provider -- the only kind supported at the moment is S3 (including S3-compatible ones like backblaze).
Other than that, there isn't any sort of backend, and you don't need to run anything yourself to use this.
