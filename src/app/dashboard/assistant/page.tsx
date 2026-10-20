import { auth } from "@/lib/auth/auth.config";
import { redirect } from "next/navigation";
import ChatPanel from "@/components/ai-assistant/ChatPanel";

export default async function AssistantPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">AI Health Assistant</h1>
      <p className="text-muted-foreground mb-6">
        Ask questions about your health, appointments, prescriptions, or general medical topics.
      </p>
      <ChatPanel />
    </div>
  );
}
