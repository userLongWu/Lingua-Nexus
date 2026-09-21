import type { FormEvent, ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, elements } from "../test/hookHarness";
import { makeCard } from "../lib/cardUtils";
import { CardDetail } from "./CardDetail";

vi.mock("react", async (importOriginal) => ({ ...await importOriginal<object>(),
  useState: (...args: [unknown]) => harness.hook.useState(...args),
  useEffect: (...args: Parameters<typeof harness.hook.useEffect>) => harness.hook.useEffect(...args),
}));
const harness = createHookHarness({ replayUpdates: true });
const card = makeCard("text", "Original text", { id: "first", translatedText: "Translation" });
const onSave = vi.fn();
let tree: ReactElement;
const render = () => {
  tree = harness.render(() => CardDetail({
    card, reviews: [], loading: false, error: null, saving: false, deleting: false,
    mutationError: null, onSave, onDelete: async () => {},
  }));
};

beforeEach(() => {
  harness.reset(); vi.resetAllMocks(); render();
  const edit = elements(tree).find((element) => element.type === "button" && element.props.children === "Edit")!;
  (edit.props.onClick as () => void)();
  harness.replayUpdates();
  render();
});

describe("card detail input event lifetime", () => {
  it.each([
    ["detail-original", "originalText"],
    ["detail-translation", "translatedText"],
  ])("keeps %s changes when React replays the updater after dispatch", (id, field) => {
    const textarea = elements(tree).find((element) => element.props.id === id)!;
    const event: { currentTarget: { value: string } | null } = { currentTarget: { value: "  Updated text  " } };
    (textarea.props.onChange as (event: unknown) => void)(event);
    // React clears currentTarget after dispatch; StrictMode may replay the updater later.
    event.currentTarget = null;
    expect(() => harness.replayUpdates()).not.toThrow();
    render();
    expect(elements(tree).find((element) => element.props.id === id)?.props.value).toBe("  Updated text  ");
    const form = elements(tree).find((element) => element.type === "form")!;
    (form.props.onSubmit as (event: FormEvent) => void)({ preventDefault() {} } as FormEvent);
    expect(onSave).toHaveBeenCalledWith({ ...card, [field]: "Updated text" });
  });
});
