import { useState, useEffect } from 'react';
import { initialSarees } from './data/mockSarees';
import Showroom from './components/Showroom';
import AdminPanel from './components/AdminPanel';
import { X, ExternalLink } from 'lucide-react';
import { getImagePath } from './utils/helpers';

function App() {
  const [sarees, setSarees] = useState(() => {
    const saved = localStorage.getItem('ammas_sarees');
    return saved ? JSON.parse(saved) : initialSarees;
  });

  const [activeTab, setActiveTab] = useState('showroom'); // 'showroom' or 'admin'
  const [selectedSaree, setSelectedSaree] = useState(null); // Saree for magnifier modal

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('ammas_sarees', JSON.stringify(sarees));
  }, [sarees]);

  const handleAddSaree = (newSaree) => {
    setSarees((prev) => [newSaree, ...prev]);
  };

  const handleToggleSold = (id) => {
    setSarees((prev) => 
      prev.map((saree) => 
        saree.id === id ? { ...saree, sold: !saree.sold } : saree
      )
    );
  };

  const handleDeleteSaree = (id) => {
    setSarees((prev) => prev.filter((saree) => saree.id !== id));
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
              Mom's Manager
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1 }}>
        {activeTab === 'showroom' ? (
          <Showroom 
            sarees={sarees} 
            onViewSaree={setSelectedSaree} 
          />
        ) : (
          <AdminPanel 
            sarees={sarees}
            onAddSaree={handleAddSaree}
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
            
            <img src={getImagePath(selectedSaree.image)} alt={selectedSaree.title} className="modal-img" />
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
