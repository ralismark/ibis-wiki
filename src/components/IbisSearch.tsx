import { useContext, useEffect, useRef, useState } from "react";
import { DocumentProviderContext } from "../DocumentProvider";

function IbisDatalist(props: {id: string}) {
  const [list, setList] = useState<Array<string>>([]);
  const docs = useContext(DocumentProviderContext);

  // load from document backend
  useEffect(() => {
    docs!.list().then(setList);
  }, [docs]);

  return <datalist id={props.id}>
    {list.map(l => <option key={l} value={l} />)}
  </datalist>
}

export default function IbisSearch(props: { onSubmit(path: string): void }) {
  const searchBox = useRef<HTMLInputElement>(null);

  return <form
    onSubmit={e => {
      e.preventDefault();
      props.onSubmit(searchBox.current!.value);
    }}
  >
    <IbisDatalist id="ibis-datalist" />
    <input className="ibis-search" ref={searchBox} list="ibis-datalist" />
  </form>
}
