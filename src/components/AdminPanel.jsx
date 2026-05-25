import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LogOut, Upload, Image as ImageIcon, Edit2, Check } from 'lucide-react';
import { getImagePath } from '../utils/helpers';
import { supabase } from '../utils/supabaseClient';

export default function AdminPanel({ sarees, onAddSaree, onUpdateSaree, onToggleSold, onDeleteSaree }) {
  // Real Supabase Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('kalamkari');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSold, setIsSold] = useState(false);
  
  // Track if we are editing an existing item
  const [editingSaree, setEditingSaree] = useState(null);

  // Check auth session on load and listen to changes
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError('');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setLoginError(err.message || 'Error signing in. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Convert to Base64 to store in LocalStorage for testing
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditing = (saree) => {
    setEditingSaree(saree);
    setTitle(saree.title);
    setCode(saree.code);
    setType(saree.type);
    setDescription(saree.description);
    setImagePreview(saree.image);
    setIsSold(saree.sold);
    // Scroll form into view for mobile users
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingSaree(null);
    setTitle('');
    setCode('');
    setType('kalamkari');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    setIsSold(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !code || !description || !imagePreview) {
      alert('Please fill out all fields and upload a photo.');
      return;
    }

    if (editingSaree) {
      const updatedSaree = {
        ...editingSaree,
        code: code.toUpperCase(),
        title,
        type,
        description,
        image: imagePreview,
        sold: isSold
      };

      onUpdateSaree(updatedSaree);
      setEditingSaree(null);
      alert('Saree updated successfully!');
    } else {
      const newSaree = {
        id: `saree-${Date.now()}`,
        code: code.toUpperCase(),
        title,
        type,
        description,
        image: imagePreview,
        sold: isSold
      };

      onAddSaree(newSaree);
      alert('Saree added successfully!');
    }
    
    // Reset Form
    setTitle('');
    setCode('');
    setType('kalamkari');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    setIsSold(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-indigo)', marginBottom: '16px' }}>Admin Dashboard</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Log in with your secure account to manage the Loom & Lace showroom catalog.
        </p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              placeholder="e.g. mom@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          {loginError && <p style={{ color: 'var(--accent-terracotta)', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{loginError}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loginLoading}>
            {loginLoading ? 'Authenticating...' : 'Secure Log In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Admin Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '40px 0' }}>
        <div>
          <h1 style={{ color: 'var(--primary-indigo)', fontSize: '36px' }}>Catalog Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Add new stock or toggle "Sold!" tags instantly.</p>
        </div>
        <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogOut size={16} />
          Log Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
        
        {/* Left Side: Add Saree Form */}
        <div>
          <form className="admin-card" onSubmit={handleSubmit} style={{ margin: '0', maxWidth: '100%' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--primary-indigo)' }}>{editingSaree ? `Edit Saree ${editingSaree.code}` : 'Upload New Saree'}</h2>
            
            <div className="form-group">
              <label className="form-label">Saree Code</label>
              <input 
                type="text" 
                placeholder="e.g. LK-105 or SC-212"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Saree Name / Title</label>
              <input 
                type="text" 
                placeholder="e.g. Indigo Paisley Weave"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Weave Category</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="form-select"
              >
                <option value="kalamkari">Kalamkari (Hand-Painted)</option>
                <option value="silk-cotton">Silk Cotton (Handloom)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description & Details</label>
              <textarea 
                rows="4"
                placeholder="Describe the weaving technique, color palette, dyes, or handloom accents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Upload Photo</label>
              <div 
                className="file-upload-zone"
                onClick={() => document.getElementById('saree-file-input').click()}
              >
                <Upload className="upload-icon" size={24} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)' }}>Tap to snap a photo or choose from library</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>JPEG or PNG formats supported</p>
                <input 
                  id="saree-file-input"
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {imagePreview && (
                <div className="file-preview-grid">
                  <div className="file-preview-item">
                    <img src={imagePreview} className="file-preview-img" alt="Saree preview" />
                    <button 
                      type="button" 
                      className="btn-remove-preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview('');
                        setImageFile(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="form-label" style={{ margin: '0' }}>Mark as Already Sold?</span>
              <div className="switch-container">
                <input 
                  type="checkbox" 
                  id="sold-switch"
                  checked={isSold}
                  onChange={(e) => setIsSold(e.target.checked)}
                  className="switch-input-hidden"
                />
                <label htmlFor="sold-switch" className="switch-slider"></label>
                <span className="switch-label" style={{ color: isSold ? 'var(--accent-terracotta)' : 'var(--text-muted)', fontWeight: '600' }}>
                  {isSold ? 'Sold' : 'Available'}
                </span>
              </div>
            </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
               <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                 {editingSaree ? <Check size={18} /> : <Plus size={18} />}
                 {editingSaree ? 'Save Saree Details' : 'Publish Saree to Showroom'}
               </button>
               {editingSaree && (
                 <button type="button" className="btn-secondary" onClick={cancelEditing} style={{ width: '100%', justifyContent: 'center' }}>
                   Cancel Edit
                 </button>
               )}
             </div>
          </form>
        </div>

        {/* Right Side: Manage Existing Stock */}
        <div className="admin-card" style={{ margin: '0', maxWidth: '100%' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--primary-indigo)' }}>Live Catalog ({sarees.length})</h2>
          
          <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
            {sarees.length > 0 ? (
              sarees.map((saree) => (
                <div className="admin-saree-row" key={saree.id}>
                  <img src={getImagePath(saree.image)} alt={saree.title} className="admin-saree-thumb" />
                  <div className="admin-saree-meta">
                    <div className="admin-saree-name">{saree.title}</div>
                    <div className="admin-saree-type">
                      Code: <strong style={{ color: 'var(--text-dark)' }}>{saree.code}</strong> • {saree.type === 'kalamkari' ? 'Kalamkari' : 'Silk Cotton'}
                    </div>
                  </div>

                  {/* Sold Switch */}
                  <div className="switch-container">
                    <input 
                      type="checkbox" 
                      id={`sold-switch-${saree.id}`}
                      checked={saree.sold}
                      onChange={() => onToggleSold(saree.id)}
                      className="switch-input-hidden"
                    />
                    <label htmlFor={`sold-switch-${saree.id}`} className="switch-slider"></label>
                  </div>

                  {/* Edit button */}
                  <button 
                    onClick={() => startEditing(saree)}
                    style={{ color: 'var(--accent-gold)', padding: '6px', marginRight: '4px' }}
                    title="Edit Saree Details"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* Delete button */}
                  <button 
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${saree.title}?`)) {
                        onDeleteSaree(saree.id);
                      }
                    }}
                    style={{ color: '#c53030', padding: '6px' }}
                    title="Delete Saree"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No sarees in showroom.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
