import type { FormEvent, ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, deferred, elements } from "../test/hookHarness";
import { importSrt } from "../lib/api";
import { SrtImport } from "./SrtImport";
import type { Card } from "../types";

vi.mock("../lib/api", () => ({ importSrt: vi.fn() }));
vi.mock("react", async (importOriginal) => ({ ...await importOriginal<object>(),
  useState: (...args: [unknown]) => harness.hook.useState(...args),
  useRef: (...args: [unknown]) => harness.hook.useRef(...args),
  useMemo: (compute: () => unknown) => harness.hook.useMemo(compute),
}));
const harness = createHookHarness();
const onImported = vi.fn();
let tree: ReactElement;
const render = () => { tree = harness.render(() => SrtImport({ onImported })); };
const find = (type: string) => elements(tree).find((element) => element.type === type)!;
const submit = () => (find("form").props.onSubmit as (event: FormEvent) => Promise<void>)({ preventDefault() {} } as FormEvent);
function enter(value: string) {
  (find("textarea").props.onChange as (event: unknown) => void)({ currentTarget: { value } }); render();
}
beforeEach(() => { harness.reset(); vi.resetAllMocks(); render(); });

describe("subtitle import", () => {
  it("rejects metadata-only input instead of reporting zero cards imported", async () => {
    vi.mocked(importSrt).mockResolvedValue([]);
    enter("1\n00:00:01,000 --> 00:00:03,000"); await submit(); render();
    expect(importSrt).not.toHaveBeenCalled();
    expect(onImported).not.toHaveBeenCalled();
  });

  it("submits only once for same-tick duplicate clicks", async () => {
    const pending = deferred<Card[]>();
    vi.mocked(importSrt).mockReturnValue(pending.promise);
    enter("Dr. Smith paid 3.14...\n42");
    const first = submit(); const second = submit();
    expect(importSrt).toHaveBeenCalledTimes(1);
    pending.resolve([]); await Promise.all([first, second]);
    expect(onImported).toHaveBeenCalledTimes(1);
  });
});
