import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildSubjectQuery } from "@/lib/query-builders/subject-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Subject, Teacher } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";
import Link from "next/link";
import { BookText } from "lucide-react";

type SubjectList = Subject & {
  teachers: Teacher[];
  grade: { id: number; level: number } | null;
};

const SubjectListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const emptyT = await getTranslations("emptyStates");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/subjects");

  const {
    query,
    orderBy,
    page: p,
  } = await buildSubjectQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  const resolvedSearchParams = await searchParams;

  const exportQuery = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }
      return value ? [[key, value]] : [];
    }),
  );

  const [data, count] = await prisma.$transaction([
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: true,
        grade: true,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.subject.count({ where: query }),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allSubjects")}</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />

            {role === "admin" && (
              <>
                <ExportButton
                  href={`/api/admin/subjects/export?${exportQuery.toString()}`}
                />
                <FormContainer table="subject" type="create" />
              </>
            )}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col justify-center items-center bg-gray-50 mt-6 p-10 rounded-xl text-center">
          <h3 className="font-semibold text-gray-700 text-base">
            {emptyT("subjects")}
          </h3>
          <p className="mt-1 text-gray-400 text-sm">
            {emptyT("filterDescription")}
          </p>
        </div>
      ) : (
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
          {data.map((item: SubjectList) => (
            <Link
              href={`/list/subjects/${item.id}`}
              key={item.id}
              className="group flex flex-col justify-between bg-gradient-to-br from-academixPurpleDark via-academixPurple to-academixPurpleLight hover:shadow-md p-5 rounded-xl min-h-[150px] transition-shadow"
            >
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  {" "}
                  <div className="flex items-center gap-1 font-semibold text-white group-hover:text-purple-600 text-lg transition-colors">
                    <BookText className="inline mr-1 w-5 h-5" />
                    {item.name}
                  </div>
                  {role === "admin" && (
                    <div className="flex items-center gap-2">
                      <FormContainer
                        table="subject"
                        type="update"
                        data={item}
                      />
                      <FormContainer
                        table="subject"
                        type="delete"
                        id={item.id}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-black text-sm">
                    Grade:{" "}
                    <span className="font-medium text-gray-700">
                      {item.grade?.level ?? "-"}
                    </span>
                  </p>

                  <p className="text-black text-sm line-clamp-2">
                    Teachers:{" "}
                    <span className="font-medium text-gray-700">
                      {item.teachers.length > 0
                        ? item.teachers
                            .map((teacher) => teacher.name)
                            .join(", ")
                        : "-"}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={p} count={count} />
    </div>
  );
};

export default SubjectListPage;
