import FeedbackModal from "@/components/FeedbackModal";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const getStatusClass = (status: string) => {
  switch (status) {
    case "reviewed":
      return "bg-blue-100 text-blue-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "complaint":
      return "Complaint";
    default:
      return "Suggestion";
  }
};

export default async function FeedbackPage() {
  const user = await getAuthUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const feedbacks = await prisma.feedback.findMany({
    where: {
      schoolId: user.schoolId,
      userId: user.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">
            My Feedback History
          </h1>

          <p className="text-sm text-gray-500">
            Track your previous suggestions and complaints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {feedbacks.length} submitted
          </span>

          <FeedbackModal />
        </div>
      </div>

      <div className="space-y-4">
        {feedbacks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-500 text-sm">
              You have not submitted any feedback yet.
            </p>
          </div>
        ) : (
          feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {getTypeLabel(feedback.type)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                        feedback.status
                      )}`}
                    >
                      {feedback.status}
                    </span>
                  </div>

                  <p className="text-gray-600 leading-6">
                    {feedback.message}
                  </p>
                </div>

                <span className="whitespace-nowrap text-sm text-gray-400">
                  {new Date(feedback.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}