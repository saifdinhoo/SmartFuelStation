import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/categories">Service Categories</Link>
      {user?.role === 'ADMIN' && <Link to="/providers">Providers</Link>}
      <span className="navbar-spacer" />
      {user && (
        <>
          <span>
            {user.name} ({user.role})
          </span>
          <button onClick={handleLogout}>Logout</button>
        </>
      )}
    </nav>
  );
}

export default Navbar;
