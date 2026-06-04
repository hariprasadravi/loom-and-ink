import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LogOut, Upload, Image as ImageIcon, Edit2, Check, ArrowLeft, Mail, KeyRound, Star, Sparkles } from 'lucide-react';
import { getImagePath } from '../utils/helpers';
import { supabase } from '../utils/supabaseClient';
import { removeBackground } from '@imgly/background-removal';

export default function AdminPanel({ sarees, onAddSaree, onUpdateSaree, onToggleSold, onDeleteSaree, needsMigration, onMigrationComplete }) {
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
  const [publishing, setPublishing] = useState(false); // Track bucket publishing loading state
  
  // Track if we are editing an existing item
  const [editingSaree, setEditingSaree] = useState(null);

  // Gemini AI States
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('pattupol-gemini-key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);

  // Helper utility to convert a local file dataURL or absolute HTTP URL to raw base64 data
  const getBase64FromUrlOrData = async (url) => {
    if (url.startsWith('data:')) {
      const parts = url.split(';base64,');
      const mimeType = parts[0].split(':')[1];
      const base64Data = parts[1];
      return { mimeType, base64Data };
    } else if (url.startsWith('http')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          const parts = result.split(';base64,');
          resolve({
            mimeType: blob.type || 'image/jpeg',
            base64Data: parts[1]
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    throw new Error('Unsupported image format');
  };

  const handleAutoGenerate = async () => {
    if (imagePreviews.length === 0) {
      alert('Please upload or select at least one photo first.');
      return;
    }

    const activeKey = geminiApiKey || localStorage.getItem('pattupol-gemini-key') || '';
    if (!activeKey) {
      setShowAiSettings(true);
      alert('Please enter your Gemini API Key in the AI Settings panel first.');
      return;
    }

    try {
      setAiGenerating(true);
      const firstImg = imagePreviews[0].url;
      const { mimeType, base64Data } = await getBase64FromUrlOrData(firstImg);

      const promptText = `Analyze this saree photo. Provide a suitable, elegant title (max 5 words) and a detailed description (2-3 sentences describing the weaving style, color palette, texture, or pattern) in a premium, poetic tone suitable for an authentic Indian handloom saree store. Do not mention prices or stock codes. Respond ONLY in a JSON object with keys "title" and "description", formatted as raw JSON (no markdown formatting, no backticks).`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('Empty response from AI model');
      }

      const result = JSON.parse(candidateText.trim());
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);

      alert('AI copywriting populated successfully!');
    } catch (err) {
      console.error('Error generating AI copy:', err);
      alert(`AI Generation failed: ${err.message || err}`);
    } finally {
      setAiGenerating(false);
    }
  };

  // Database Migration States
  const [migrationStatus, setMigrationStatus] = useState('idle'); // 'idle', 'migrating', 'done', 'error'
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationTotal, setMigrationTotal] = useState(0);
  const [migrationLogs, setMigrationLogs] = useState([]);

  // Sub-component to dynamically load saree thumbnail images inside stock rows
  const AdminSareeRowThumb = ({ saree }) => {
    const [imgUrl, setImgUrl] = useState(saree.image);

    useEffect(() => {
      if (!saree.image) {
        const fetchCover = async () => {
          try {
            const { data } = await supabase
              .from('sarees')
              .select('image')
              .eq('id', saree.id)
              .single();
            if (data && data.image) {
              setImgUrl(data.image);
            }
          } catch (e) {
            console.error(e);
          }
        };
        fetchCover();
      } else {
        setImgUrl(saree.image);
      }
    }, [saree.id, saree.image]);

    return (
      <img src={getImagePath(imgUrl)} alt={saree.title} className="admin-saree-thumb" />
    );
  };

  const startMigration = async () => {
    try {
      setMigrationStatus('migrating');
      setMigrationProgress(0);
      setMigrationTotal(sarees.length);
      setMigrationLogs(['Initiating client-side database migration with authenticated session...']);

      for (let i = 0; i < sarees.length; i++) {
        const saree = sarees[i];
        setMigrationProgress(i);
        setMigrationLogs(prev => [...prev, `[${i + 1}/${sarees.length}] Checking Saree ${saree.code} "${saree.title}"...`]);

        // Fetch single row's image columns (avoids statement timeout)
        const { data: rowData, error: rowError } = await supabase
          .from('sarees')
          .select('image, images')
          .eq('id', saree.id)
          .single();

        if (rowError) {
          setMigrationLogs(prev => [...prev, `  ❌ Error fetching media for ${saree.code}: ${rowError.message}`]);
          continue;
        }

        let updatedImage = rowData.image;
        let updatedImagesList = [];
        let needsUpdate = false;

        // Cover image migration
        if (rowData.image && rowData.image.startsWith('data:')) {
          setMigrationLogs(prev => [...prev, `  -> Base64 cover detected. Uploading to saree-photos storage bucket...`]);
          try {
            const publicUrl = await uploadToStorage(rowData.image, saree.code, 'cover');
            updatedImage = publicUrl;
            needsUpdate = true;
            setMigrationLogs(prev => [...prev, `  ✔ Cover image migrated to CDN!`]);
          } catch (uploadErr) {
            setMigrationLogs(prev => [...prev, `  ❌ Cover image upload failed: ${uploadErr.message || uploadErr}`]);
          }
        }

        // Secondary images migration
        let parsedImages = [];
        try {
          if (rowData.images) {
            parsedImages = JSON.parse(rowData.images);
          }
        } catch (e) {
          if (rowData.images) parsedImages = [rowData.images];
        }

        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          for (let idx = 0; idx < parsedImages.length; idx++) {
            const img = parsedImages[idx];
            if (img && img.startsWith('data:')) {
              setMigrationLogs(prev => [...prev, `  -> Base64 secondary image #${idx + 1} detected. Uploading...`]);
              try {
                const publicUrl = await uploadToStorage(img, saree.code, `sec_${idx}`);
                updatedImagesList.push(publicUrl);
                needsUpdate = true;
                setMigrationLogs(prev => [...prev, `  ✔ Secondary image #${idx + 1} migrated to CDN!`]);
              } catch (uploadErr) {
                setMigrationLogs(prev => [...prev, `  ❌ Secondary image #${idx + 1} upload failed: ${uploadErr.message || uploadErr}`]);
                updatedImagesList.push(img);
              }
            } else if (img) {
              updatedImagesList.push(img);
            }
          }
        }

        // Update database row and local parent state if changes were made
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('sarees')
            .update({
              image: updatedImage,
              images: JSON.stringify(updatedImagesList)
            })
            .eq('id', saree.id);

          if (updateError) {
            setMigrationLogs(prev => [...prev, `  ❌ DB update failed for ${saree.code}: ${updateError.message}`]);
          } else {
            setMigrationLogs(prev => [...prev, `  ✔ Successfully committed CDN URLs to database!`]);
            onUpdateSaree({
              ...saree,
              image: updatedImage,
              images: JSON.stringify(updatedImagesList)
            });
          }
        } else {
          setMigrationLogs(prev => [...prev, `  ✔ Already migrated (clean CDN URLs detected).`]);
        }
      }

      setMigrationProgress(sarees.length);
      setMigrationStatus('done');
      setMigrationLogs(prev => [...prev, `🎉 CDN Database Migration complete! Your website will now load instantly.`]);
      
      setTimeout(() => {
        if (onMigrationComplete) onMigrationComplete();
      }, 3000);

    } catch (err) {
      console.error(err);
      setMigrationStatus('error');
      setMigrationLogs(prev => [...prev, `❌ Migration crashed: ${err.message || err}`]);
    }
  };

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

  const base64ToBlob = (base64Str) => {
    const parts = base64Str.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  };

  const uploadToStorage = async (base64Str, sareeCode, index) => {
    if (!base64Str.startsWith('data:')) {
      // Already a cloud URL (no upload needed)
      return base64Str;
    }

    try {
      const blob = base64ToBlob(base64Str);
      const isPNG = base64Str.startsWith('data:image/png');
      const fileExt = isPNG ? 'png' : 'jpg';
      const fileName = `${sareeCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${index}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('saree-photos')
        .upload(fileName, blob, {
          contentType: isPNG ? 'image/png' : 'image/jpeg',
          cacheControl: '31536000',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('saree-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading file to storage bucket:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !code || !description) {
      alert('Please fill out all text fields.');
      return;
    }

    if (imagePreviews.length === 0) {
      alert('Please upload at least one photo.');
      return;
    }

    try {
      setPublishing(true);

      // Upload all new base64 files to public Supabase bucket in parallel
      const uploadPromises = imagePreviews.map((img, index) => 
        uploadToStorage(img.url, code, index)
      );
      
      const publicUrls = await Promise.all(uploadPromises);

      // Match which URL belongs to the designated cover photo
      const coverIndex = imagePreviews.findIndex(img => img.isCover);
      const coverImgUrl = coverIndex !== -1 ? publicUrls[coverIndex] : publicUrls[0];

      const serializedImages = JSON.stringify(publicUrls);

      if (editingSaree) {
        const updatedSaree = {
          ...editingSaree,
          code: code.toUpperCase(),
          title,
          type,
          description,
          price,
          image: coverImgUrl,
          images: serializedImages,
          sold: isSold
        };

        await onUpdateSaree(updatedSaree);
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
          image: coverImgUrl,
          images: serializedImages,
          sold: isSold
        };

        await onAddSaree(newSaree);
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
    } catch (err) {
      console.error('Error publishing saree:', err);
      alert('Error publishing item: ' + (err.message || err));
    } finally {
      setPublishing(false);
    }
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => setShowAiSettings(!showAiSettings)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)' }}
            title="Configure Gemini API Settings"
          >
            <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
            AI Settings
          </button>
          <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>

      {/* AI Writer Configuration Panel */}
      {showAiSettings && (
        <div style={{ 
          backgroundColor: '#fffaf0', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '40px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={20} style={{ color: 'var(--accent-gold)' }} />
              <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--primary-indigo)' }}>
                Gemini AI Writer Settings
              </h3>
            </div>
            <button 
              type="button" 
              onClick={() => setShowAiSettings(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>
          
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            The AI writing assistant uses Google's Gemini 2.5 Flash model to auto-generate beautiful titles and descriptions based on your saree photos. 
            Paste your free API key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-terracotta)', textDecoration: 'underline', fontWeight: '500' }}>Google AI Studio</a> below.
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
              type="password" 
              placeholder="Paste your Gemini API Key here (starts with AIza...)"
              value={geminiApiKey}
              onChange={(e) => {
                const val = e.target.value.trim();
                setGeminiApiKey(val);
                localStorage.setItem('pattupol-gemini-key', val);
              }}
              style={{ 
                flexGrow: 1, 
                padding: '10px 14px', 
                borderRadius: '6px', 
                border: '1px solid var(--border-color)', 
                fontSize: '13px', 
                fontFamily: 'monospace',
                backgroundColor: '#fff',
                minWidth: '280px'
              }}
            />
            {geminiApiKey ? (
              <span style={{ fontSize: '12px', color: 'green', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                <Check size={14} /> Key Configured
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No Key configured
              </span>
            )}
          </div>
        </div>
      )}

      {/* Database Performance Migration Card (CDN Transition) */}
      {needsMigration && (
        <div style={{ 
          backgroundColor: '#fffaf0', 
          border: '1px solid #ebdcb9', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '40px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Sparkles size={24} style={{ color: 'var(--accent-gold)' }} />
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--primary-indigo)' }}>
              Database Performance Upgrade Required
            </h3>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            We have detected that several of your pre-existing sarees still store heavy photo data directly inside the database. 
            This is causing connection timeouts for visitors. Click below to automatically migrate your entire catalog to the 
            high-speed Supabase Storage bucket. This takes 1 minute and speeds up your website by 98%.
          </p>

          {migrationStatus === 'idle' && (
            <button 
              type="button"
              onClick={startMigration} 
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Sparkles size={16} />
              Start Automated CDN Migration
            </button>
          )}

          {migrationStatus === 'migrating' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-dark)' }}>
                <span>Migrating Catalog...</span>
                <span>{migrationProgress} of {migrationTotal} Sarees</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ 
                  width: `${(migrationProgress / migrationTotal) * 100}%`, 
                  height: '100%', 
                  backgroundColor: 'var(--accent-terracotta)', 
                  transition: 'width 0.3s ease' 
                }} />
              </div>
              <div style={{ 
                backgroundColor: '#2d3748', 
                color: '#edf2f7', 
                fontFamily: 'monospace', 
                fontSize: '11px', 
                padding: '12px', 
                borderRadius: '6px', 
                maxHeight: '120px', 
                overflowY: 'auto',
                lineHeight: '1.4'
              }}>
                {migrationLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>
          )}

          {migrationStatus === 'done' && (
            <div style={{ color: 'var(--accent-gold)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <Check size={18} />
              Database successfully migrated! The website will now reload with lightning-fast speeds.
            </div>
          )}

          {migrationStatus === 'error' && (
            <div>
              <p style={{ color: 'red', fontWeight: '600', fontSize: '13px', margin: '0 0 12px' }}>
                Migration encountered an error. Please reload the page and try again.
              </p>
              <div style={{ 
                backgroundColor: '#2d3748', 
                color: '#edf2f7', 
                fontFamily: 'monospace', 
                fontSize: '11px', 
                padding: '12px', 
                borderRadius: '6px', 
                maxHeight: '100px', 
                overflowY: 'auto'
              }}>
                {migrationLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', alignItems: 'flex-start' }}>
        
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

              {/* AI Auto-Generate Content Button */}
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleAutoGenerate}
                  disabled={aiGenerating || imagePreviews.length === 0}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: 'var(--primary-indigo)',
                    borderColor: 'var(--primary-indigo)',
                    opacity: imagePreviews.length === 0 ? 0.6 : 1,
                    cursor: (aiGenerating || imagePreviews.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                  title={imagePreviews.length === 0 ? "Upload a saree photo first to enable AI writing" : "Auto-generate Saree name and details"}
                >
                  {aiGenerating ? (
                    <>
                      <div style={{ border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', width: '14px', height: '14px', animation: 'spin 1s linear infinite', marginRight: '8px' }}></div>
                      Gemini writing description...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} style={{ marginRight: '6px' }} />
                      Auto-Generate Title & Description (AI)
                    </>
                  )}
                </button>
              </div>
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
               <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={publishing}>
                 {publishing ? (
                   <>
                     <div style={{ border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', width: '14px', height: '14px', animation: 'spin 1s linear infinite', marginRight: '8px' }}></div>
                     Uploading to Cloud Storage...
                   </>
                 ) : (
                   <>
                     {editingSaree ? <Check size={18} style={{ marginRight: '6px' }} /> : <Plus size={18} style={{ marginRight: '6px' }} />}
                     {editingSaree ? 'Save Item Details' : 'Publish Item to Showroom'}
                   </>
                 )}
               </button>
               {editingSaree && (
                 <button type="button" className="btn-secondary" onClick={cancelEditing} style={{ width: '100%', justifyContent: 'center' }} disabled={publishing}>
                   Cancel Edit
                 </button>
               )}
             </div>
          </form>
        </div>

        {/* Right Side: Manage Existing Stock */}
        <div className="admin-card" style={{ margin: '0', maxWidth: '100%' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--primary-indigo)' }}>Live Catalog ({sarees.length})</h2>
          
          <div className="admin-catalog-list" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '6px' }}>
            {sarees.length > 0 ? (
              sarees.map((saree) => (
                <div className="admin-saree-row" key={saree.id}>
                  <AdminSareeRowThumb saree={saree} />
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
