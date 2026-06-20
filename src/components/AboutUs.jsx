import React from 'react';
import { getImagePath } from '../utils/helpers';
import { Heart, Compass, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AboutUs({ onBackToShowroom }) {
  return (
    <div className="container" style={{ padding: '60px 20px', maxWidth: '1000px' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', color: 'var(--accent-gold)', marginBottom: '16px' }}>Our Story</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          Curating authentic Indian handloom weaves and hand-painted art since 2020. Discover the heritage and craftsmanship behind Pattupol.
        </p>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '50px', alignItems: 'center', marginBottom: '80px' }}>
        {/* Row 1: Image & Description */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px', alignItems: 'center' }}>
          <div className="about-row-flex">
            <div style={{ flex: '1', width: '100%', maxWidth: '500px' }}>
              <img 
                src={getImagePath('/handloom_weaving_zari.jpg')} 
                alt="Traditional wooden handloom weaving zari" 
                style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-premium)', display: 'block' }}
              />
            </div>
            <div style={{ flex: '1', textAlign: 'left' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart style={{ color: 'var(--accent-terracotta)' }} size={24} /> Sourced Directly from the Loom
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.8', marginBottom: '20px' }}>
                We believe that the beauty of a saree lies in the stories woven into its threads. At Pattupol (பட்டுப்போல்), we bypass intermediaries and tie up directly with master weavers and small family workshops in traditional weaving clusters across India. 
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.8' }}>
                By establishing direct partnerships, we ensure that the weavers receive fair, sustainable wages that honor their extraordinary skill, helping preserve centuries-old handloom techniques for generations to come.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Features Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginTop: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-premium)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(197, 160, 89, 0.1)', color: 'var(--accent-gold)', marginBottom: '20px' }}>
              <Compass size={24} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '12px' }}>Hand-Picked Curation</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', margin: '0' }}>
              Every saree in our catalog is individually selected. We inspect the quality of the warp and weft, the precision of the Kalamkari painting, and the integrity of the zari borders. We only bring you pieces we fall in love with ourselves.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-card)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-premium)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(229, 62, 62, 0.1)', color: 'var(--accent-terracotta)', marginBottom: '20px' }}>
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--text-dark)', marginBottom: '12px' }}>Supporting Small Businesses</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', margin: '0' }}>
              Pattupol is a family-owned small business. When you support us, you are directly funding small weaver households and local craft communities. We pride ourselves on transparent, ethical sourcing and deep-rooted respect for the craft.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-card)', padding: '48px 32px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-premium)' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--accent-gold)', marginBottom: '12px' }}>Discover Our Collection</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px', lineHeight: '1.6' }}>
          Explore our handloom masterpieces, hand-painted Kalamkari silks, and lightweight summer cottons.
        </p>
        <button 
          onClick={onBackToShowroom}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          Browse Showroom Catalog <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
