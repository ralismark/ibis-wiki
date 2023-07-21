import { Fragment, useContext } from "react";
import { BackendContext } from "../backend";
import { useAsync, useExtern } from "../extern";
import { IbisController } from "../App";

export function IbisListing(props: {
  filter?: (path: string) => boolean,
}) {
  const backend = useContext(BackendContext);
  if (!backend) return <div className="ibis-listing" />;

  const controller = useExtern(IbisController);

  const list = useAsync(useExtern(backend.listing), {});
  const filter = props.filter ?? (() => true);

  return <div className="ibis-listing">
    {Object.entries(list).map(([k, _]) => filter(k) && <Fragment key={k}>
      <a
        href=""
        onClick={e => {
          e.preventDefault();
          controller.open(k);
        }}
      >
        {k}
      </a>
      {" "}
    </Fragment>)}
  </div>
}
