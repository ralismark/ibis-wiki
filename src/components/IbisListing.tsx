import { Fragment } from "react"
import { useExtern, useExternOr } from "../extern"
import { IbisController } from "../App"
import { FacadeExtern } from "../backend"

export function IbisListing(props: {
  filter?: (path: string) => boolean,
}) {
  const controller = useExtern(IbisController)
  const facade = useExtern(FacadeExtern);
  const listing = useExternOr(facade?.listing, new Set());

  const filter = props.filter ?? (() => true)

  return <div className="ibis-listing">
    {Array.from(listing).map(path => filter(path) && <Fragment key={path}>
      <a
        href=""
        onClick={e => {
          e.preventDefault()
          controller.open(path)
        }}
      >
        {path}
      </a>
      {" "}
    </Fragment>)}
  </div>
}
