import { createFeedback } from "@/lib/actions/feedback";

export default function FeedbackPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">
        Suggestions & Complaints
      </h1>

      <form
        action={createFeedback}
        className="space-y-4 max-w-2xl bg-white p-6 rounded-xl shadow-sm"
      >
        <div>
          <label className="block mb-2 font-medium">
            Type
          </label>

          <select
            name="type"
            className="w-full border rounded-lg p-3"
          >
            <option value="suggestion">
              Suggestion
            </option>

            <option value="complaint">
              Complaint
            </option>
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium">
            Message
          </label>

          <textarea
            name="message"
            required
            placeholder="Write your message..."
            className="w-full border rounded-lg p-3 h-40 resize-none"
          />
        </div>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Send Feedback
        </button>
      </form>
    </div>
  );
}