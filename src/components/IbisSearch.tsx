import { useContext, useRef } from "react";
import { BackendContext } from "../backend";
import { useAsync, useExtern } from "../extern";

function IbisDatalist(props: {id: string}) {
  const backend = useContext(BackendContext);
  if (!backend) return <datalist id={props.id} />;

  const list = useAsync(useExtern(backend.listing), {});

  return <datalist id={props.id}>
    {Object.entries(list).map(([k, _]) => <option key={k} value={k} />)}
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
