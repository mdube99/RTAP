"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Card, CardContent, Input, Label } from "@components/ui";
import ConfirmModal from "@components/ui/confirm-modal";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";

interface Group {
  id: string;
  name: string;
  description: string;
  members: Array<{
    user: {
      id: string;
      name: string | null;
      email: string;
      role: string;
    };
  }>;
  _count: {
    members: number;
    operationAccess: number;
  };
}

export default function GroupsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [managingMembers, setManagingMembers] = useState<Group | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null);

  // Queries
  const { data: groups, isLoading } = api.groups.list.useQuery();
  const { data: users } = api.users.list.useQuery();

  // Mutations
  const utils = api.useUtils();

  const createMutation = api.groups.create.useMutation({
    onSuccess: () => {
      void utils.groups.invalidate();
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = api.groups.update.useMutation({
    onSuccess: () => {
      void utils.groups.invalidate();
      setEditingGroup(null);
    },
  });

  const deleteMutation = api.groups.delete.useMutation({
    onSuccess: () => {
      void utils.groups.invalidate();
      setConfirmDelete(null);
    },
  });

  const addMembersMutation = api.groups.addMembers.useMutation({
    onSuccess: () => {
      void utils.groups.invalidate();
    },
  });

  const removeMembersMutation = api.groups.removeMembers.useMutation({
    onSuccess: () => {
      void utils.groups.invalidate();
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Access Control Groups"
        subtitle="Groups define memberships used to grant access to specific operations. Configure operation visibility in the editor."
        onNew={() => setIsCreateModalOpen(true)}
      />

      <div className="grid gap-4">
        {groups?.map((group) => (
          <Card key={group.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-[var(--color-text-primary)]">
                      {group.name}
                    </h4>
                    <span className="px-2 py-1 text-xs font-medium rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
                      {group._count.members} member{group._count.members !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    {group.description}
                  </p>
                  <div className="text-xs text-[var(--color-text-muted)]">Add or remove users to control which operations (configured for this group) they can access.</div>

                  {/* Member list preview */}
                  {group.members.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                      <div className="text-xs text-[var(--color-text-muted)] mb-2">Members:</div>
                      <div className="flex flex-wrap gap-2">
                        {group.members.slice(0, 5).map((member) => (
                          <span
                            key={member.user.id}
                            className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                          >
                            {member.user.name ?? member.user.email}
                          </span>
                        ))}
                        {group.members.length > 5 && (
                          <span className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                            +{group.members.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {group._count.operationAccess > 0 && (
                    <span className="px-2 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--status-info-bg)] border border-[var(--status-info-fg)] text-[var(--status-info-fg)]">
                      {group._count.operationAccess} operation{group._count.operationAccess === 1 ? "" : "s"}
                    </span>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setManagingMembers(group)} >
                    Manage Members
                  </Button>
                  <InlineActions
                    onEdit={() => setEditingGroup(group)}
                    onDelete={() => setConfirmDelete(group)}
                    deleteDisabled={group._count.operationAccess > 0}
                    deleteDisabledReason="This group is applied to operation access. Remove it from those operations first."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {groups?.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No groups found. Create your first group to enable tag-based access control.
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <GroupModal
          title="Create Group"
          onSubmit={(data) => {
            createMutation.mutate(data);
          }}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <GroupModal
          title="Edit Group"
          initialData={editingGroup}
          onSubmit={(data) => {
            updateMutation.mutate({ id: editingGroup.id, ...data });
          }}
          onCancel={() => setEditingGroup(null)}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Manage Members Modal */}
      {managingMembers && users && (
        <MembersModal
          group={managingMembers}
          allUsers={users}
          onAddMembers={(userIds) => {
            addMembersMutation.mutate({
              groupId: managingMembers.id,
              userIds,
            });
          }}
          onRemoveMembers={(userIds) => {
            removeMembersMutation.mutate({
              groupId: managingMembers.id,
              userIds,
            });
          }}
          onClose={() => setManagingMembers(null)}
          isLoading={addMembersMutation.isPending || removeMembersMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete group?"
          description="Are you sure you want to delete this group? Operations restricted to this group will no longer be accessible by its members."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

interface GroupModalProps {
  title: string;
  initialData?: Group;
  onSubmit: (data: { name: string; description: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function GroupModal({ title, initialData, onSubmit, onCancel, isLoading }: GroupModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description });
  };

  return (
    <div className="fixed inset-0 bg-black/50  flex items-center justify-center p-4 z-50">
      <Card variant="elevated" className="w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            {title}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Group Name
              </Label>
              <Input
                id="name"
                variant="elevated"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Red Team"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" required>
                Description
              </Label>
              <Input
                id="description"
                variant="elevated"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Members of the red team organization"
                required
              />
            </div>

            <div className="p-3 rounded-[var(--radius-md)]" style={{ background: "var(--status-info-bg)", border: "1px solid var(--status-info-fg)" }}>
              <div className="text-sm" style={{ color: "var(--status-info-fg)" }}>
                <strong>Access Control:</strong> Use this group when configuring operation access in the editor. Members can access operations that include this group.
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="secondary"
                disabled={isLoading || !name.trim() || !description.trim()}
                className="flex-1"
              >
                {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

interface MembersModalProps {
  group: Group;
  allUsers: Array<{ id: string; name: string | null; email: string; role: string }>;
  onAddMembers: (userIds: string[]) => void;
  onRemoveMembers: (userIds: string[]) => void;
  onClose: () => void;
  isLoading: boolean;
}

function MembersModal({ group, allUsers, onAddMembers, onRemoveMembers, onClose, isLoading }: MembersModalProps) {
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [selectedToRemove, setSelectedToRemove] = useState<string[]>([]);

  const currentMemberIds = group.members.map(m => m.user.id);
  const availableUsers = allUsers.filter(u => !currentMemberIds.includes(u.id));

  const handleAddMembers = () => {
    if (selectedToAdd.length > 0) {
      onAddMembers(selectedToAdd);
      setSelectedToAdd([]);
    }
  };

  const handleRemoveMembers = () => {
    if (selectedToRemove.length > 0) {
      onRemoveMembers(selectedToRemove);
      setSelectedToRemove([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50  flex items-center justify-center p-4 z-50">
      <Card variant="elevated" className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 flex flex-col h-full">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Manage Members - {group.name}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Add or remove users from this group to control access to operations where this group is selected.
            </p>
          </div>

          <div className="flex-1 overflow-auto space-y-6">
            {/* Current Members */}
            <div>
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                Current Members ({group.members.length})
              </h4>
              <div className="space-y-2">
                {group.members.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No members in this group yet.</p>
                ) : (
                  group.members.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                    >
                      <div>
                        <div className="font-medium text-sm text-[var(--color-text-primary)]">
                          {member.user.name ?? member.user.email}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          {member.user.email} • {member.user.role}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedToRemove.includes(member.user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedToRemove([...selectedToRemove, member.user.id]);
                          } else {
                            setSelectedToRemove(selectedToRemove.filter(id => id !== member.user.id));
                          }
                        }}
                        className="ml-4"
                      />
                    </div>
                  ))
                )}
              </div>
              {selectedToRemove.length > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRemoveMembers}
                  disabled={isLoading}
                  className="mt-3"
                >
                  Remove {selectedToRemove.length} Member{selectedToRemove.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>

            {/* Available Users */}
            <div>
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                Available Users ({availableUsers.length})
              </h4>
              <div className="space-y-2">
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">All users are already members of this group.</p>
                ) : (
                  availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                    >
                      <div>
                        <div className="font-medium text-sm text-[var(--color-text-primary)]">
                          {user.name ?? user.email}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          {user.email} • {user.role}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedToAdd.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedToAdd([...selectedToAdd, user.id]);
                          } else {
                            setSelectedToAdd(selectedToAdd.filter(id => id !== user.id));
                          }
                        }}
                        className="ml-4"
                      />
                    </div>
                  ))
                )}
              </div>
              {selectedToAdd.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddMembers}
                  disabled={isLoading}
                  className="mt-3"
                >
                  Add {selectedToAdd.length} Member{selectedToAdd.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-4 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
