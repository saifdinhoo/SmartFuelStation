import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'CUSTOMER',
  businessName: '',
  address: '',
};

function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const { loginWithResult } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.register(form);
      loginWithResult(res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Account type
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="CUSTOMER">Customer</option>
            <option value="PROVIDER">Service Provider</option>
          </select>
        </label>

        {form.role === 'PROVIDER' && (
          <>
            <label>
              Business name
              <input name="businessName" value={form.businessName} onChange={handleChange} required />
            </label>
            <label>
              Address
              <input name="address" value={form.address} onChange={handleChange} required />
            </label>
            <p className="form-hint">
              Your provider account will need admin approval before it's active.
            </p>
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Register;
