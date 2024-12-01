export default {

  "index": `
# Welcome to ibis wiki!

This is just a demo site, with some demo files to give you an idea of what this is like. Any changes you make here will be lost when you leave or refresh this page.

To open a note, use the search bar at the top! New note are automatically created when you open them.

**Markdown** is *fully supported* here, using the \`@lezer/markdown\` library <https://github.com/lezer-parser/markdown>.

In addition to the features provided by that library, links are also clickable! Try clicking the above link. Also, there are [[internal-links]] a la Roam Research (which was one of the inspirations for this).

For more info have a look at <https://github.com/ralismark/ibis-wiki>.
  `.trim(),

  "internal-links": `
Internal links are links to other notes in the wiki.

They are indexed and you can see what notes link to a certain note at the bottom of each note!
  `.trim(),

}
