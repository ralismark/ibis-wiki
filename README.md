# ibis-wiki

A scrappy little personal wiki, built to fit a personal niche.
See <https://ralismark.xyz/ibis-wiki/> for the production (i.e. latest commit) version, or run locally with `npm i` + `npm run dev`.

This is inspired by the likes of [TiddlyWiki](https://tiddlywiki.com/) and [Logseq](https://logseq.com/), designed from the ground up to address some of my gripes with them.
It's not really designed with public use in mind (**if you do want to use this, let me know!**), but definitely feel free to play around with it!

This wiki is a purely static site, and does not have its own backend!
Instead, notes are stored via an external storage provider -- the only kind supported at the moment is S3 (including S3-compatible ones like Backblaze).

I've been using this from early 2021 to at least May 2024, and I don't think I'll be switching anytime soon (see: [dogfooding](https://indieweb.org/selfdogfood)).

Older versions had issues with saving that meant that having a file open in multiple tabs/devices could cause data loss.
This has now been fixed!
It is safe to have multiple sessions open at the same time :)
