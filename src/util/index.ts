export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function assertUnreachable(_: never): never {
  throw new Error("unreachable!")
}

export async function batched<T>(
  ps: Promise<T>[],
  process: (vals: T[]) => Promise<void> | void,
  reject: (err: any) => void,
): Promise<void> {
  let pending: T[] = []
  let activeTask: Promise<void> | null = null

  const startProcess = async () => {
    while (pending.length > 0) {
      const batch = pending
      pending = []
      const p = process(batch)
      if (p instanceof Promise) await p
    }
    activeTask = null
  }

  await Promise.all(ps.map(async p => p.then(v => {
    pending.push(v)
    if (activeTask === null) activeTask = startProcess()
  }).catch(reject)))

  if (activeTask !== null) await (activeTask as Promise<void>)
}
