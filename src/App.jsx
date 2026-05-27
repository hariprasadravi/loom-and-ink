import { useState, useEffect } from 'react';
import { initialSarees } from './data/mockSarees';
import Showroom from './components/Showroom';
import AdminPanel from './components/AdminPanel';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from './utils/supabaseClient';

function App() {
  const [sarees, setSarees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('showroom'); // 'showroom' or 'admin'
  const [selectedSaree, setSelectedSaree] = useState(null); // Selected item for zoom lightbox modal
  const [activeImgIndex, setActiveImgIndex] = useState(0); // Active image index in the lightbox carousel
  const [dbError, setDbError] = useState(null); // Database error tracking

  // Fetch sarees from Supabase on mount
  useEffect(() => {
    const fetchSarees = async () => {
      try {
        setLoading(true);
        setDbError(null);
        // Query only the lightweight summary columns to prevent heavy data payloads and SQL statement timeouts
        const { data, error } = await supabase
          .from('sarees')
          .select('id, code, title, type, description, price, image, sold, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setSarees(data);
        } else {
          // DATABASE SEEDER: If database is brand-new and empty, seed it with the 18 sarees!
          console.log('Database is empty. Seeding initial 18 sarees...');
          const { error: seedError } = await supabase
            .from('sarees')
            .insert(initialSarees);

          if (seedError) throw seedError;
          
          setSarees(initialSarees);
        }
      } catch (err) {
        console.error('Error fetching sarees from database:', err);
        setDbError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSarees();
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

  const handleViewSaree = async (saree) => {
    setSelectedSaree(saree);
    setActiveImgIndex(0);

    // Fetch full secondary images asynchronously if not already cached/loaded
    if (!saree.imagesLoaded) {
      try {
        const { data, error } = await supabase
          .from('sarees')
          .select('images')
          .eq('id', saree.id)
          .single();

        if (!error && data && data.images) {
          setSelectedSaree((prev) => {
            if (prev && prev.id === saree.id) {
              return { ...prev, images: data.images, imagesLoaded: true };
            }
            return prev;
          });
          setSarees((prev) =>
            prev.map((s) => (s.id === saree.id ? { ...s, images: data.images, imagesLoaded: true } : s))
          );
        }
      } catch (err) {
        console.error('Error fetching secondary images:', err);
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
              <span style={{ fontFamily: "'Pavanam', sans-serif", fontSize: '18px', fontWeight: '500', color: 'var(--accent-terracotta)', textTransform: 'none', opacity: '0.9' }}>
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
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
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
          // Elegant database diagnostic panel!
          <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', border: '1px solid #ebdcb9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <span style={{ fontSize: '32px' }}>⚙️</span>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--accent-terracotta)', margin: '0' }}>Database Diagnostics</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Supabase connection status report</p>
                </div>
              </div>

              <div style={{ backgroundColor: '#fffaf0', borderLeft: '4px solid var(--accent-terracotta)', padding: '16px', borderRadius: '4px', marginBottom: '32px' }}>
                <strong style={{ color: 'var(--text-dark)', fontSize: '14px' }}>Connection Error Details:</strong>
                <p style={{ fontFamily: 'monospace', color: '#c53030', margin: '8px 0 0', fontSize: '13px', wordBreak: 'break-all' }}>
                  {dbError.message || JSON.stringify(dbError)}
                </p>
              </div>

              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary-indigo)', fontSize: '18px', marginBottom: '12px' }}>How to Resolve This in 1 Minute</h3>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '20px' }}>
                This error typically occurs if the <code style={{ backgroundColor: '#f3ebdf', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>sarees</code> table is missing or if Supabase **Row-Level Security (RLS)** is preventing access without active policies.
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
        ) : activeTab === 'showroom' ? (
          <Showroom 
            sarees={sarees} 
            onViewSaree={handleViewSaree}
            whatsappNumber="919840709835"
          />
        ) : (
          <AdminPanel 
            sarees={sarees}
            onAddSaree={handleAddSaree}
            onUpdateSaree={handleUpdateSaree}
            onToggleSold={handleToggleSold}
            onDeleteSaree={handleDeleteSaree}
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
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: 'var(--text-dark)' }}
                      title="Previous Image"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={handleNext}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: 'var(--text-dark)' }}
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
                        backgroundColor: idx === activeImgIndex ? 'var(--accent-terracotta)' : '#cbd5e0',
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
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                <p style={{ color: 'var(--accent-gold)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px', margin: '0' }}>
                  Code: {selectedSaree.code} • {selectedSaree.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </p>
                <span style={{ color: 'var(--accent-terracotta)', fontWeight: '700', fontSize: '18px', fontFamily: 'var(--font-serif)' }}>
                  ₹{selectedSaree.price || '5,000'}
                </span>
              </div>
              
              <p className="modal-desc" style={{ marginTop: '0' }}>{selectedSaree.description}</p>
            </div>
          </div>
        );
      })()}
    </>
  );
}

export default App;
