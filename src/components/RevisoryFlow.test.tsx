import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RevisoryFlow } from "./RevisoryFlow";
import { makeCard } from "../lib/cardUtils";

describe("dictionary review", () => {
  it("shows the word and keeps legacy stored definitions hidden before reveal", () => {
    const html = renderToStaticMarkup(<RevisoryFlow
      cards={[makeCard("dictionary", "a friendly greeting", { wordToLearn: "hello" })]}
      loading={false} error={null} onRetry={() => {}} onReviewed={() => {}}
    />);
    expect(html).toContain("hello");
    expect(html).toContain("Show answer");
    expect(html).not.toContain("a friendly greeting");
  });
});
