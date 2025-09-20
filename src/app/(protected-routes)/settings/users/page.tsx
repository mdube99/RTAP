import UsersTab from "@features/settings/components/users-tab";

export default function UsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        Users
      </h1>
      <UsersTab />
    </div>
  );
}
