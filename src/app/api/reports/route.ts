import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { authorize, scopedKodamCodes } from "@/auth/authorize";
import { canonicalKodamScope } from "@/auth/group-mapping";
import { getAuthPrincipal } from "@/auth/session";
import { apiError, authorizationError } from "@/http/api-response";
import { prisma } from "@/lib/prisma";
import { reportFilterSchema, reportSchema } from "@/operations/schema";
import { auditJson, writeAuditLog } from "@/security/audit";
import { protectMutation, readJsonBody } from "@/security/request-security";

function reportWhere(
  scope: string[] | null,
  filter: {
    from?: string;
    to?: string;
    kodamCode?: string;
    type?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    q?: string;
  },
): Prisma.ReportWhereInput {
  const kodam = (() => {
    if (scope && filter.kodamCode) {
      const wanted = canonicalKodamScope(filter.kodamCode);
      return { code: { in: scope.filter((code) => canonicalKodamScope(code) === wanted) } };
    }
    if (scope) return { code: { in: scope } };
    if (filter.kodamCode) return { code: filter.kodamCode };
    return null;
  })();
  const reportDate = (() => {
    if (!filter.from && !filter.to) return null;
    return {
      ...(filter.from ? { gte: new Date(`${filter.from}T00:00:00.000Z`) } : {}),
      ...(filter.to ? { lte: new Date(`${filter.to}T23:59:59.999Z`) } : {}),
    };
  })();
  return {
    ...(kodam ? { kodam } : {}),
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(reportDate ? { reportDate } : {}),
    ...(filter.q
      ? {
          OR: [
            { title: { contains: filter.q, mode: "insensitive" } },
            { type: { contains: filter.q, mode: "insensitive" } },
            { content: { path: ["summary"], string_contains: filter.q } },
          ],
        }
      : {}),
  };
}

export async function GET(request: Request) {
  const principal = await getAuthPrincipal();
  const access = authorize(principal, "report:read");
  if (!access.ok) return authorizationError(access);
  if (!principal) return apiError("Autentikasi diperlukan", 401);
  const raw = Object.fromEntries(
    [...new URL(request.url).searchParams].filter(([, value]) => value.trim() !== ""),
  );
  const parsed = reportFilterSchema.safeParse(raw);
  if (!parsed.success) return apiError("Filter laporan tidak valid", 400, parsed.error.flatten());
  const filter = parsed.data;
  if (filter.kodamCode) {
    const scoped = authorize(principal, "report:read", filter.kodamCode);
    if (!scoped.ok) return authorizationError(scoped);
  }
  const scope = scopedKodamCodes(principal);
  return NextResponse.json(
    await prisma.report.findMany({
      where: reportWhere(scope, filter),
      include: { kodam: true },
      orderBy: { reportDate: "desc" },
      take: 500,
    }),
  );
}

export async function POST(request: Request) {
  const blocked = protectMutation(request);
  if (blocked) return blocked;
  const principal = await getAuthPrincipal();
  const access = authorize(principal, "report:create");
  if (!access.ok) return authorizationError(access);
  if (!principal) return apiError("Autentikasi diperlukan", 401);
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = reportSchema.safeParse(body.value);
  if (!parsed.success) return apiError("Data laporan tidak valid", 400, parsed.error.flatten());
  const kodam = parsed.data.kodamCode
    ? await prisma.kodam.findUnique({ where: { code: parsed.data.kodamCode } })
    : null;
  if (parsed.data.kodamCode && !kodam) return apiError("Kodam tidak ditemukan", 400);
  if (kodam) {
    const scoped = authorize(principal, "report:create", kodam.code);
    if (!scoped.ok) return authorizationError(scoped);
  }
  const report = await prisma.report.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      reportDate: parsed.data.reportDate,
      content: { summary: parsed.data.summary },
      kodamId: kodam?.id,
      createdBy: principal.id ?? principal.email ?? "unknown",
    },
    include: { kodam: true },
  });
  await writeAuditLog({
    request,
    principal,
    action: "CREATE_REPORT",
    entity: "Report",
    entityId: report.id,
    newValue: auditJson(report),
  });
  return NextResponse.json(report, { status: 201 });
}
