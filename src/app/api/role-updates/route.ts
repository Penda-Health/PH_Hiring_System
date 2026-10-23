// Weekly recruiter comments on open roles (the "Role Updates" table). Read
// by the role dialog, Penny, the downloadable roles report and the IPS weekly
// summary. GET is open to every signed-in user; POST is limited to
// canEditRecruitmentData() roles via RECRUITMENT_DATA_API_PREFIXES in
// src/lib/permissions.ts. The author is always the signed-in user, never
// taken from the request body.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { roleUpdateFromAirtable, roleUpdateToAirtable } from "@/lib/airtable/mappers";
import { loadRoleUpdates } from "@/lib/roles/role-updates";
import { getCurrentUserIdentity } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const roleId = request.nextUrl.searchParams.get("roleId");
    const updates = await loadRoleUpdates();
    return NextResponse.json(roleId ? updates.filter((u) => u.roleId === roleId) : updates);
  } catch (err) {
    console.error("[api/role-updates] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const postSchema = z.object({
  roleId: z.string().min(1),
  comment: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const result = postSchema.safeParse(await request.json().catch(() => null));
  if (!result.success) {
    return NextResponse.json({ error: "invalid_request", detail: result.error.flatten() }, { status: 400 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const record = await createRecord(
      TABLE_NAMES.RoleUpdates,
      roleUpdateToAirtable({
        roleId: result.data.roleId,
        comment: result.data.comment,
        authorName: identity.name,
        authorEmail: identity.email,
        createdAt: new Date().toISOString(),
      })
    );
    return NextResponse.json(roleUpdateFromAirtable(record), { status: 201 });
  } catch (err) {
    console.error("[api/role-updates] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
