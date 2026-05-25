import { useState, useEffect } from 'react';
import { initialSarees } from './data/mockSarees';
import Showroom from './components/Showroom';
import AdminPanel from './components/AdminPanel';
import { X, Loader2 } from 'lucide-react';
import { supabase } from './utils/supabaseClient';

function App() {
  const [sarees, setSarees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('showroom'); // 'showroom' or 'admin'
  const [selectedSaree, setSelectedSaree] = useState(null); // Saree for magnifier modal

  // Fetch sarees from Supabase on mount
  useEffect(() => {
    const fetchSarees = async () => {
      try {
        setLoading(true);
        // Query the 'sarees' table ordered by creation time
        const { data, error } = await supabase
          .from('sarees')
          .select('*')
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
          image: updatedSaree.image,
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
      alert('Error updating saree details: ' + err.message);
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

  return (
    <>
      {/* Top Glassmorphic Navigation */}
      <header className="header-nav">
        <div className="container nav-container">
          <a href="#" className="logo-link" onClick={() => setActiveTab('showroom')}>
            <span className="logo-brand">LOOM & LACE</span>
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
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--text-muted)' }}>Opening the Loom & Lace Showroom...</p>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : activeTab === 'showroom' ? (
          <Showroom 
            sarees={sarees} 
            onViewSaree={setSelectedSaree} 
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
          <div className="footer-logo">LOOM & LACE</div>
          <p style={{ marginBottom: '16px' }}>Curating authentic Indian handloom weaves and hand-painted art since 2020.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', margin: '20px 0', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>📍 Chennai, India (Weaving & Curation)</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>🌐 Available Worldwide</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '24px' }}>
            © {new Date().getFullYear()} Loom & Lace. All rights reserved. Designed with love.
          </p>
        </div>
      </footer>

      {/* Image Magnifier / Zoom View Modal */}
      {selectedSaree && (
        <div className="modal-overlay" onClick={() => setSelectedSaree(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedSaree(null)}>
              <X size={28} />
            </button>
            
            <img src={selectedSaree.image} alt={selectedSaree.title} className="modal-img" />
            <h3 className="modal-title">{selectedSaree.title}</h3>
            <p style={{ color: 'var(--accent-gold)', fontWeight: '600', letterSpacing: '1px', marginTop: '4px', textTransform: 'uppercase', fontSize: '12px' }}>
              Code: {selectedSaree.code} • {selectedSaree.type === 'kalamkari' ? 'Kalamkari' : 'Silk Cotton'}
            </p>
            <p className="modal-desc">{selectedSaree.description}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
