import type { FormEvent, ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, deferred, elements } from "../test/hookHarness";
import { makeCard } from "../lib/cardUtils";
import { createCard, lookupWord } from "../lib/api";
import { DictionaryLookup } from "./DictionaryLookup";
import type { Card } from "../types";

vi.mock("../lib/api", () => ({ createCard: vi.fn(), lookupWord: vi.fn() }));
vi.mock("react", async (importOriginal) => ({ ...await importOriginal<object>(),
  useState: (...args: [unknown]) => harness.hook.useState(...args),
  useRef: (...args: [unknown]) => harness.hook.useRef(...args),
  useEffect: (...args: Parameters<typeof harness.hook.useEffect>) => harness.hook.useEffect(...args),
}));
const harness = createHookHarness();
const onCreated = vi.fn();
let tree: ReactElement;
const render = () => { tree = harness.render(() => DictionaryLookup({ onCreated })); };
const find = (type: string) => elements(tree).find((element) => element.type === type)!;
const submit = () => (find("form").props.onSubmit as (event: FormEvent) => Promise<void>)({ preventDefault() {} } as FormEvent);
function enter(value: string) {
  (find("input").props.onChange as (event: unknown) => void)({ currentTarget: { value } });
  render();
}
function create() {
  const button = elements(tree).find((element) => element.type === "button" && element.props.type === "button")!;
  return (button.props.onClick as () => Promise<void>)();
}
const result = makeCard("dictionary", "a greeting", { wordToLearn: "hello" });

beforeEach(() => { harness.reset(); vi.resetAllMocks(); render(); });

describe("dictionary lookup interactions", () => {
  it("discards an in-flight lookup when the input changes", async () => {
    const pending = deferred<Card>();
    vi.mocked(lookupWord).mockReturnValue(pending.promise);
    enter("hello");
    const lookup = submit();
    enter("world");
    pending.resolve(result);
    await lookup;
    render();
    expect(elements(tree).some((element) => element.type === "button" && element.props.type === "button")).toBe(false);
  });

  it("removes the old result before starting another lookup", async () => {
    vi.mocked(lookupWord).mockResolvedValueOnce(result).mockReturnValueOnce(new Promise(() => {}));
    enter("hello"); await submit(); render();
    enter("world"); void submit(); render();
    expect(elements(tree).some((element) => element.type === "button" && element.props.type === "button")).toBe(false);
  });

  it("saves a result once even with same-tick clicks, and marks it saved", async () => {
    const pending = deferred<Card>();
    vi.mocked(lookupWord).mockResolvedValue(result);
    vi.mocked(createCard).mockReturnValue(pending.promise);
    enter("hello"); await submit(); render();
    const first = create(); const second = create();
    expect(createCard).toHaveBeenCalledTimes(1);
    pending.resolve({ ...result, id: "saved" });
    await Promise.all([first, second]); render();
    const saveButton = elements(tree).find((element) => element.type === "button" && element.props.type === "button");
    expect(saveButton?.props.disabled ?? true).toBe(true);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
});
