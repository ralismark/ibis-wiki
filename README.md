# ibis-wiki
Yet another wiki project, built from the ground up.

This is inspired by the likes of [TiddlyWiki](https://tiddlywiki.com/) and [Logseq](https://logseq.com/), but designed from the ground up to address some of my gripes with them.
It's wasn't originally meant for use by others, and isn't exactly that stable, but if you want to play around with it, definitely feel free to!

As of 29 Aug 2021, I've been using this for almost 3 months (i.e. [dogfooding](https://indieweb.org/selfdogfood)).

Note: There are currently known issues with the autosave mechanism causing loss of data.

## Running

This project has a javascript/nodejs component -- `main.js` -- that needs to be compiled first, so you will need node & npm installed.
To build, you can simply run `./make.sh`, which will create the `build` directory and produce `build/bundle.js`.
After this step, you won't need npm (e.g. if you're deploying this on a server).

By default, ibis-wiki will use the `data` folder, but won't automatically create it.
You can also set an alternate file directory with the `IBIS_DATA_ROOT` environment variable, either set that or `mkdir data`.
Ibis-wiki will also load `init.js` from the data folder when you load the wiki, so you can use that to open up default cards etc.

To run the website, you'll need python.
First, install dependencies with `pip install -r requirements.txt` (possibly in a virtual environment -- `python3 -m ven venv && . ./venv/bin/activate`).
Then, you can run `app.py` to start the server on port 4001, with the main wiki reachable at `http://localhost:4001/static/index.html`.

## Design Notes

The main motivation behind this project was to use markdown as the document format, instead of alternatives that other wiki systems use.
However, there are some additions to this to make it more "wiki-like", such as the use of `[[double brackets]]` for internal linking.
