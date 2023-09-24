import { useRef } from "react"
import { useExtern, useExternOr } from "../extern";
import { FacadeExtern } from "../backend";

function IbisDatalist(props: {id: string}) {
  const facade = useExtern(FacadeExtern);
  const listing = useExternOr(facade?.listing, new Set());

  return <datalist id={props.id}>
    {Array.from(listing).map(path => <option key={path} value={path} />)}
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
