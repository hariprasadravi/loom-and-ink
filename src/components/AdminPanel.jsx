import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LogOut, Upload, Image as ImageIcon, Edit2, Check, ArrowLeft, Mail, KeyRound, Clock } from 'lucide-react';
import { getImagePath } from '../utils/helpers';
import { supabase } from '../utils/supabaseClient';

export default function AdminPanel({ sarees, onAddSaree, onUpdateSaree, onToggleSold, onDeleteSaree }) {
  // Real Supabase Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // OTP Authentication State
  const [loginMode, setLoginMode] = useState('password'); // 'otp' or 'password'
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

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

  // Resend code countdown timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setLoginError('Please enter your email address.');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError('');
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Prevents unknown signups
        }
      });

      if (error) throw error;
      setOtpSent(true);
      setResendTimer(60);
    } catch (err) {
      setLoginError(err.message || 'Error sending code. Please verify that your email is registered in Supabase.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpToken) {
      setLoginError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError('');
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpToken,
        type: 'email'
      });

      if (error) throw error;
    } catch (err) {
      setLoginError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

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
      <div className="login-container" style={{ backgroundColor: 'var(--bg-card)', maxWidth: '420px', margin: '60px auto', borderRadius: '12px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-indigo)', marginBottom: '8px', fontSize: '26px' }}>Admin Dashboard</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
          Secure management access for Chennai & US team members.
        </p>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', paddingBottom: '8px' }}>
          <button 
            type="button"
            onClick={() => { setLoginMode('otp'); setLoginError(''); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '8px 4px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              color: loginMode === 'otp' ? 'var(--primary-indigo)' : 'var(--text-muted)',
              borderBottom: loginMode === 'otp' ? '2px solid var(--primary-indigo)' : '2px solid transparent',
              transition: 'all 0.3s ease'
            }}
          >
            Email OTP (Passwordless)
          </button>
          <button 
            type="button"
            onClick={() => { setLoginMode('password'); setLoginError(''); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '8px 4px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              color: loginMode === 'password' ? 'var(--primary-indigo)' : 'var(--text-muted)',
              borderBottom: loginMode === 'password' ? '2px solid var(--primary-indigo)' : '2px solid transparent',
              transition: 'all 0.3s ease'
            }}
          >
            Password Login
          </button>
        </div>

        {/* Tab 1: OTP Login Flow */}
        {loginMode === 'otp' ? (
          !otpSent ? (
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <Mail size={14} style={{ color: 'var(--accent-gold)' }} /> Registered Email Address
                </label>
                <input 
                  type="email" 
                  placeholder="e.g. mom@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              {loginError && <p style={{ color: 'var(--accent-terracotta)', fontSize: '13px', marginBottom: '16px', textAlign: 'center', lineHeight: '1.4' }}>{loginError}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loginLoading}>
                {loginLoading ? 'Requesting Code...' : 'Get Secure OTP Code'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
                A 6-digit numeric login code will be sent straight to your inbox.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <p style={{ fontSize: '13px', color: '#2f855a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', backgroundColor: '#f0fff4', padding: '8px', borderRadius: '6px', border: '1px solid #c6f6d5' }}>
                <Check size={14} /> Code sent to <strong>{email}</strong>
              </p>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <KeyRound size={14} style={{ color: 'var(--accent-gold)' }} /> Enter 6-Digit Passcode
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="••••••"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                  className="form-input"
                  style={{ letterSpacing: '0.4em', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}
                  required
                  autoFocus
                />
              </div>
              {loginError && <p style={{ color: 'var(--accent-terracotta)', fontSize: '13px', marginBottom: '16px', textAlign: 'center', lineHeight: '1.4' }}>{loginError}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loginLoading}>
                {loginLoading ? 'Verifying...' : 'Verify & Log In'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '13px' }}>
                <button 
                  type="button" 
                  onClick={() => { setOtpSent(false); setOtpToken(''); setLoginError(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', fontSize: '13px' }}
                >
                  <ArrowLeft size={14} /> Change Email
                </button>

                {resendTimer > 0 ? (
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <Clock size={12} /> Resend in {resendTimer}s
                  </span>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleSendOtp}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-indigo)', fontWeight: '600', cursor: 'pointer', padding: '0', fontSize: '13px' }}
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )
        ) : (
          /* Tab 2: Password Login Flow */
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <Mail size={14} style={{ color: 'var(--accent-gold)' }} /> Email Address
              </label>
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
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <KeyRound size={14} style={{ color: 'var(--accent-gold)' }} /> Password
              </label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
            {loginError && <p style={{ color: 'var(--accent-terracotta)', fontSize: '13px', marginBottom: '16px', textAlign: 'center', lineHeight: '1.4' }}>{loginError}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loginLoading}>
              {loginLoading ? 'Authenticating...' : 'Secure Log In'}
            </button>
          </form>
        )}
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
