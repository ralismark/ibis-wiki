import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import "./CodeMirror.css"

export default forwardRef(function CodeMirror({}, ref) {
  // Our current CodeMirror element is extremely janky, primarily due to
  // needing to work around EditorView needing to be destroyed when it's
  // removed.
  //
  // React's Strict mode will run the cleanup function during mount, which
  // causes issues since destroying EditorView is irreversible. This forces us
  // to create the EditorView in the useEffect. There's also no opt-out of
  // Strict Mode to work around this.
  //
  // However, that causes a problem with useImperativeHandle. The ref needs to
  // be recalculated after we use useEffect to create the EditorView. This is
  // triggered correctly -- I can see it being called after we setView -- but
  // it doesn't happen in time for useEffects depending on the ref produced by
  // useImperativeHandle! Which is a problem since they'll only ever see a null
  // EditorView unless they do some even bigger hacks -- specifically, using
  // useState and passing the setter as the ref! Argh!
  //
  // To be honest, there's like a 90% chance that I'm just using React
  // wrong/poorly.

  const containerRef = useRef(null);
  const [view, setView] = useState<EditorView | null>(null);

  useEffect(() => {
    if (containerRef.current && !view) {
      const newView = new EditorView({
        parent: containerRef.current,
      });
      setView(newView);

      return () => {
        newView.destroy();
      };
    }
  }, [containerRef]);

  useImperativeHandle(ref, () => {
    return view;
  }, [view]);

  return <div ref={containerRef} />;
});
