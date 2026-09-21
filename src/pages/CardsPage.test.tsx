import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, deferred, elements, flushPromises } from "../test/hookHarness";
import { makeCard } from "../lib/cardUtils";
import { getAllCards, getCardReviews, updateCard } from "../lib/api";
import { CardDetail } from "../components/CardDetail";
import { CardItem } from "../components/CardItem";
import { CardsPage } from "./CardsPage";
import type { Card, Review } from "../types";

vi.mock("../lib/api", () => ({ getAllCards: vi.fn(), getCardReviews: vi.fn(), updateCard: vi.fn(), deleteCard: vi.fn() }));
vi.mock("react", async (importOriginal) => ({ ...await importOriginal<object>(),
  useState: (...args: [unknown]) => harness.hook.useState(...args),
  useRef: (...args: [unknown]) => harness.hook.useRef(...args),
  useMemo: (compute: () => unknown) => harness.hook.useMemo(compute),
  useEffect: (...args: Parameters<typeof harness.hook.useEffect>) => harness.hook.useEffect(...args),
}));
const harness = createHookHarness();
const first = makeCard("text", "First", { id: "first" });
const second = makeCard("text", "Second", { id: "second" });
const review: Review = { id: "r2", cardId: second.id, score: 4, reviewDate: "2026-09-21" };
let tree: ReactElement;
const render = () => { tree = harness.render(CardsPage); };
const detail = () => elements(tree).find((element) => element.type === CardDetail)!.props;
function select(card: Card) {
  const item = elements(tree).find((element) => element.type === CardItem && (element.props.card as Card).id === card.id)!;
  (item.props.onSelect as (card: Card) => void)(card); render(); render();
}
async function load() {
  render(); await flushPromises(); render(); render();
}

beforeEach(() => {
  harness.reset(); vi.resetAllMocks();
  vi.mocked(getAllCards).mockResolvedValue([first, second]);
});

describe("library asynchronous selection", () => {
  it("keeps the selected card's history when an earlier request finishes last", async () => {
    const oldHistory = deferred<Review[]>();
    vi.mocked(getCardReviews).mockImplementation((id) => id === first.id ? oldHistory.promise : Promise.resolve([review]));
    await load(); select(second); await flushPromises(); render();
    oldHistory.resolve([{ ...review, cardId: first.id }]);
    await flushPromises(); render();
    expect(detail().card).toEqual(second);
    expect(detail().reviews).toEqual([review]);
  });

  it("ignores earlier history errors after the selection changes", async () => {
    const oldHistory = deferred<Review[]>();
    vi.mocked(getCardReviews).mockImplementation((id) => id === first.id ? oldHistory.promise : Promise.resolve([review]));
    await load(); select(second); await flushPromises(); render();
    oldHistory.reject(new Error("First history failed"));
    await flushPromises(); render();
    expect(detail().error).toBeNull();
    expect(detail().reviews).toEqual([review]);
  });

  it("does not jump back to a card when its pending save completes", async () => {
    const pendingSave = deferred<Card>();
    vi.mocked(getCardReviews).mockResolvedValue([]);
    vi.mocked(updateCard).mockReturnValue(pendingSave.promise);
    await load();
    const saved = { ...first, originalText: "Updated first" };
    const saving = (detail().onSave as (card: Card) => Promise<void>)(saved);
    select(second);
    pendingSave.resolve(saved); await saving; render();
    expect(detail().card).toEqual(second);
    expect(elements(tree).find((element) => element.type === CardItem && (element.props.card as Card).id === first.id)?.props.card).toEqual(saved);
  });
});
