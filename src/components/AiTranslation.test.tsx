import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, deferred, elements, flushPromises } from "../test/hookHarness";
import { getAiStatus, translateText } from "../lib/api";
import { AiTranslation } from "./AiTranslation";
vi.mock("../lib/api", () => ({ getAiStatus: vi.fn(), translateText: vi.fn() }));
vi.mock("react", async (original) => ({ ...await original<object>(),
  useState: (...args: [unknown]) => harness.hook.useState(...args),
  useRef: (...args: [unknown]) => harness.hook.useRef(...args),
  useEffect: (...args: Parameters<typeof harness.hook.useEffect>) => harness.hook.useEffect(...args),
}));
const harness=createHookHarness(); const onApply=vi.fn(); let sourceText="Hello"; let currentTranslation=""; let tree: ReactElement;
const render=()=>{ tree=harness.render(()=>AiTranslation({sourceText,currentTranslation,onApply})); };
const click=(label:string)=> (elements(tree).find(el=>el.type==="button" && el.props.children===label)!.props.onClick as ()=>Promise<void>)();
beforeEach(async()=>{ harness.reset(); vi.resetAllMocks(); sourceText="Hello"; currentTranslation="";
  vi.mocked(getAiStatus).mockResolvedValue({enabled:true,model:"fixture",message:"Configured"}); render(); await flushPromises(); render(); });
describe("explicit AI translation",()=>{
  it("previews the answer and applies only on request",async()=>{
    vi.mocked(translateText).mockResolvedValue("你好"); await click("Translate with AI"); render();
    expect(onApply).not.toHaveBeenCalled(); await click("Apply translation"); expect(onApply).toHaveBeenCalledWith("你好");
  });
  it.each(["source","translation"])("discards results after %s changes",async(field)=>{
    const pending=deferred<string>(); vi.mocked(translateText).mockReturnValue(pending.promise);
    const request=click("Translate with AI");
    if(field==="source") sourceText="New text"; else currentTranslation="User edit";
    render(); pending.resolve("旧结果"); await request; render();
    expect(elements(tree).some(el=>el.props.children==="Apply translation")).toBe(false); expect(onApply).not.toHaveBeenCalled();
  });
  it("allows retry after failure and blocks same-tick duplicate requests",async()=>{
    const pending=deferred<string>(); vi.mocked(translateText).mockReturnValueOnce(pending.promise).mockResolvedValueOnce("重试");
    const request=click("Translate with AI"); void click("Translate with AI"); expect(translateText).toHaveBeenCalledTimes(1);
    pending.reject(new Error("AI request timed out")); await request; render();
    await click("Translate with AI"); render(); await click("Apply translation"); expect(onApply).toHaveBeenCalledWith("重试");
  });
});
