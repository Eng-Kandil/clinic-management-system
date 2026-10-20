import ProfileForm from "@/components/settings/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and update your personal information.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProfileForm />
      </div>
    </div>
  );
}
