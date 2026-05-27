import { NextResponse } from "next/server";
import { getJobStatus } from "../trigger/route";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId parameter" }, { status: 400 });
  }

  const status = getJobStatus(jobId);
  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ data: status });
}
