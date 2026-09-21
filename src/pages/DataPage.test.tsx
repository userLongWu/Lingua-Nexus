import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, deferred, elements, flushPromises } from "../test/hookHarness";
import { exportBackup, getAiStatus, restoreBackup } from "../lib/api";
import { DataPage } from "./DataPage";
vi.mock("../lib/api",()=>({exportBackup:vi.fn(),getAiStatus:vi.fn(),restoreBackup:vi.fn()}));
vi.mock("react",async(original)=>({...await original<object>(),
  useState:(...args:[unknown])=>harness.hook.useState(...args),
  useRef:(...args:[unknown])=>harness.hook.useRef(...args),
  useEffect:(...args:Parameters<typeof harness.hook.useEffect>)=>harness.hook.useEffect(...args),
}));
const harness=createHookHarness(); let tree:ReactElement;
const render=()=>{tree=harness.render(DataPage);};
const exportFile=()=> (elements(tree).find(el=>el.type==="button")!.props.onClick as ()=>Promise<void>)();
function choose(file: {size:number;text:()=>Promise<string>}) {
  (elements(tree).find(el=>el.type==="input")!.props.onChange as (event:unknown)=>void)({currentTarget:{files:[file],value:"fixture.json"}});
}
beforeEach(async()=>{ harness.reset();vi.resetAllMocks();vi.mocked(getAiStatus).mockResolvedValue({enabled:false,model:null,message:"Not configured"});render();await flushPromises();render(); });
describe("data actions",()=>{
  it("avoids duplicate exports and displays the actual output path",async()=>{
    const pending=deferred<string>();vi.mocked(exportBackup).mockReturnValue(pending.promise);
    const request=exportFile();void exportFile();expect(exportBackup).toHaveBeenCalledTimes(1);
    pending.resolve("/Downloads/fixture.json");await request;render();
    expect(elements(tree).some(el=>el.props.role==="status")).toBe(true);
  });
  it("rejects oversized selected files before reading or restoring",()=>{
    const read=vi.fn(); choose({size:21*1024*1024,text:read});
    expect(read).not.toHaveBeenCalled(); expect(restoreBackup).not.toHaveBeenCalled();
  });
  it("shows backend validation failures and allows choosing another file",async()=>{
    vi.mocked(restoreBackup).mockRejectedValueOnce(new Error("Invalid backup JSON")).mockResolvedValueOnce({cardsAdded:1,cardsSkipped:0,cardConflicts:0,reviewsAdded:0,reviewsSkipped:0,reviewConflicts:0});
    choose({size:2,text:async()=>"{}"}); await flushPromises();render();
    expect(elements(tree).some(el=>el.props.role==="alert" && el.props.children==="Invalid backup JSON")).toBe(true);
    choose({size:2,text:async()=>"{}"});await flushPromises();render();
    expect(restoreBackup).toHaveBeenCalledTimes(2);expect(elements(tree).some(el=>el.props.role==="status")).toBe(true);
  });
});
