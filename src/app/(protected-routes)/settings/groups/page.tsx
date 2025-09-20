import GroupsTab from "@features/settings/components/groups-tab";

export default function GroupsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        Groups
      </h1>
      <GroupsTab />
    </div>
  );
}
