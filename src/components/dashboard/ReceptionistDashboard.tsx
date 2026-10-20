export function ReceptionistDashboard({ userName }: { userName: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {userName}
        </h1>
        <p className="text-muted-foreground text-slate-500">
          Today&apos;s schedule and patient check-ins
        </p>
      </div>
    </div>
  );
}
