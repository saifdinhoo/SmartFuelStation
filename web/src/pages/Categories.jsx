import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as categoriesApi from '../api/categories';

function Categories() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await categoriesApi.listCategories(token);
      setCategories(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await categoriesApi.updateCategory(token, editingId, form);
      } else {
        await categoriesApi.createCategory(token, form);
      }
      setForm({ name: '', description: '' });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description || '' });
  }

  async function handleDelete(id) {
    try {
      await categoriesApi.deleteCategory(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Service Categories</h1>

      {error && <p className="form-error">{error}</p>}

      <ul className="category-list">
        {categories.map((category) => (
          <li key={category.id}>
            <strong>{category.name}</strong>
            {category.description && <span> — {category.description}</span>}
            {isAdmin && (
              <span className="category-actions">
                <button onClick={() => startEdit(category)}>Edit</button>
                <button onClick={() => handleDelete(category.id)}>Delete</button>
              </span>
            )}
          </li>
        ))}
        {categories.length === 0 && <li>No categories yet.</li>}
      </ul>

      {isAdmin && (
        <form onSubmit={handleSubmit} className="category-form">
          <h2>{editingId ? 'Edit category' : 'Add category'}</h2>
          <label>
            Name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Description
            <input name="description" value={form.description} onChange={handleChange} />
          </label>
          <button type="submit">{editingId ? 'Update' : 'Create'}</button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ name: '', description: '' });
              }}
            >
              Cancel
            </button>
          )}
        </form>
      )}
    </div>
  );
}

export default Categories;
