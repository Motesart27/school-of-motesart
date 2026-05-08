import { useNavigate } from 'react-router-dom'
import { useRef, useCallback } from 'react'
import './GamesDashboard.css'

/* ── Video Game Card Component ── */
function VideoGameCard({ id, title, titleColor, desc, badge, badgeClass, poster, video, videoRefs, onEnter, onLeave, bgSize }) {
  return (
    <div
      className="gd-game-card"
      onMouseEnter={() => onEnter(id)}
      onMouseLeave={() => onLeave(id)}
    >
      <div className="gd-card-image" style={{ backgroundImage: poster ? `url('${poster}')` : 'none', backgroundSize: bgSize || 'cover' }}>
        {video ? (
          <video
            ref={el => { if (el) videoRefs.current[id] = el }}
            className="gd-card-video"
            src={video}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
          />
        ) : (
          <div className="gd-card-bg" style={{ backgroundImage: poster ? `url('${poster}')` : 'none' }} />
        )}
        <div className="gd-img-overlay" />
        <div className="gd-card-badges">
          <span className={`gd-badge ${badgeClass}`}>{badge}</span>
        </div>
      </div>
      <div className="gd-card-info">
        <span className="gd-badge gd-badge-soon">Coming Soon</span>
        <div className="gd-card-title" style={{ color: titleColor }}>{title}</div>
        <div className="gd-card-desc">{desc}</div>
      </div>
    </div>
  )
}

