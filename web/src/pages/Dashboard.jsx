import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Welcome, {user?.name}</h1>
      <p>Role: {user?.role}</p>

      {user?.role === 'PROVIDER' && user?.provider && (
        <p>
          Business approval status:{' '}
          <strong>{user.provider.isApproved ? 'Approved' : 'Pending approval'}</strong>
        </p>
      )}
    </div>
  );
}

export default Dashboard;
