"use client";

import { KeyRound, Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { Login } from "@/lib/peopleImport/saveBatch";

/** Logins the admin must hand out: no email, or the email failed. */
export const loginsToHandOut = (logins: Login[]) => logins.filter((login) => !login.emailed);

/**
 * Opens the logins in a new window and prints them. The page is built with
 * textContent only, since names come from an uploaded file. Nothing is saved.
 */
const printLogins = (
  logins: Login[],
  labels: { title: string; name: string; role: string; username: string; password: string; roles: Record<Login["role"], string> },
  locale: string,
) => {
  const win = window.open("", "_blank");
  if (!win) return;
  const doc = win.document;
  doc.documentElement.lang = locale;
  doc.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  doc.title = labels.title;

  const style = doc.createElement("style");
  style.textContent =
    "body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}" +
    "th,td{border:1px solid #999;padding:8px;text-align:start}td.code{font-family:monospace;font-size:15px;direction:ltr;unicode-bidi:embed}" +
    "tr{break-inside:avoid}";
  doc.head.append(style);

  const heading = doc.createElement("h1");
  heading.textContent = labels.title;
  const table = doc.createElement("table");
  const head = table.createTHead().insertRow();
  for (const text of [labels.name, labels.role, labels.username, labels.password]) {
    const th = doc.createElement("th");
    th.textContent = text;
    head.append(th);
  }
  const body = table.createTBody();
  for (const login of logins) {
    const tr = body.insertRow();
    const cells = [login.name, labels.roles[login.role], login.username, login.password];
    cells.forEach((text, i) => {
      const td = tr.insertCell();
      td.textContent = text;
      if (i >= 2) td.className = "code";
    });
  }
  doc.body.append(heading, table);
  win.focus();
  win.print();
};

export default function LoginList({ logins }: { logins: Login[] }) {
  const t = useTranslations("peopleImport.logins");
  const locale = useLocale();
  const toHandOut = loginsToHandOut(logins);
  const emailed = logins.length - toHandOut.length;
  if (logins.length === 0) return null;

  const roles = { student: t("roles.student"), parent: t("roles.parent"), teacher: t("roles.teacher") };

  return (
    <section className="flex flex-col gap-3 p-4 border border-amber-200 rounded-lg" aria-labelledby="logins-title">
      <h2 id="logins-title" className="inline-flex items-center gap-2 font-semibold text-gray-900">
        <KeyRound className="w-4 h-4" aria-hidden="true" />
        {t("title")}
      </h2>
      {emailed > 0 && <p className="text-gray-700 text-sm">{t("emailedCount", { count: emailed })}</p>}
      {toHandOut.length > 0 && (
        <>
          <p role="note" className="bg-amber-50 p-3 rounded-md text-amber-900 text-sm">
            {t("warning")}
          </p>
          <div className="border rounded-md max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start">{t("name")}</th>
                  <th scope="col" className="px-3 py-2 text-start">{t("role")}</th>
                  <th scope="col" className="px-3 py-2 text-start">{t("username")}</th>
                  <th scope="col" className="px-3 py-2 text-start">{t("password")}</th>
                </tr>
              </thead>
              <tbody>
                {toHandOut.map((login) => (
                  <tr key={login.username} className="border-t">
                    <td className="px-3 py-2" dir="auto">{login.name}</td>
                    <td className="px-3 py-2">{roles[login.role]}</td>
                    <td className="px-3 py-2 font-mono" dir="ltr">{login.username}</td>
                    <td className="px-3 py-2 font-mono" dir="ltr">{login.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button
              type="button"
              onClick={() =>
                printLogins(
                  toHandOut,
                  { title: t("printTitle"), name: t("name"), role: t("role"), username: t("username"), password: t("password"), roles },
                  locale,
                )
              }
              className="inline-flex items-center gap-2 bg-academixPurpleDark hover:brightness-90 px-4 py-2 rounded-md font-semibold text-white text-sm"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {t("print")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
