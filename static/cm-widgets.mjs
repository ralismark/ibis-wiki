import {Decoration, ViewPlugin, WidgetType} from "@codemirror/view";
import {syntaxTree} from "@codemirror/language"
import $ from "./dollar.mjs";

class ImagePreviewWidget extends WidgetType {
  constructor(url) {
    // <https://codemirror.net/6/examples/decoration/> doesn't store the url so this is ok?
    super()
    this.url = url;
  }

  eq(other) {
    return other.url == this.url;
  }

  toDOM() {
    return $.e("div", {class:"cm-image-preview"}, $.e("img", {src: this.url}));
  }
}

const ImagePreviewPlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = this.getDecorations(view);
  }

  update(update) {
    if(update.docChanged || update.viewportChanged)
      this.decorations = this.getDecorations(update.view);
  }

  getDecorations(view) {
    console.log(view);
    let widgets = [];
    for (let {from, to} of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from, to,
        enter: (node, from, to) => {
          if(node.name == "URL") {
            const url = view.state.doc.sliceString(from+1, to-1);
            const acceptedExtensions = [".jpg", ".png", ".svg"];
            if(!acceptedExtensions.some(x => url.endsWith(x)))
              return;
            const deco = Decoration.widget({
              widget: new ImagePreviewWidget(url),
              side: 1,
              block: false,
            }).range(view.state.doc.lineAt(to).to);
            widgets.push(deco);
          }
        },
      })
    }
    return Decoration.set(widgets);
  }
}, {
  decorations: v => v.decorations,
});

export const extensions = [ImagePreviewPlugin];
