import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LogOut, Upload, Image as ImageIcon, Edit2, Check, ArrowLeft, Mail, KeyRound, Star, Sparkles } from 'lucide-react';
import { getImagePath } from '../utils/helpers';
import { supabase } from '../utils/supabaseClient';
import { removeBackground } from '@imgly/background-removal';

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
  const [price, setPrice] = useState('5,000');
  const [imagePreviews, setImagePreviews] = useState([]); // Array of { url: string, isCover: boolean, processing?: boolean }
  const [isSold, setIsSold] = useState(false);
  const [autoRemoveBg, setAutoRemoveBg] = useState(false); // AI background removal toggle
  
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

  const compressImage = (base64Str, maxWidth = 1000, quality = 0.8) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Maintain transparency format if it is a transparent PNG, otherwise compress to JPEG
        const format = base64Str.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(format, quality));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleAIClearBackground = async (index, customUrl = null) => {
    const targetImg = imagePreviews[index];
    const sourceUrl = customUrl || targetImg?.url;
    if (!sourceUrl) return;

    // Set processing state for this image preview card
    setImagePreviews((prev) =>
      prev.map((img, i) => (i === index ? { ...img, processing: true } : img))
    );

    try {
      // Trigger browser-based WebAssembly background removal
      const resultBlob = await removeBackground(sourceUrl);
      
      // Convert result PNG blob to base64 dataURL
      const base64Url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });

      // Compress transparent PNG output to keep database payload lightweight
      const compressedBgRemoved = await compressImage(base64Url);

      // Update image previews state with processed data URL
      setImagePreviews((prev) =>
        prev.map((img, i) =>
          i === index ? { ...img, url: compressedBgRemoved, processing: false } : img
        )
      );
    } catch (err) {
      console.error('Error running AI background removal:', err);
      alert('AI background removal encountered an issue. The original photo will be used instead.');
      setImagePreviews((prev) =>
        prev.map((img, i) => (i === index ? { ...img, processing: false } : img))
      );
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Create new slots first
      const newItems = files.map((file, idx) => ({
        url: '', // Will be loaded dynamically
        isCover: false,
        processing: false,
        name: file.name,
        fileObj: file
      }));

      // Add placeholder slots to imagePreviews instantly so the user has immediate feedback
      let baseLength = 0;
      setImagePreviews((prev) => {
        baseLength = prev.length;
        const updated = [...prev];
        newItems.forEach((item, index) => {
          if (updated.length === 0 && index === 0) {
            item.isCover = true;
          }
          updated.push(item);
        });
        return updated;
      });

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Read file as base64 first
        const rawBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });

        // Perform browser-side compression down to standard web size (~150KB)
        const compressedBase64 = await compressImage(rawBase64);
        const targetIndex = baseLength + i;

        // Set the loaded image URL
        setImagePreviews((prev) =>
          prev.map((img, idx) => (idx === targetIndex ? { ...img, url: compressedBase64 } : img))
        );

        // If auto-remove background is toggled, trigger the AI background removal immediately
        if (autoRemoveBg) {
          handleAIClearBackground(targetIndex, compressedBase64);
        }
      }
    }
  };

  const setAsCover = (index) => {
    setImagePreviews((prev) =>
      prev.map((img, i) => ({
        ...img,
        isCover: i === index
      }))
    );
  };

  const removeImage = (index) => {
    setImagePreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // If we deleted the cover, make the first remaining image the cover
      if (prev[index]?.isCover && updated.length > 0) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  const startEditing = async (saree) => {
    setEditingSaree(saree);
    setTitle(saree.title);
    setCode(saree.code);
    setType(saree.type);
    setDescription(saree.description);
    setPrice(saree.price || '5,000');
    setIsSold(saree.sold);

    // Load cover image immediately to prevent uploader UI jumping
    let imgs = [{ url: saree.image, isCover: true }];
    setImagePreviews(imgs);

    // Fetch full secondary images asynchronously in the background
    try {
      const { data, error } = await supabase
        .from('sarees')
        .select('images')
        .eq('id', saree.id)
        .single();

      if (!error && data && data.images) {
        const parsed = JSON.parse(data.images);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imgs = parsed.map(url => ({
            url,
            isCover: url === saree.image
          }));
          if (!imgs.some(img => img.isCover)) {
            imgs[0].isCover = true;
          }
          setImagePreviews(imgs);
        }
      }
    } catch (err) {
      console.error('Error fetching images for editing:', err);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingSaree(null);
    setTitle('');
    setCode('');
    setType('kalamkari');
    setDescription('');
    setPrice('5,000');
    setImagePreviews([]);
    setIsSold(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !code || !description) {
      alert('Please fill out all text fields.');
      return;
    }

    if (imagePreviews.length === 0) {
      alert('Please upload at least one photo.');
      return;
    }

    let coverImg = imagePreviews.find(img => img.isCover)?.url;
    if (!coverImg && imagePreviews.length > 0) {
      coverImg = imagePreviews[0].url;
    }

    const serializedImages = JSON.stringify(imagePreviews.map(img => img.url));

    if (editingSaree) {
      const updatedSaree = {
        ...editingSaree,
        code: code.toUpperCase(),
        title,
        type,
        description,
        price,
        image: coverImg,
        images: serializedImages,
        sold: isSold
      };

      onUpdateSaree(updatedSaree);
      setEditingSaree(null);
      alert('Item updated successfully!');
    } else {
      const newSaree = {
        id: `saree-${Date.now()}`,
        code: code.toUpperCase(),
        title,
        type,
        description,
        price,
        image: coverImg,
        images: serializedImages,
        sold: isSold
      };

      onAddSaree(newSaree);
      alert('Item added successfully!');
    }
    
    // Reset Form
    setTitle('');
    setCode('');
    setType('kalamkari');
    setDescription('');
    setPrice('5,000');
    setImagePreviews([]);
    setIsSold(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container" style={{ backgroundColor: 'var(--bg-card)', maxWidth: '400px', margin: '60px auto', borderRadius: '12px', padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-indigo)', marginBottom: '8px', fontSize: '26px' }}>Admin Dashboard</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
          Secure management access for Chennai & US team members.
        </p>

        <form onSubmit={handleLogin}>
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
              <label className="form-label">Item Category</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="form-select"
              >
                <option value="kalamkari">Kalamkari (Hand-Painted)</option>
                <option value="silk-cotton">Silk Cotton (Handloom)</option>
                <option value="soft-silk">Soft Silks</option>
                <option value="semi-silk-cotton">Semi Silk Cottons</option>
                <option value="summer-cotton">Summer Cottons</option>
                <option value="traditional-cotton">Traditional Cottons (Chettinad/Narayanapet/Kanchi)</option>
                <option value="nighties">Nighties</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input 
                type="text" 
                placeholder="e.g. 5,000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-input"
                required
              />
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
              <label className="form-label">Upload Photos (Multiple Supported)</label>
              <div 
                className="file-upload-zone"
                onClick={() => document.getElementById('saree-file-input').click()}
              >
                <Upload className="upload-icon" size={24} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-dark)' }}>Tap to snap photos or choose from gallery</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Select one or multiple images at once</p>
                <input 
                  id="saree-file-input"
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* AI Auto-Remove Background Toggle Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '6px 12px', backgroundColor: 'rgba(230, 214, 195, 0.25)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                <input 
                  type="checkbox" 
                  id="auto-bg-toggle" 
                  checked={autoRemoveBg} 
                  onChange={(e) => setAutoRemoveBg(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-terracotta)', margin: 0 }}
                />
                <label htmlFor="auto-bg-toggle" style={{ fontSize: '12px', color: 'var(--text-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', userSelect: 'none' }}>
                  <Sparkles size={13} style={{ color: 'var(--accent-gold)' }} />
                  Auto-clear backgrounds on upload (AI)
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  {imagePreviews.map((img, index) => (
                    <div key={index} style={{ position: 'relative', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '4px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {img.url ? (
                        <img src={img.url} alt={`upload-${index}`} style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <div style={{ width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                          <div style={{ border: '2px solid #eee', borderTop: '2px solid var(--accent-terracotta)', borderRadius: '50%', width: '12px', height: '12px', animation: 'spin 1s linear infinite' }}></div>
                        </div>
                      )}
                      
                      {/* Interactive Buttons Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'space-around', borderTop: '1px solid var(--border-light)', paddingTop: '4px', marginTop: '2px' }}>
                        {/* Set Cover Star Button */}
                        <button
                          type="button"
                          onClick={() => setAsCover(index)}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={img.isCover ? "Main Thumbnail Cover" : "Set as Cover"}
                        >
                          <Star size={13} fill={img.isCover ? "#c5a059" : "none"} stroke={img.isCover ? "#c5a059" : "var(--text-muted)"} />
                        </button>

                        {/* AI Clear Background Button */}
                        <button
                          type="button"
                          onClick={() => handleAIClearBackground(index)}
                          disabled={img.processing || !img.url}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: (img.processing || !img.url) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove background (legs, sofa) using AI"
                        >
                          <Sparkles size={13} style={{ color: 'var(--accent-terracotta)' }} />
                        </button>
                      </div>

                      {/* Remove Image Cross Button */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#c53030', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', zIndex: 11 }}
                        title="Delete Image"
                      >
                        ×
                      </button>

                      {/* AI Loading/Processing Mask overlay */}
                      {img.processing && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '4px' }}>
                          <div style={{ border: '2px solid #f3f3f3', borderTop: '2px solid var(--accent-terracotta)', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite', marginBottom: '4px' }}></div>
                          <span style={{ fontSize: '8px', color: 'var(--accent-terracotta)', fontWeight: '700', textAlign: 'center', lineHeight: '1.1' }}>AI clearing...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="form-label" style={{ margin: '0' }}>Mark as Already Sold?</span>
              <div 
                className="switch-container"
                style={{ position: 'relative' }}
                title="Toggling this instantly sets a 'Sold!' stamp on the showroom page and disables enquiries."
              >
                <input 
                  type="checkbox" 
                  id="sold-switch"
                  checked={isSold}
                  onChange={(e) => setIsSold(e.target.checked)}
                  className="switch-input-hidden"
                />
                <label htmlFor="sold-switch" className="switch-slider"></label>
                <span className="switch-label" style={{ color: isSold ? 'var(--accent-terracotta)' : 'var(--text-muted)', fontWeight: '600', marginLeft: '8px' }}>
                  {isSold ? 'Sold' : 'Available'}
                </span>
              </div>
            </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
               <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                 {editingSaree ? <Check size={18} /> : <Plus size={18} />}
                 {editingSaree ? 'Save Item Details' : 'Publish Item to Showroom'}
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
                      Code: <strong style={{ color: 'var(--text-dark)' }}>{saree.code}</strong> • {saree.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </div>
                  </div>

                  {/* Sold Switch with Tooltip */}
                  <div 
                    className="switch-container"
                    title="Toggle to instantly mark this item as Sold or Available."
                  >
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
                    title="Edit Item Details"
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
                    title="Delete Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No items in showroom.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
