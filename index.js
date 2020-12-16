"use strict";

(async () => {

  const content = {

    "index": `
Welcome to the Titled Note System! It's currently pretty bare-bones, but there's a few things you can already try out:

* editable note! try typing here
* inter-document links e.g. [[SSC]]. Try clicking that!
* you can also create new cards by clicking on a link to an unknown entry e.g. [[new things]]

I've added a few entries for this demo -- all notes are listed at the top.
    `.trim(),

    "Protocols, Not Platforms": `
[[forest]]
> https://knightcolumbia.org/content/protocols-not-platforms-a-technological-approach-to-free-speech

Private-owned platforms means their owners have a monopoly on moderation -- so they will likely be biased in one way or another, and will also be the target of any conplaints about how they moderate.
However, low entry/exit costs (including hosting costs) can lead you to [[Archipelago and Atomic Communitarianism]]

Monetisation: trading based on the (perceived) value of the _protocol itself_. Like bitcoin. See [[FileCoin]] and [[InterplanetaryFileSystem]]
    `.trim(),

    "FileCoin": `
[[forest]]
> https://filecoin.io/

I haven't looked at this yet.
    `.trim(),

    "Archipelago and Atomic Communitarianism": `
[[forest]] [[SSC]]
> https://slatestarcodex.com/2014/06/07/archipelago-and-atomic-communitarianism/

Nice article!
    `.trim(),


    "forest": `
(tag for webpages)
    `.trim(),

    "SSC": `
[[forest]]
> https://slatestarcodex.com/

It's a really nice blog. Good articles include:

- [[Archipelago and Atomic Communitarianism]]
    `.trim(),

  };

  // for(let slug in content) {
  //   Doc.setContent(await DP.getRootDocument(slug), content[slug]);
  // }

  document.body.appendChild(new Card({ slug: "index" }));

})();