export default function GamesDashboard() {
  const navigate = useNavigate()
  const videoRefs = useRef({})
  const featuredRef = useRef(null)

  const handleMouseEnter = useCallback((id) => {
    const video = videoRefs.current[id]
    if (video) { video.currentTime = 0; video.play().catch(() => {}) }
  }, [])

  const handleMouseLeave = useCallback((id) => {
    const video = videoRefs.current[id]
    if (video) { video.pause(); video.currentTime = 0 }
  }, [])

  /* ── Card Data ──
     To add videos: place 5s .mp4 clips in public/videos/
     e.g. public/SOM Game vids 2/Rhythm Racer Game.mp4
     Then set the video field below to '/SOM Game vids 2/Rhythm Racer Game.mp4'
  */
  const gameModeCards = [
    {
      id: 'rhythm-racer',
      title: 'Rhythm Racer',
      titleColor: '#eab308',
      desc: 'A Formula 1 race through beats. Tap rhythms at blazing speed to cross the finish line first.',
      badge: 'Game', badgeClass: 'gd-badge-game',
      poster: '/SOM Game vids 2/Backup Pics for Games/Rhythnm Racer Logo.PNG',
      video: '/SOM Game vids 2/Rhythm Racer Game.mp4'
    },
    {
      id: 'vocal-run',
      title: 'Vocal Training: The Run',
      titleColor: '#eab308',
      desc: 'A retro mic on the run! Match pitch with precision and get real-time vocal feedback.',
      badge: 'Game', badgeClass: 'gd-badge-game',
      poster: '/SOM Game vids 2/Backup Pics for Games/Vocal Run Game pic.png',
      video: '/SOM Game vids 2/Vocal Run Game.mp4', bgSize: 'contain'
    },
    {
      id: 'drum-off',
      title: 'Drum Off',
      titleColor: '#f87171',
      desc: 'Fire vs Ice! Two drum kits clash head-to-head. Pick your side and prove your beat mastery.',
      badge: 'Pro', badgeClass: 'gd-badge-pro',
      poster: '/SOM Game vids 2/Backup Pics for Games/DrumOff Logo1.jpeg',
      video: '/SOM Game vids 2/Drum Off Game.mp4'
    }
  ]

  const academicCards = [
    {
      id: 'sight-note',
      title: 'Sight the Note',
      titleColor: '#a78bfa',
      desc: 'A magnifying glass over music. Identify notes on the staff using the Motesart Number System.',
      badge: 'Academic', badgeClass: 'gd-badge-academic',
      poster: '/SOM Game vids 2/Backup Pics for Games/Sight th Note Logo.JPG',
      video: '/SOM Game vids 2/Sight th Note Game.mp4'
    },
    {
      id: 'scale-scrambler',
      title: 'Scale Scrambler',
      titleColor: '#a78bfa',
      desc: 'Unscramble the musical puzzle! Identify scales across all keys and modes before time runs out.',
      badge: 'Academic', badgeClass: 'gd-badge-academic',
      poster: '/SOM Game vids 2/Backup Pics for Games/Note Scrambler Game Pic.png',
      video: '/SOM Game vids 2/Note Scrambler Game.mp4'
    },
    {
      id: 'jump-251',
      title: '251 Jump - Overload',
      titleColor: '#f87171',
      desc: 'Chord progressions to platform in an endless loop. Master chord progressions on the move.',
      badge: 'Pro', badgeClass: 'gd-badge-pro',
      poster: '/SOM Game vids 2/Backup Pics for Games/251 Jump Game.jpeg',
      video: '/SOM Game vids 2/251 Jump Game vids.mp4'
    }
  ]

  return (
    <div className="games-dashboard">
      {/* Back Navigation */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', cursor:'pointer', maxWidth:300 }} onClick={() => navigate('/student')}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#9ca3af' }}>←</div>
        <span style={{ color:'#9ca3af', fontSize:13, fontWeight:600 }}>Back to Dashboard</span>
      </div>

      {/* HEADER */}
      <div className="gd-header">
        <div className="gd-vol-badge">Vol. 1 &bull; 2026</div>
        <h1 className="gd-title">MOTESART TECHNOLOGIES</h1>
        <div className="gd-subtitle">SOM Collection</div>
        <div className="gd-filter-tabs">
          <div className="gd-filter-tab active">All Games</div>
          <div className="gd-filter-tab">Game Mode</div>
          <div className="gd-filter-tab">Academic</div>
          <div className="gd-filter-tab">Pro</div>
        </div>
      </div>

      {/* FEATURED: FIND THE NOTE */}
      <div className="gd-section-label">Featured</div>
      <div className="gd-featured-row">
        <div
          className="gd-featured-card-img"
          style={{ backgroundImage: `url('/SOM Game vids 2/Backup Pics for Games/_Find the Note logo1.jpeg')` }}
          onClick={() => navigate('/game')}
          onMouseEnter={() => { if (featuredRef.current) { featuredRef.current.currentTime = 0; featuredRef.current.play().catch(() => {}) } }}
          onMouseLeave={() => { if (featuredRef.current) { featuredRef.current.pause(); featuredRef.current.currentTime = 0 } }}
        >
          <video
            ref={featuredRef}
            className="gd-card-video gd-featured-video"
            src="/SOM Game vids 2/Find the Note Game.mp4"
            poster="/SOM Game vids 2/Backup Pics for Games/_Find the Note logo1.jpeg"
            muted
            loop
            playsInline
            preload="none"
          />
          <div className="gd-floating-notes">
            <div className="gd-floating-note">&#9835;</div>
            <div className="gd-floating-note">&#9834;</div>
            <div className="gd-floating-note">&#9839;</div>
            <div className="gd-floating-note">&#9833;</div>
            <div className="gd-floating-note">&#9834;</div>
          </div>
        </div>
        <div className="gd-featured-card-info">
          <span className="gd-badge gd-badge-play">Play Now</span>
          <div className="gd-card-title-lg">Find the Note</div>
          <div className="gd-card-desc">
            Uncover hidden notes, chords, and intervals. Sharpen your ear with the metronome as your guide through a world of musical mystery.
          </div>
          <button className="gd-launch-btn" onClick={() => navigate('/game')}>
            Launch Game
          </button>
        </div>
      </div>

      {/* GAME MODE ROW */}
      <div className="gd-section-label">Game Mode</div>
      <div className="gd-cards-grid">
        {gameModeCards.map(card => (
          <VideoGameCard
            key={card.id}
            {...card}
            videoRefs={videoRefs}
            onEnter={handleMouseEnter}
            onLeave={handleMouseLeave}
          />
        ))}
      </div>

      {/* ACADEMIC ROW */}
      <div className="gd-section-label">Academic</div>
      <div className="gd-cards-grid">
        {academicCards.map(card => (
          <VideoGameCard
            key={card.id}
            {...card}
            videoRefs={videoRefs}
            onEnter={handleMouseEnter}
            onLeave={handleMouseLeave}
          />
        ))}
      </div>
    </div>
  )
}
