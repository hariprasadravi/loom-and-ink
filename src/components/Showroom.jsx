import React, { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { getImagePath } from '../utils/helpers';
import { supabase } from '../utils/supabaseClient';

function SareeCardImage({ saree, onViewSaree }) {
  const [imgUrl, setImgUrl] = useState(saree.image);
  const [loading, setLoading] = useState(!saree.image);

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
          console.error('Error loading card cover image:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchCover();
    } else {
      setImgUrl(saree.image);
      setLoading(false);
    }
  }, [saree.id, saree.image]);

  return (
    <div className="saree-image-wrapper" onClick={() => onViewSaree(saree)}>
      {loading ? (
        <div style={{ width: '100%', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-card)', gap: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ border: '2px solid var(--border-light)', borderTop: '2px solid var(--accent-terracotta)', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading image...</span>
        </div>
      ) : (
        <img 
          src={getImagePath(imgUrl)} 
          alt={saree.title} 
          className="saree-img"
          loading="lazy"
        />
      )}
      
      {/* Sold Stamp */}
      {saree.sold && (
        <div className="sold-overlay">
          <div className="sold-stamp">Sold!</div>
        </div>
      )}
    </div>
  );
}

export default function Showroom({ sarees, onViewSaree, whatsappNumber = "919840709835", settings }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [visibleCount, setVisibleCount] = useState(12);

  // Reset pagination count when active filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, activeFilter, activeType]);

  // Filter logic
  const filteredSarees = sarees.filter(saree => {
    // Hide drafts from public view
    if (saree.draft) return false;

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

  // Sort sarees: Available items first, then Sold out items (maintaining original order within each status)
  const sortedSarees = [...filteredSarees].sort((a, b) => {
    if (a.sold !== b.sold) {
      return a.sold ? 1 : -1;
    }
    return 0; // Keep current database order (newest created_at first)
  });

  const getWhatsAppLink = (saree) => {
    let text = `Hi, I am interested in Item Code: ${saree.code} - ${saree.title}. Is this available? I saw it on your showroom website.`;
    const referral = sessionStorage.getItem('pattupol-ref');
    if (referral) {
      text += ` (Referred by: ${referral})`;
    }
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
          <div className="filter-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button 
              className={`filter-chip ${activeType === 'all' ? 'active' : ''}`}
              onClick={() => setActiveType('all')}
            >
              All Items
            </button>
            {settings.categories.map((cat) => (
              <button 
                key={cat.id}
                className={`filter-chip ${activeType === cat.id ? 'active' : ''}`}
                onClick={() => setActiveType(cat.id)}
              >
                {cat.label}
              </button>
            ))}
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
              placeholder="Search items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Showroom Grid */}
      {filteredSarees.length > 0 ? (
        <>
          <div className="saree-grid">
            {sortedSarees.slice(0, visibleCount).map((saree) => (
              <article className="saree-card" key={saree.id}>
                {/* Saree Badge */}
                <span className="saree-type-badge">
                  {saree.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>

                {/* Lazy Loaded On-Demand Photo Wrapper */}
                <SareeCardImage saree={saree} onViewSaree={onViewSaree} />

                {/* Saree Info */}
                <div className="saree-info">
                  <div className="saree-title-row">
                    <h3 className="saree-card-title">{saree.title}</h3>
                    <span className="saree-code">{saree.code}</span>
                  </div>
                  {/* Pricing and Aadi Thallupadi Discount Tag */}
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
                    const discountPct = calculateDiscountPercentage(saree.original_price, saree.price);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0 12px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {saree.original_price ? (
                            <>
                              <span style={{ color: 'var(--accent-terracotta)', fontWeight: '700', fontSize: '18px', fontFamily: 'var(--font-serif)' }}>
                                ₹{saree.price}
                              </span>
                              <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontSize: '14px', fontFamily: 'var(--font-serif)' }}>
                                ₹{saree.original_price}
                              </span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--accent-terracotta)', fontWeight: '700', fontSize: '18px', fontFamily: 'var(--font-serif)' }}>
                              ₹{saree.price || '5,000'}
                            </span>
                          )}
                        </div>
                        {discountPct && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start', backgroundColor: 'rgba(214, 162, 24, 0.1)', border: '1px solid var(--accent-gold)', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: '700', color: 'var(--accent-gold)' }}>
                            <Sparkles size={10} />
                            {settings.saleBadgeTamil} • {discountPct}% Off
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <p className="saree-desc">{saree.description}</p>
                  
                  <div className="saree-actions">
                    {saree.sold ? (
                      <button className="btn-whatsapp sold" disabled>
                        Item Sold Out
                      </button>
                    ) : (
                      <a 
                        href={getWhatsAppLink(saree)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-whatsapp"
                      >
                        {/* Native Premium SVG WhatsApp Logo */}
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="currentColor" 
                          style={{ marginRight: '6px' }}
                        >
                          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.963L2 22l5.233-1.372a9.948 9.948 0 0 0 4.777 1.218h.004c5.505 0 9.988-4.478 9.989-9.984C22.007 6.478 17.52 2 12.012 2zm6.273 14.155c-.274.773-1.343 1.393-1.854 1.488-.475.088-.86.37-2.915-.461-2.483-1.004-4.047-3.525-4.17-3.69-.124-.165-.98-1.306-.98-2.494 0-1.188.62-1.77.842-2.006.223-.236.483-.294.644-.294.16 0 .32.001.46.007.15.006.354-.058.555.428.204.494.697 1.696.757 1.82.06.124.1.268.017.433-.082.164-.124.268-.247.412-.124.144-.26.32-.37.429-.124.124-.253.259-.109.508.144.247.64 1.056 1.371 1.706.942.84 1.737 1.1 1.986 1.224.248.124.392.103.537-.062.144-.165.62-.722.785-.969.165-.247.33-.206.557-.123.227.082 1.443.68 1.691.804.247.124.412.186.474.293.062.107.062.619-.212 1.392z" />
                        </svg>
                        Enquire on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredSarees.length > visibleCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', marginBottom: '80px' }}>
              <button 
                onClick={() => setVisibleCount(prev => prev + 12)}
                className="btn-primary"
                style={{ padding: '12px 32px' }}
              >
                Load More Weaves
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: '80px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '18px', fontFamily: 'var(--font-serif)' }}>No items found matching your criteria.</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Try resetting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}
