import { useState, useEffect } from 'react';
import { initialSarees } from './data/mockSarees';
import Showroom from './components/Showroom';
import AdminPanel from './components/AdminPanel';
import AboutUs from './components/AboutUs';
import { X, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from './utils/supabaseClient';

function App() {
  const [sarees, setSarees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('showroom'); // 'showroom' or 'admin'
  const [selectedSaree, setSelectedSaree] = useState(null); // Selected item for zoom lightbox modal
  const [activeImgIndex, setActiveImgIndex] = useState(0); // Active image index in the lightbox carousel
  const [dbError, setDbError] = useState(null); // Database error tracking
  const [needsMigration, setNeedsMigration] = useState(false); // Tracks if old Base64 records require CDN migration
  const [isAdminModeAllowed, setIsAdminModeAllowed] = useState(sessionStorage.getItem('adminModeAllowed') === 'true');
  const [settings, setSettings] = useState({
    saleBadgeTamil: 'ஆடித்தள்ளுபடி',
    saleBadgeEnglish: 'Aadi Discount',
    captchaEnabled: false,
    captchaSiteKey: '',
    categories: [
      { id: 'kalamkari', label: 'Kalamkari', fullName: 'Kalamkari (Hand-Painted)' },
      { id: 'silk-cotton', label: 'Silk Cotton', fullName: 'Silk Cotton (Handloom)' },
      { id: 'soft-silk', label: 'Soft Silks', fullName: 'Soft Silks' },
      { id: 'semi-silk-cotton', label: 'Semi Silk Cottons', fullName: 'Semi Silk Cottons' },
      { id: 'summer-cotton', label: 'Summer Cottons', fullName: 'Summer Cottons' },
      { id: 'traditional-cotton', label: 'Traditional Cottons', fullName: 'Traditional Cottons (Chettinad/Narayanapet/Kanchi)' },
      { id: 'nighties', label: 'Nighties', fullName: 'Nighties' }
    ],
    affiliates: []
  });

  // URL parsing for secret admin key (?nirvahi) and affiliate referral (?ref=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let urlChanged = false;

    // Check admin secret
    if (searchParams.has('nirvahi')) {
      setIsAdminModeAllowed(true);
      sessionStorage.setItem('adminModeAllowed', 'true');
      setActiveTab('admin');
      searchParams.delete('nirvahi');
      urlChanged = true;
    }

    // Check affiliate code
    if (searchParams.has('ref')) {
      const refVal = searchParams.get('ref');
      if (refVal) {
        sessionStorage.setItem('pattupol-ref', refVal);
      }
      searchParams.delete('ref');
      urlChanged = true;
    }

    // Clean up address bar query params silently
    if (urlChanged) {
      const newQuery = searchParams.toString();
      const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Fetch sarees and settings from Supabase on mount
  useEffect(() => {
    const fetchSareesAndSettings = async () => {
      try {
        setLoading(true);
        setDbError(null);
        setNeedsMigration(false);

        // 1. Fetch settings from settings table
        try {
          const { data: settingsData, error: settingsError } = await supabase
            .from('settings')
            .select('*');

          if (!settingsError && settingsData) {
            const loadedSettings = {
              saleBadgeTamil: 'ஆடித்தள்ளுபடி',
              saleBadgeEnglish: 'Aadi Discount',
              captchaEnabled: false,
              captchaSiteKey: '',
              categories: [
                { id: 'kalamkari', label: 'Kalamkari', fullName: 'Kalamkari (Hand-Painted)' },
                { id: 'silk-cotton', label: 'Silk Cotton', fullName: 'Silk Cotton (Handloom)' },
                { id: 'soft-silk', label: 'Soft Silks', fullName: 'Soft Silks' },
                { id: 'semi-silk-cotton', label: 'Semi Silk Cottons', fullName: 'Semi Silk Cottons' },
                { id: 'summer-cotton', label: 'Summer Cottons', fullName: 'Summer Cottons' },
                { id: 'traditional-cotton', label: 'Traditional Cottons', fullName: 'Traditional Cottons (Chettinad/Narayanapet/Kanchi)' },
                { id: 'nighties', label: 'Nighties', fullName: 'Nighties' }
              ],
              affiliates: []
            };

            settingsData.forEach(item => {
              if (item.key === 'sale_badge') {
                loadedSettings.saleBadgeTamil = item.value?.tamil || 'ஆடித்தள்ளுபடி';
                loadedSettings.saleBadgeEnglish = item.value?.english || 'Aadi Discount';
              } else if (item.key === 'categories') {
                loadedSettings.categories = item.value || loadedSettings.categories;
              } else if (item.key === 'captcha_settings') {
                loadedSettings.captchaEnabled = !!item.value?.enabled;
                loadedSettings.captchaSiteKey = item.value?.site_key || '';
              } else if (item.key === 'affiliates') {
                loadedSettings.affiliates = item.value || [];
              }
            });
            setSettings(loadedSettings);
          }
        } catch (settingsErr) {
          console.warn('Failed to load custom settings (falling back to defaults):', settingsErr);
        }
        
        // 2. Fetch sarees
        const { data, error } = await supabase
          .from('sarees')
          .select('id, code, title, type, description, price, original_price, draft, image, sold, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const hasBase64Image = data.some(s => s.image && s.image.startsWith('data:'));
          if (hasBase64Image) {
            setNeedsMigration(true);
          }
          setSarees(data);
        } else {
          console.log('Database is empty. Seeding initial 18 sarees...');
          const { error: seedError } = await supabase
            .from('sarees')
            .insert(initialSarees);

          if (seedError) throw seedError;
          setSarees(initialSarees);
        }
      } catch (err) {
        console.warn('Initial fetch timed out or failed. Attempting lightweight text-only query...', err);
        
        try {
          const { data: metadata, error: fallbackError } = await supabase
            .from('sarees')
            .select('id, code, title, type, description, price, original_price, draft, sold, created_at')
            .order('created_at', { ascending: false });

          if (fallbackError) throw fallbackError;

          if (metadata && metadata.length > 0) {
            const mappedMetadata = metadata.map(s => ({
              ...s,
              image: '',
              images: '[]'
            }));
            setSarees(mappedMetadata);
            setNeedsMigration(true);
          } else {
            const { error: seedError } = await supabase
              .from('sarees')
              .insert(initialSarees);

            if (seedError) throw seedError;
            setSarees(initialSarees);
          }
        } catch (fallbackErr) {
          console.error('Database is completely inaccessible:', fallbackErr);
          setDbError(fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSareesAndSettings();
  }, []);

  const handleAddSaree = async (newSaree) => {
    try {
      const { error } = await supabase
        .from('sarees')
        .insert([newSaree]);

      if (error) throw error;
      setSarees((prev) => [newSaree, ...prev]);
    } catch (err) {
      alert('Error adding saree: ' + err.message);
    }
  };

  const handleToggleSold = async (id) => {
    const targetSaree = sarees.find((s) => s.id === id);
    if (!targetSaree) return;
    const nextSoldState = !targetSaree.sold;

    try {
      const { error } = await supabase
        .from('sarees')
        .update({ sold: nextSoldState })
        .eq('id', id);

      if (error) throw error;

      setSarees((prev) =>
        prev.map((saree) =>
          saree.id === id ? { ...saree, sold: nextSoldState } : saree
        )
      );
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleUpdateSaree = async (updatedSaree) => {
    try {
      const { error } = await supabase
        .from('sarees')
        .update({
          code: updatedSaree.code,
          title: updatedSaree.title,
          type: updatedSaree.type,
          description: updatedSaree.description,
          price: updatedSaree.price,
          original_price: updatedSaree.original_price,
          draft: updatedSaree.draft,
          image: updatedSaree.image,
          images: updatedSaree.images,
          sold: updatedSaree.sold
        })
        .eq('id', updatedSaree.id);

      if (error) throw error;

      setSarees((prev) =>
        prev.map((saree) =>
          saree.id === updatedSaree.id ? updatedSaree : saree
        )
      );
    } catch (err) {
      alert('Error updating item details: ' + err.message);
    }
  };

  const handleDeleteSaree = async (id) => {
    try {
      const { error } = await supabase
        .from('sarees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSarees((prev) => prev.filter((saree) => saree.id !== id));
    } catch (err) {
      alert('Error deleting saree: ' + err.message);
    }
  };

  const handleSaveSettings = async (updatedSettings) => {
    try {
      // 1. Save sale badge settings
      const { error: saleBadgeError } = await supabase
        .from('settings')
        .upsert({
          key: 'sale_badge',
          value: { tamil: updatedSettings.saleBadgeTamil, english: updatedSettings.saleBadgeEnglish }
        });
      if (saleBadgeError) throw saleBadgeError;

      // 2. Save categories settings
      const { error: categoriesError } = await supabase
        .from('settings')
        .upsert({
          key: 'categories',
          value: updatedSettings.categories
        });
      if (categoriesError) throw categoriesError;

      // 3. Save captcha settings
      const { error: captchaError } = await supabase
        .from('settings')
        .upsert({
          key: 'captcha_settings',
          value: { enabled: updatedSettings.captchaEnabled, site_key: updatedSettings.captchaSiteKey }
        });
      if (captchaError) throw captchaError;

      // 4. Save affiliates settings
      const { error: affiliatesError } = await supabase
        .from('settings')
        .upsert({
          key: 'affiliates',
          value: updatedSettings.affiliates
        });
      if (affiliatesError) throw affiliatesError;

      // 5. Update local settings state
      setSettings(updatedSettings);
    } catch (err) {
      console.error('Error saving settings to database:', err);
      throw err;
    }
  };

  const handleViewSaree = async (saree) => {
    setSelectedSaree(saree);
    setActiveImgIndex(0);

    // Dynamic on-demand detail fetcher for missing cover image or multi-image carousel array
    if (!saree.image || !saree.images || saree.images === '[]') {
      try {
        const { data, error } = await supabase
          .from('sarees')
          .select('image, images')
          .eq('id', saree.id)
          .single();
        
        if (!error && data) {
          setSelectedSaree(prev => prev && prev.id === saree.id ? {
            ...prev,
            image: data.image,
            images: data.images
          } : prev);
        }
      } catch (err) {
        console.error('Error fetching detail images on-demand:', err);
      }
    }
  };

  return (
    <>
      {/* Top Glassmorphic Navigation */}
      <header className="header-nav">
        <div className="container nav-container">
          <a href="#" className="logo-link" onClick={() => setActiveTab('showroom')}>
            <span className="logo-brand" style={{ letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              PATTUPOL 
              <span style={{ fontFamily: "'Pavanam', sans-serif", fontSize: '18px', fontWeight: '500', color: 'var(--accent-gold)', textTransform: 'none', opacity: '1.0' }}>
                பட்டுப்போல்
              </span>
            </span>
            <span className="logo-sub">onlyKalamkari & Silk Cotton</span>
          </a>
          
          <nav className="nav-links">
            <button 
              className={`nav-item ${activeTab === 'showroom' ? 'active' : ''}`}
              onClick={() => setActiveTab('showroom')}
            >
              Showroom Catalog
            </button>
            <button 
              className={`nav-item ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              Our Story
            </button>
            {isAdminModeAllowed && (
              <button 
                className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1 }}>
        {loading ? (
          // Elegant loading spinner
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0', gap: '16px' }}>
            <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary-indigo)', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--text-muted)' }}>Opening the Pattupol Showroom...</p>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : dbError ? (
          isAdminModeAllowed ? (
            // Detailed developer diagnostic panel
            <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '40px', boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '32px' }}>⚙️</span>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--accent-terracotta)', margin: '0' }}>Database Diagnostics</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Supabase connection status report</p>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(214, 162, 24, 0.05)', borderLeft: '4px solid var(--accent-terracotta)', padding: '16px', borderRadius: '4px', marginBottom: '32px' }}>
                  <strong style={{ color: 'var(--text-dark)', fontSize: '14px' }}>Connection Error Details:</strong>
                  <p style={{ fontFamily: 'monospace', color: '#fc8181', margin: '8px 0 0', fontSize: '13px', wordBreak: 'break-all' }}>
                    {dbError.message || JSON.stringify(dbError)}
                  </p>
                </div>

                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary-indigo)', fontSize: '18px', marginBottom: '12px' }}>How to Resolve This in 1 Minute</h3>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  This error typically occurs if the <code style={{ backgroundColor: 'var(--bg-creme)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>sarees</code> table is missing or if Supabase **Row-Level Security (RLS)** is preventing access without active policies.
                </p>

                <ol style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-dark)', paddingLeft: '20px', marginBottom: '32px' }}>
                  <li>Log in to your <strong><a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-indigo)', textDecoration: 'underline' }}>Supabase Dashboard</a></strong>.</li>
                  <li>Select your project <strong>wyxoffulgvtnzqpzbkle</strong>.</li>
                  <li>Go to the <strong>SQL Editor</strong> tab on the left navigation bar.</li>
                  <li>Click <strong>New Query</strong>, paste the SQL script below, and click <strong>Run</strong>:</li>
                </ol>

                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <pre style={{ backgroundColor: '#2d3748', color: '#edf2f7', padding: '20px', borderRadius: '8px', overflowX: 'auto', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.5', maxHeight: '250px' }}>
{`-- 1. Create sarees table (if missing)
create table if not exists public.sarees (
  id text primary key,
  code text not null unique,
  title text not null,
  type text not null,
  description text not null,
  price text,
  images text,
  image text not null,
  sold boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row-Level Security
alter table public.sarees enable row level security;

-- 3. Policy: Public users can search/view sarees
create policy "Allow public read access" 
  on public.sarees for select 
  using (true);

-- 4. Policy: Authenticated admins have full CRUD access
create policy "Allow admin full access" 
  on public.sarees for all 
  to authenticated 
  using (true) 
  with check (true);`}
                  </pre>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="btn-primary"
                  >
                    Reload Showroom
                  </button>
                  <button 
                    onClick={() => setDbError(null)} 
                    className="btn-secondary"
                    style={{ border: 'none', background: 'none', textDecoration: 'underline', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    Proceed to Site Anyway
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Premium, secure customer-facing fallback page
            <div className="container" style={{ padding: '80px 20px', maxWidth: '600px', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '48px 32px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(153, 27, 27, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-terracotta)', fontSize: '32px' }}>
                  🌸
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--accent-terracotta)', fontSize: '28px', margin: '0 0 12px' }}>Showroom Refresh in Progress</h2>
                  <p style={{ color: 'var(--text-dark)', fontSize: '15px', lineHeight: '1.6', margin: '0' }}>
                    Our online boutique catalog is currently updating its connection to present our latest curated handloom collection.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginTop: '12px' }}>
                    Please try refreshing the page in a few moments, or reach out to us directly on WhatsApp to view our current stock.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px', marginTop: '12px' }}>
                  <a 
                    href={`https://wa.me/919840709835?text=${(() => {
                      let text = "Hello Pattupol! I'm visiting your website and would love to enquire about your latest saree catalog.";
                      const referral = sessionStorage.getItem('pattupol-ref');
                      if (referral) {
                        text += ` (Referred by: ${referral})`;
                      }
                      return encodeURIComponent(text);
                    })()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', width: '100%', padding: '12px', boxSizing: 'border-box' }}
                  >
                    Enquire on WhatsApp
                  </a>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-color)' }}
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          )
        ) : activeTab === 'showroom' ? (
          <Showroom 
            sarees={sarees} 
            onViewSaree={handleViewSaree}
            whatsappNumber="919840709835"
            needsMigration={needsMigration}
            settings={settings}
          />
        ) : activeTab === 'about' ? (
          <AboutUs onBackToShowroom={() => setActiveTab('showroom')} />
        ) : isAdminModeAllowed && activeTab === 'admin' ? (
          <AdminPanel 
            sarees={sarees}
            onAddSaree={handleAddSaree}
            onUpdateSaree={handleUpdateSaree}
            onToggleSold={handleToggleSold}
            onDeleteSaree={handleDeleteSaree}
            needsMigration={needsMigration}
            onMigrationComplete={() => setNeedsMigration(false)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        ) : (
          <Showroom 
            sarees={sarees} 
            onViewSaree={handleViewSaree}
            whatsappNumber="919840709835"
            needsMigration={needsMigration}
            settings={settings}
          />
        )}
      </main>

      {/* Premium Elegant Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            PATTUPOL 
            <span style={{ fontFamily: "'Pavanam', sans-serif", fontSize: '18px', fontWeight: '500', color: 'var(--accent-gold)', textTransform: 'none' }}>
              பட்டுப்போல்
            </span>
          </div>
          <p style={{ marginBottom: '16px' }}>Curating authentic Indian handloom weaves and hand-painted art since 2020.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', margin: '20px 0', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>📍 Chennai, India (Weaving & Curation)</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>🌐 Available Worldwide</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '24px' }}>
            © {new Date().getFullYear()} Pattupol. All rights reserved. Designed with love.
          </p>
        </div>
      </footer>

      {/* Image Magnifier / Zoom View Modal */}
      {selectedSaree && (() => {
        let imgs = [];
        try {
          if (selectedSaree.images) {
            imgs = JSON.parse(selectedSaree.images);
          }
        } catch (e) {
          console.error(e);
        }
        if (!Array.isArray(imgs) || imgs.length === 0) {
          imgs = [selectedSaree.image];
        }

        const handlePrev = () => {
          setActiveImgIndex((prev) => (prev - 1 + imgs.length) % imgs.length);
        };

        const handleNext = () => {
          setActiveImgIndex((prev) => (prev + 1) % imgs.length);
        };

        return (
          <div className="modal-overlay" onClick={() => setSelectedSaree(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
              <button className="modal-close" onClick={() => setSelectedSaree(null)}>
                <X size={28} />
              </button>
              
              {/* Sliding Image Carousel */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={imgs[activeImgIndex]} 
                  alt={selectedSaree.title} 
                  className="modal-img" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }} 
                />
                
                {/* Navigation Arrows */}
                {imgs.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrev}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(28,25,23,0.85)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: 'var(--text-dark)' }}
                      title="Previous Image"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={handleNext}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(28,25,23,0.85)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: 'var(--text-dark)' }}
                      title="Next Image"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Dot Indicators */}
              {imgs.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                  {imgs.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImgIndex(idx)}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: idx === activeImgIndex ? 'var(--accent-terracotta)' : 'rgba(255, 255, 255, 0.3)',
                        border: 'none',
                        padding: '0',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s ease'
                      }}
                    />
                  ))}
                </div>
              )}

              <h3 className="modal-title" style={{ marginTop: '16px', marginBottom: '8px' }}>{selectedSaree.title}</h3>
              
              {/* Pricing section with Aadi Thallupadi Discount display */}
              {(() => {
                const calculateDiscountPercentage = (orig, act) => {
                  if (!orig || !act) return null;
                  const original = parseFloat(orig.replace(/[^0-9.]/g, ''));
                  const active = parseFloat(act.replace(/[^0-9.]/g, ''));
                  if (original && active && original > active) {
                    return Math.round(((original - active) / original) * 100);
                  }
                  return null;
                };
                const discountPct = calculateDiscountPercentage(selectedSaree.original_price, selectedSaree.price);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: 'var(--accent-gold)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px', margin: '0' }}>
                        Code: {selectedSaree.code} • {selectedSaree.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {selectedSaree.original_price ? (
                          <>
                            <span style={{ color: 'var(--accent-terracotta)', fontWeight: '700', fontSize: '20px', fontFamily: 'var(--font-serif)' }}>
                              ₹{selectedSaree.price}
                            </span>
                            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontSize: '15px', fontFamily: 'var(--font-serif)' }}>
                              ₹{selectedSaree.original_price}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--accent-terracotta)', fontWeight: '700', fontSize: '20px', fontFamily: 'var(--font-serif)' }}>
                            ₹{selectedSaree.price || '5,000'}
                          </span>
                        )}
                      </div>
                    </div>
                    {discountPct && (
                      <div style={{ display: 'flex', alignSelf: 'flex-end', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(214, 162, 24, 0.1)', border: '1px solid var(--accent-gold)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                        <Sparkles size={11} />
                        {settings.saleBadgeTamil} ({settings.saleBadgeEnglish}) • {discountPct}% Off
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <p className="modal-desc" style={{ marginTop: '0' }}>{selectedSaree.description}</p>
            </div>
          </div>
        );
      })()}
    </>
  );
}

export default App;
