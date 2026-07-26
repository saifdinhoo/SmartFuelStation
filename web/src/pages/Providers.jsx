import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as providersApi from '../api/providers';

// Admin-only page (routed behind ProtectedRoute roles={['ADMIN']}).
function Providers() {
  const { token } = useAuth();
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await providersApi.listProviders(token);
      setProviders(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApprove(id) {
    try {
      await providersApi.approveProvider(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Providers</h1>
      {error && <p className="form-error">{error}</p>}

      <ul className="provider-list">
        {providers.map((provider) => (
          <li key={provider.id}>
            <strong>{provider.businessName}</strong> — {provider.address}
            <span> ({provider.user.email})</span>
            <span> — {provider.isApproved ? 'Approved' : 'Pending'}</span>
            {!provider.isApproved && (
              <button onClick={() => handleApprove(provider.id)}>Approve</button>
            )}
          </li>
        ))}
        {providers.length === 0 && <li>No providers yet.</li>}
      </ul>
    </div>
  );
}

export default Providers;
