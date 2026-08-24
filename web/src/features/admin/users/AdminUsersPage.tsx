import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ShieldCheck, User, Users } from 'lucide-react';
import { Reveal } from '@/components/common/Reveal';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatCard } from '@/components/dashboard/StatCard';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchAdminUser, fetchAdminUsers, type UserRole } from '@/features/admin/adminApi';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'PROVIDER', label: 'Providers' },
  { value: 'ADMIN', label: 'Admins' },
];

const ROLE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'success'> = {
  CUSTOMER: 'secondary',
  PROVIDER: 'default',
  ADMIN: 'success',
};

function UserDetailModal({ userId, onClose }: { userId: number | null; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => fetchAdminUser(userId as number),
    enabled: userId !== null,
  });

  const user = query.data;

  return (
    <Modal open={userId !== null} onClose={onClose} title={user?.name ?? 'User details'}>
      {query.isPending && <Skeleton className="h-64 rounded-lg" />}
      {query.isError && (
        <ErrorState
          description={getErrorMessage(query.error, 'Could not load this user.')}
          onRetry={() => query.refetch()}
        />
      )}
      {user && (
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-col gap-2">
            {[
              ['Email', user.email],
              ['Phone', user.phone ?? '—'],
              ['Role', user.role],
              ['Joined', new Date(user.createdAt).toLocaleString()],
              ['Bookings', String(user._count.bookings)],
              ['Reviews', String(user._count.reviews)],
              ['Complaints filed', String(user._count.complaints)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {user.provider && (
            <div>
              <h3 className="text-heading-3 mb-2">Business</h3>
              <div className="flex flex-col gap-2">
                {[
                  ['Name', user.provider.businessName],
                  ['Address', user.provider.address],
                  ['Approved', user.provider.isApproved ? 'Yes' : 'No'],
                  ['Open', user.provider.isOpen ? 'Yes' : 'No'],
                  ['Services', String(user.provider._count.services)],
                  ['Reviews', String(user.provider._count.reviews)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.bookings.length > 0 && (
            <div>
              <h3 className="text-heading-3 mb-2">Recent bookings</h3>
              <ul className="flex flex-col gap-1">
                {user.bookings.map((b) => (
                  <li key={b.id} className="flex justify-between text-muted-foreground">
                    <span>{b.providerService.name}</span>
                    <span>
                      {b.status} · {new Date(b.scheduledAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AdminUsersPage() {
  const [role, setRole] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Filtering happens server-side (GET /admin/users?role=&search=) so the
  // browser never receives rows the admin didn't ask for.
  const query = useQuery({
    queryKey: ['admin', 'users', { role, search }],
    queryFn: () => fetchAdminUsers({ role, search: search.trim() || undefined }),
  });

  const users = query.data ?? [];
  const counts = {
    customers: users.filter((u) => u.role === 'CUSTOMER').length,
    providers: users.filter((u) => u.role === 'PROVIDER').length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-2">Users</h1>
        <p className="text-body-sm text-muted-foreground">
          Everyone registered on the platform.
        </p>
      </div>

      {query.isError && (
        <ErrorState
          title="Could not load users"
          description={getErrorMessage(query.error, 'Please try again.')}
          onRetry={() => query.refetch()}
        />
      )}

      {!query.isError && (
        <>
          <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Shown" value={users.length} icon={Users} />
            <StatCard label="Customers" value={counts.customers} icon={User} />
            <StatCard label="Providers" value={counts.providers} icon={Building2} />
            <StatCard label="Admins" value={counts.admins} icon={ShieldCheck} />
          </Reveal>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <SearchInput
                label="Search users"
                hideLabel
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              label="Role"
              hideLabel
              options={ROLE_OPTIONS}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          {query.isPending && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          )}

          {!query.isPending && users.length === 0 && (
            <EmptyState
              icon={Users}
              title="No users match"
              description="Try a different role or search term."
            />
          )}

          {!query.isPending && users.length > 0 && (
            <Reveal delay={0.05} className="flex flex-col gap-2">
              {users.map((u) => (
                <Card key={u.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-caption">
                        {u.email}
                        {u.phone ? ` · ${u.phone}` : ''} · Joined{' '}
                        {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                      {u.provider && (
                        <p className="text-caption">
                          {u.provider.businessName} ·{' '}
                          {u.provider.isApproved ? 'approved' : 'pending approval'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-caption hidden sm:inline">
                        {u._count.bookings} bookings · {u._count.reviews} reviews
                      </span>
                      <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                      <Button
                        variant="ghost"
                        className="h-8 px-3 text-xs"
                        onClick={() => setSelectedId(u.id)}
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </Reveal>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-heading-3">Account actions</h2>
            </CardHeader>
            <CardContent>
              <Alert variant="info" title="Activating and deactivating accounts isn't available">
                The <code>User</code> table has no status, isActive, or deletedAt column, so there is
                nothing to switch an account between. Role changes are also not offered: a provider
                account is tied to a Provider record, and changing its role would strand that data.
                Both need a schema change.
              </Alert>
            </CardContent>
          </Card>
        </>
      )}

      <UserDetailModal userId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
