import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const DEFAULT_FORM = {
  name: '',
  email: '',
  role: 'resident',
  status: 'pending',
  assignedRoom: '',
  permissions: '',
};

const statusTone = {
  active: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/35',
  pending: 'bg-amber-500/20 text-amber-200 border border-amber-400/35',
  restricted: 'bg-rose-500/20 text-rose-200 border border-rose-400/35',
};

const roleTone = {
  resident: 'bg-sky-500/20 text-sky-200 border border-sky-400/35',
  user: 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/35',
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const normalizePermissions = (permissionsInput = '') => {
  if (!permissionsInput.trim()) return [];
  return [...new Set(permissionsInput.split(',').map((item) => item.trim()).filter(Boolean))];
};

const UserManagement = () => {
  const {
    user,
    houseCrew,
    fetchHouseCrew,
    createHouseMember,
    updateHouseMember,
    deleteHouseMember,
    adminPermissionRequests,
    fetchAdminRequests,
    reviewPermissionRequest,
  } = useContext(AuthContext);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'requests' ? 'requests' : 'users');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState('');

  const [showAddModal, setShowAddModal] = useState(searchParams.get('openAdd') === '1');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const load = async () => {
      setLoadingUsers(true);
      await fetchHouseCrew();
      setLoadingUsers(false);
    };

    load();
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    if (activeTab !== 'requests') return;

    const loadRequests = async () => {
      setLoadingRequests(true);
      await fetchAdminRequests();
      setLoadingRequests(false);
    };

    loadRequests();
  }, [activeTab, user?.role]);

  useEffect(() => {
    if (!searchParams.get('openAdd')) return;
    setShowAddModal(searchParams.get('openAdd') === '1');
  }, [searchParams]);

  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    const safeHouseCrew = Array.isArray(houseCrew) ? houseCrew : [];

    return safeHouseCrew.filter((houseUser) => {
      const matchesQuery =
        !q ||
        houseUser.name?.toLowerCase().includes(q) ||
        houseUser.email?.toLowerCase().includes(q) ||
        houseUser.role?.toLowerCase().includes(q) ||
        houseUser.assignedRoom?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || houseUser.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [houseCrew, search, statusFilter]);

  const pendingRequests = useMemo(() => {
    const safeAdminRequests = Array.isArray(adminPermissionRequests) ? adminPermissionRequests : [];
    return safeAdminRequests.filter((request) => request.status === 'pending').length;
  }, [adminPermissionRequests]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'users') {
      next.delete('openAdd');
    }
    setSearchParams(next, { replace: true });
  };

  const openAddModal = () => {
    setForm(DEFAULT_FORM);
    setError('');
    setShowAddModal(true);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'users');
    next.set('openAdd', '1');
    setSearchParams(next, { replace: true });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    const next = new URLSearchParams(searchParams);
    next.delete('openAdd');
    setSearchParams(next, { replace: true });
  };

  const openEditModal = (houseUser) => {
    setSelectedUser(houseUser);
    setForm({
      name: houseUser.name || '',
      email: houseUser.email || '',
      role: houseUser.role || 'resident',
      status: houseUser.status || 'active',
      assignedRoom: houseUser.assignedRoom || '',
      permissions: (houseUser.permissions || []).join(', '),
    });
    setError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setForm(DEFAULT_FORM);
  };

  const handleAddUser = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setSubmitting(true);
    const result = await createHouseMember({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.status,
      assignedRoom: form.assignedRoom.trim(),
      permissions: normalizePermissions(form.permissions),
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Unable to create user.');
      return;
    }

    closeAddModal();
    setForm(DEFAULT_FORM);
  };

  const handleEditUser = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;

    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setSubmitting(true);
    const result = await updateHouseMember(selectedUser._id, {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.status,
      assignedRoom: form.assignedRoom.trim(),
      permissions: normalizePermissions(form.permissions),
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Unable to update user.');
      return;
    }

    closeEditModal();
  };

  const handleDeleteUser = async (id) => {
    const ok = window.confirm('Remove this user from the house system?');
    if (!ok) return;

    const result = await deleteHouseMember(id);
    if (!result.success) {
      setError(result.error || 'Unable to remove user.');
    }
  };

  const reviewRequest = async (requestId, decision) => {
    setBusyRequestId(requestId + decision);
    await reviewPermissionRequest({ requestId, decision });
    setBusyRequestId('');
  };

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-100">
        This page is available for house admins only.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-3xl border border-amber-300/35 bg-amber-500/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Crew Control Panel</p>
            <h1 className="mt-2 text-3xl font-black text-white">User Management</h1>
            <p className="mt-2 text-sm text-zinc-100/85 max-w-2xl">
              Centralize resident lifecycle management with role, status, permission, and request controls.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300/30 bg-black/20 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/80">Current House</p>
            <p className="text-lg font-black text-amber-100">{user.houseCode || '-'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchTab('users')}
            className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'users'
                ? 'bg-amber-300 text-amber-950'
                : 'bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]'
            }`}
          >
            Users
          </button>
          <button
            type="button"
            onClick={() => switchTab('requests')}
            className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'requests'
                ? 'bg-sky-300 text-sky-950'
                : 'bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]'
            }`}
          >
            Requests {pendingRequests > 0 ? `(${pendingRequests})` : ''}
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, role, room"
                className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/60"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-amber-950 transition hover:brightness-105"
            >
              Add User
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-black/25 text-left text-xs uppercase tracking-[0.12em] text-zinc-300">
                  <tr>
                    <th className="px-4 py-3">User Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-300">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-300">
                        No users found for current filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((houseUser) => (
                      <tr key={houseUser._id} className="bg-white/[0.02] hover:bg-white/[0.05]">
                        <td className="px-4 py-3 font-semibold text-zinc-100">{houseUser.name}</td>
                        <td className="px-4 py-3 text-zinc-300">{houseUser.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${roleTone[houseUser.role] || roleTone.resident}`}>
                            {houseUser.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone[houseUser.status] || statusTone.pending}`}>
                            {houseUser.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{formatDate(houseUser.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(houseUser)}
                              className="rounded-lg border border-sky-300/35 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(houseUser._id)}
                              className="rounded-lg border border-rose-300/35 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-black/25 text-left text-xs uppercase tracking-[0.12em] text-zinc-300">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-300">
                        Loading requests...
                      </td>
                    </tr>
                  ) : adminPermissionRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-300">
                        No requests available.
                      </td>
                    </tr>
                  ) : (
                    adminPermissionRequests.map((request) => (
                      <tr key={request._id} className="bg-white/[0.02] hover:bg-white/[0.05]">
                        <td className="px-4 py-3 text-zinc-100">
                          <p className="font-semibold">{request.requester?.name || '-'}</p>
                          <p className="text-xs text-zinc-400">{request.requester?.email || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-zinc-200">{request.actionLabel}</td>
                        <td className="px-4 py-3 text-zinc-300">{request.room || 'Global'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone[request.status] || 'bg-zinc-700/40 text-zinc-100 border border-zinc-500/40'}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{formatDate(request.createdAt)}</td>
                        <td className="px-4 py-3">
                          {request.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busyRequestId === request._id + 'approved'}
                                onClick={() => reviewRequest(request._id, 'approved')}
                                className="rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-100 disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busyRequestId === request._id + 'denied'}
                                onClick={() => reviewRequest(request._id, 'denied')}
                                className="rounded-lg border border-rose-300/35 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-100 disabled:opacity-60"
                              >
                                Deny
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => window.alert(request.reason || request.reviewNote || 'No additional details.')}
                              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-zinc-100"
                            >
                              Review Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-xl font-black text-white">
              {showEditModal ? 'Edit User' : 'Add User'}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              House Code: {user.houseCode || '-'}
            </p>

            <form onSubmit={showEditModal ? handleEditUser : handleAddUser} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-zinc-200">
                  <span>Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-amber-300/60"
                  />
                </label>

                <label className="space-y-1 text-sm text-zinc-200">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-amber-300/60"
                  />
                </label>

                <label className="space-y-1 text-sm text-zinc-200">
                  <span>Role</span>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none"
                  >
                    <option value="resident">Resident</option>
                    <option value="user">User</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm text-zinc-200">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm text-zinc-200 block">
                <span>Assigned Room</span>
                <input
                  value={form.assignedRoom}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignedRoom: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-amber-300/60"
                />
              </label>

              <label className="space-y-1 text-sm text-zinc-200 block">
                <span>Permissions (comma separated)</span>
                <input
                  value={form.permissions}
                  onChange={(event) => setForm((prev) => ({ ...prev, permissions: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-amber-300/60"
                  placeholder="rooms:other, shared:scenarios"
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={showEditModal ? closeEditModal : closeAddModal}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-amber-950 disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : showEditModal ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
