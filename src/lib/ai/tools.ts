import { tool } from "ai";
import { z } from "zod";

// No `execute` here on purpose — these are client-side tools. The model only
// proposes a call; the chat UI renders a confirm/cancel card and, on
// confirm, runs the existing guarded mutator from useRecruitmentData()
// itself, then reports the outcome back via addToolResult. This keeps every
// mutation on the same permission path the rest of the app already uses,
// with no second server hop to re-derive who the user is.
export const aiTools = {
  setRoleStatus: tool({
    description:
      "Propose changing an open role's status (e.g. mark a role as Filled, Allocated, On Hold, Cancelled, or reopen it as Open). Always confirm the exact role with the user (by its role ID and title) before calling this.",
    inputSchema: z.object({
      roleId: z.string().describe("The role's id, e.g. its Open Role record id or role code."),
      roleTitle: z.string().describe("The role's title, shown to the user for confirmation."),
      status: z.enum(["Open", "Allocated", "Filled", "On Hold", "Cancelled"]),
    }),
    outputSchema: z.object({
      ok: z.boolean(),
      message: z.string(),
    }),
  }),
};
