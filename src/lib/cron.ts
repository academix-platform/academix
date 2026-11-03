import { NextRequest } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. The secret is only
 * accepted in that header: one in the query string ends up in access logs.
 */
export const isAuthorizedCronRequest = (req: NextRequest): boolean => {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
};
