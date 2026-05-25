import React, { useState } from 'react';
import { Search, MessageSquare, Eye } from 'lucide-react';
import { getImagePath } from '../utils/helpers';

export default function Showroom({ sarees, onViewSaree, whatsappNumber = "919876543210" }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeType, setActiveType] = useState('all');

  // Filter logic
  const filteredSarees = sarees.filter(saree => {
    // Search filter
    const matchesSearch = 
      saree.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saree.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      saree.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Saree Type filter
    const matchesType = activeType === 'all' || saree.type === activeType;

    // Status filter
    const matchesStatus = 
      activeFilter === 'all' ||
      (activeFilter === 'available' && !saree.sold) ||
      (activeFilter === 'sold' && saree.sold);

    return matchesSearch && matchesType && matchesStatus;
  });

  const getWhatsAppLink = (saree) => {
    const text = `Hi, I am interested in Saree Code: ${saree.code} - ${saree.title}. Is this saree available? I saw it on your showroom website.`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="container">
      {/* Showroom Hero */}
      <section className="hero-section">
        <h1 className="hero-title">Artisanal Kalamkari & Silk Cotton</h1>
        <p className="hero-desc">
          Hand-painted Kalamkari arts and lightweight handloom silk cotton weaves, curated by hand. View our live catalog and chat directly with us on WhatsApp to secure your pieces.
        </p>
      </section>

      {/* Search & Filter Controls */}
      <div className="showroom-controls">
        <div className="filter-row">
          {/* Categories */}
          <div className="filter-group">
            <button 
              className={`filter-chip ${activeType === 'all' ? 'active' : ''}`}
              onClick={() => setActiveType('all')}
            >
              All Weaves
            </button>
            <button 
              className={`filter-chip ${activeType === 'kalamkari' ? 'active' : ''}`}
              onClick={() => setActiveType('kalamkari')}
            >
              Kalamkari
            </button>
            <button 
              className={`filter-chip ${activeType === 'silk-cotton' ? 'active' : ''}`}
              onClick={() => setActiveType('silk-cotton')}
            >
              Silk Cotton
            </button>
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <button 
              className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Statuses
            </button>
            <button 
              className={`filter-chip ${activeFilter === 'available' ? 'active' : ''}`}
              onClick={() => setActiveFilter('available')}
            >
              Available
            </button>
            <button 
              className={`filter-chip ${activeFilter === 'sold' ? 'active' : ''}`}
              onClick={() => setActiveFilter('sold')}
            >
              Sold
            </button>
          </div>

          {/* Search bar */}
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search sarees..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Showroom Grid */}
      {filteredSarees.length > 0 ? (
        <div className="saree-grid">
          {filteredSarees.map((saree) => (
            <article className="saree-card" key={saree.id}>
              {/* Saree Badge */}
              <span className="saree-type-badge">
                {saree.type === 'kalamkari' ? 'Kalamkari' : 'Silk Cotton'}
              </span>

              {/* Photo Wrapper */}
              <div className="saree-image-wrapper" onClick={() => onViewSaree(saree)}>
                <img 
                  src={getImagePath(saree.image)} 
                  alt={saree.title} 
                  className="saree-img"
                  loading="lazy"
                />
                
                {/* Sold Stamp */}
                {saree.sold && (
                  <div className="sold-overlay">
                    <div className="sold-stamp">Sold!</div>
                  </div>
                )}
              </div>

              {/* Saree Info */}
              <div className="saree-info">
                <div className="saree-title-row">
                  <h3 className="saree-card-title">{saree.title}</h3>
                  <span className="saree-code">{saree.code}</span>
                </div>
                <p className="saree-desc">{saree.description}</p>
                
                <div className="saree-actions">
                  {saree.sold ? (
                    <button className="btn-whatsapp sold" disabled>
                      Saree Sold Out
                    </button>
                  ) : (
                    <a 
                      href={getWhatsAppLink(saree)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp"
                    >
                      <MessageSquare size={16} />
                      Inquire on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ padding: '80px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '18px', fontFamily: 'var(--font-serif)' }}>No sarees found matching your criteria.</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Try resetting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}
