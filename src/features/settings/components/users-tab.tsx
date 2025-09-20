"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button, Card, CardContent, Input, Label } from "@components/ui";
import ConfirmModal from "@components/ui/confirm-modal";
import SettingsHeader from "./settings-header";
import InlineActions from "@components/ui/inline-actions";
import { UserRole } from "@prisma/client";

// Define a simple user type for the UI
type SimpleUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  lastLogin: Date | null;
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
};

export default function UsersTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SimpleUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SimpleUser | null>(null);
  const [confirmDisable2fa, setConfirmDisable2fa] = useState<SimpleUser | null>(null);

  // Queries
  const { data: users, isLoading } = api.users.list.useQuery();

  // Mutations
  const utils = api.useUtils();
  const createMutation = api.users.create.useMutation({
    onSuccess: () => {
      void utils.users.invalidate();
    },
  });

  const updateMutation = api.users.update.useMutation({
    onSuccess: () => {
      void utils.users.invalidate();
      setEditingUser(null);
    },
  });

  const deleteMutation = api.users.delete.useMutation({
    onSuccess: () => {
      void utils.users.invalidate();
      setConfirmDelete(null);
    },
  });

  const disable2faMutation = api.users.adminDisableTotp.useMutation({
    onSuccess: () => {
      void utils.users.invalidate();
      setConfirmDisable2fa(null);
    },
  });

  const handleCreate = async (
    data: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      mustChangePassword: boolean;
    },
  ) => {
    try {
      await createMutation.mutateAsync(data);
      setIsCreateModalOpen(false);
    } catch {
      // Errors are handled via mutation state
    }
  };

  const handleUpdate = (id: string, data: { name: string; email: string; role: UserRole; mustChangePassword: boolean }) => {
    updateMutation.mutate({ id, name: data.name, email: data.email, role: data.role, mustChangePassword: data.mustChangePassword });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "text-[var(--color-error)] bg-[var(--color-error)]/20 border-[var(--color-error)]/30";
      case UserRole.OPERATOR:
        return "text-[var(--color-warning)] bg-[var(--color-warning)]/20 border-[var(--color-warning)]/30";
      case UserRole.VIEWER:
        return "text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] border-[var(--color-border)]";
      default:
        return "text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] border-[var(--color-border)]";
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-text-secondary)]">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title="Users" onNew={() => setIsCreateModalOpen(true)} />

      <div className="grid gap-4">
          {users?.map((user: SimpleUser) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-[var(--color-text-primary)]">
                      {user.name ?? "Unnamed User"}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-[var(--radius-sm)] border ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {user.email}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Last login: {user.lastLogin ? user.lastLogin.toLocaleString() : "Never"} • 2FA {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </p>
                </div>
                <div className="ml-4">
                  <InlineActions onEdit={() => setEditingUser(user)} onDelete={() => setConfirmDelete(user)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {users?.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            No users found. Add your first user to get started.
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <UserModal
          title="Create User"
          onSubmit={(data) => {
            if ('password' in data) {
              void handleCreate(data);
            }
          }}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingUser && (
        <UserModal
          title="Edit User"
          initialData={editingUser}
          onSubmit={(data) => {
            if (!('password' in data)) {
              handleUpdate(editingUser.id, data);
            }
          }}
          onCancel={() => setEditingUser(null)}
          isLoading={updateMutation.isPending}
          hidePassword
          onDisable2fa={
            editingUser.twoFactorEnabled
              ? () => setConfirmDisable2fa(editingUser)
              : undefined
          }
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete user?"
          description="Are you sure you want to delete this user? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteMutation.isPending}
        />
      )}

      {confirmDisable2fa && (
        <ConfirmModal
          open
          title="Disable two-factor authentication?"
          description={`This will remove TOTP for ${confirmDisable2fa.email}.`}
          confirmLabel="Disable"
          cancelLabel="Cancel"
          onConfirm={() => disable2faMutation.mutate({ id: confirmDisable2fa.id })}
          onCancel={() => setConfirmDisable2fa(null)}
          loading={disable2faMutation.isPending}
        />
      )}
    </div>
  );
}

type UserModalSubmitData =
  | { name: string; email: string; password: string; role: UserRole; mustChangePassword: boolean }  // Create mode
  | { name: string; email: string; role: UserRole; mustChangePassword: boolean };                   // Edit mode

interface UserModalProps {
  title: string;
  initialData?: SimpleUser;
  onSubmit: (data: UserModalSubmitData) => void;
  onCancel: () => void;
  isLoading: boolean;
  hidePassword?: boolean;
  onDisable2fa?: () => void;
}

function UserModal({ title, initialData, onSubmit, onCancel, isLoading, hidePassword, onDisable2fa }: UserModalProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(initialData?.role ?? UserRole.VIEWER);
  const [resetMode, setResetMode] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [forceReset, setForceReset] = useState(initialData?.mustChangePassword ?? true);
  const resetMutation = api.users.resetPassword.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hidePassword) {
      // Create mode - requires password
      onSubmit({ name, email, password, role, mustChangePassword: forceReset });
    } else {
      // Edit mode - no password change
      onSubmit({ name, email, role, mustChangePassword: forceReset });
    }
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
                Full Name
              </Label>
              <Input
                id="name"
                variant="elevated"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Smith"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" required>
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                variant="elevated"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., john.smith@company.com"
                required
              />
            </div>

            {!hidePassword && (
              <div>
                <Label htmlFor="password" required>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  variant="elevated"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="role" required>
                User Role
              </Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
                required
              >
                <option value={UserRole.VIEWER}>Viewer - Read-only access</option>
                <option value={UserRole.OPERATOR}>Operator - Create and manage operations</option>
                <option value={UserRole.ADMIN}>Admin - Full system access</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="must-change"
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-surface)]"
                checked={forceReset}
                onChange={(e) => setForceReset(e.target.checked)}
              />
              <Label htmlFor="must-change">Force password change on next login</Label>
            </div>

            {hidePassword && initialData && (
              <div className="space-y-2">
                {!resetMode ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setResetMode(true)}>
                    Reset Password
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="reset-password" required>
                        New Password
                      </Label>
                      <Input
                        id="reset-password"
                        type="password"
                        variant="elevated"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={resetMutation.isPending || newPwd.trim().length < 6}
                        onClick={() => {
                          if (!initialData) return;
                          const pwd = newPwd.trim();
                          if (pwd.length < 6) return;
                          resetMutation.mutate({ id: initialData.id, newPassword: pwd });
                          setResetMode(false);
                          setNewPwd("");
                        }}
                      >
                        Save New Password
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setResetMode(false); setNewPwd(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {initialData.twoFactorEnabled && onDisable2fa && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDisable2fa}
                  >
                    Remove 2FA
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="secondary"
                disabled={
                  isLoading ||
                  !name.trim() ||
                  !email.trim() ||
                  (!hidePassword && !password.trim())
                }
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
