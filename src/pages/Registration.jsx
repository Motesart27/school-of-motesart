import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api.js'

const css = `
.reg-page{min-height:100vh;background:#0d1117;color:#e2e8f0;font-family:'DM Sans',sans-serif;padding:30px 20px}
.reg-title{font-size:11px;letter-spacing:3px;text-transform:uppercase;text-align:center;margin-bottom:30px;color:#718096}
.reg-steps{display:flex;gap:8px;justify-content:center;margin-bottom:30px;flex-wrap:wrap}
.reg-step-btn{font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:8px 16px;border-radius:20px;cursor:pointer;border:1.5px solid rgba(99,179,237,.15);background:#1c2333;color:#718096;transition:all .2s}
.reg-step-btn.active{background:rgba(78,205,196,.12);border-color:#4ecdc4;color:#4ecdc4}
.reg-phone{width:340px;background:#161b26;border-radius:28px;border:1px solid rgba(99,179,237,.15);padding:28px 22px;box-shadow:0 30px 80px rgba(0,0,0,.4);margin:0 auto}
.reg-screen-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#4ecdc4;margin-bottom:14px}
.reg-som{text-align:center;font-size:15px;font-weight:700;margin-bottom:18px}
.reg-som span{color:#9f7aea}
.reg-progress{display:flex;gap:5px;margin-bottom:22px;justify-content:center}
.reg-dot{height:5px;border-radius:3px}
.reg-dot.done{background:#38b2ac;opacity:.5;width:16px}
.reg-dot.active{background:#4ecdc4;width:28px}
.reg-dot.inactive{background:#2d3748;width:16px}
.reg-step-title{font-size:20px;font-weight:800;margin-bottom:4px}
.reg-step-sub{font-size:12px;color:#718096;margin-bottom:20px}
.reg-field{margin-bottom:12px}
.reg-field label{font-size:10px;color:#718096;display:block;margin-bottom:4px}
.reg-field input,.reg-field select{width:100%;background:#1c2333;border:1px solid rgba(99,179,237,.15);border-radius:10px;padding:10px 12px;color:#e2e8f0;font-size:12px;outline:none}
.reg-field-row{display:flex;gap:8px}
.reg-field-row .reg-field{flex:1}
.reg-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.reg-role-card{background:#1c2333;border:1.5px solid rgba(99,179,237,.15);border-radius:12px;padding:12px 10px;cursor:pointer}
.reg-role-card.sel{border-color:#4ecdc4;background:rgba(78,205,196,.07)}
.reg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.reg-chip{background:#1c2333;border:1.5px solid rgba(99,179,237,.15);border-radius:8px;padding:5px 10px;font-size:10px;cursor:pointer}
.reg-chip.sel{border-color:#4ecdc4;background:rgba(78,205,196,.1);color:#4ecdc4}
.reg-avatar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.reg-avatar-card{background:#1c2333;border:2px solid rgba(99,179,237,.15);border-radius:16px;padding:16px 8px 12px;text-align:center;cursor:pointer;position:relative}
.reg-avatar-card.sel{border-color:#4ecdc4;background:rgba(78,205,196,.07);box-shadow:0 0 18px rgba(78,205,196,.18)}
.reg-avatar-card.sel::after{content:'â';position:absolute;top:7px;right:9px;font-size:9px;color:#4ecdc4;font-weight:700}
.reg-av-emoji{font-size:36px;margin-bottom:7px;display:block}
.reg-av-name{font-size:12px;font-weight:700}
.reg-av-role{font-size:9px;color:#718096;margin-top:2px}
.reg-upload{border:2px dashed rgba(99,179,237,.2);border-radius:14px;padding:18px;text-align:center;color:#718096;font-size:11px;margin-bottom:16px;cursor:pointer}
.reg-confirm-card{background:#1c2333;border-radius:12px;padding:14px;margin-bottom:10px;display:flex;gap:12px;align-items:center}
.reg-detail-card{background:#1c2333;border-radius:10px;padding:12px;margin-bottom:8px;font-size:10px;color:#718096;line-height:1.9}
.reg-detail-card strong{color:#e2e8f0;font-size:11px;display:block;margin-bottom:3px}
.reg-btn-row{display:flex;gap:10px;margin-top:6px}
.reg-btn{flex:1;padding:12px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:none}
.reg-btn-p{background:linear-gradient(135deg,#38b2ac,#4ecdc4);color:#0d1117}
.reg-btn-s{background:#1c2333;color:#718096;border:1px solid rgba(99,179,237,.15)}
.reg-wyl-card{background:linear-gradient(135deg,rgba(78,205,196,.08),rgba(99,179,237,.04));border:1px solid rgba(78,205,196,.25);border-radius:14px;padding:20px 16px;text-align:center;margin-bottom:14px}
.reg-wyl-q{background:#1c2333;border-radius:10px;padding:12px;margin-bottom:10px;border:1px solid rgba(99,179,237,.15)}
.reg-wyl-opt{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:7px;font-size:10px;color:#718096;margin-bottom:3px;cursor:pointer}
.reg-wyl-opt.sel{background:rgba(78,205,196,.1);color:#4ecdc4}
.reg-radio{width:12px;height:12px;border-radius:50%;border:2px solid rgba(99,179,237,.15);flex-shrink:0}
.reg-wyl-opt.sel .reg-radio{border-color:#4ecdc4;background:#4ecdc4}
`

const ROLES = [{icon:'ð¹',name:'Student',desc:'Learn & practice music'},{icon:'ð¨âð©âð§',name:'Parent',desc:'Monitor your child'},{icon:'ð©âð«',name:'Teacher',desc:'Manage students'},{icon:'â­',name:'Ambassador',desc:'Grow the community'}]
const AVATARS = [{emoji:'ð©ð¿âð¤',name:'Lyric',role:'The Storyteller'},{emoji:'ð¦ð½',name:'Jazz',role:'The Performer'},{emoji:'ð§ð»',name:'Coda',role:'The Dreamer'},{emoji:'ð§ð¾',name:'Forte',role:'The Rockstar'},{emoji:'ð§ð¾',name:'Sol',role:'The Composer'},{emoji:'ð¦ð»',name:'Riff',role:'The Freestyler'}]

export default function RegistrationPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('Student')
  const [avatar, setAvatar] = useState(0)
  const [exp, setExp] = useState('Beginner')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dots = Array.from({length:7}).map((_,i) => i < step ? 'done' : i === step ? 'active' : 'inactive')
  const go = (dir) => setStep(s => Math.max(0, Math.min(6, s + dir)))

  const finish = async () => {
    const fullName = `${firstName} ${lastName}`.trim()
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields (name, email, password)')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const user = await api.register({
        name: fullName,
        email: email,
        password: password,
        role: role,
        avatar: AVATARS[avatar]?.emoji || ''
      })
      login(user.user || user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="reg-page"><style>{css}</style>
      <div className="reg-title">School of Motesart â Registration Flow</div>
      <div className="reg-steps">{['Profile','Role','Music','WYL','Assessment','Avatar','Confirm'].map((s,i)=>(
        <div key={s} className={`reg-step-btn ${step===i?'active':''}`} onClick={()=>setStep(i)}>{i+1} Â· {s}</div>
      ))}</div>
      <div className="reg-phone">
        <div className="reg-screen-label">Step {step+1} of 7</div>
        <div className="reg-som">School of <span>Motesart</span></div>
        <div className="reg-progress">{dots.map((d,i)=><div key={i} className={`reg-dot ${d}`}/>)}</div>

        {step===0 && <>
          <div className="reg-step-title">Set up your profile</div><div className="reg-step-sub">Tell us a bit about yourself</div>
          <div className="reg-field-row"><div className="reg-field"><label>First Name *</label><input placeholder="John" value={firstName} onChange={e=>setFirstName(e.target.value)}/></div><div className="reg-field"><label>Last Name *</label><input placeholder="Doe" value={lastName} onChange={e=>setLastName(e.target.value)}/></div></div>
          <div className="reg-field"><label>Email *</label><input placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
          <div className="reg-field"><label>Password *</label><input type="password" placeholder="Create a password" value={password} onChange={e=>setPassword(e.target.value)}/></div>
          <button className="reg-btn reg-btn-p" style={{width:'100%',marginTop:6}} onClick={()=>go(1)}>Continue â</button>
        </>}

        {step===1 && <>
          <div className="reg-step-title">Choose your role</div><div className="reg-step-sub">How will you use School of Motesart?</div>
          <div className="reg-role-grid">{ROLES.map(r=>(
            <div key={r.name} className={`reg-role-card ${role===r.name?'sel':''}`} onClick={()=>setRole(r.name)}>
              <div style={{fontSize:20,marginBottom:5}}>{r.icon}</div><div style={{fontSize:12,fontWeight:700}}>{r.name}</div><div style={{fontSize:9,color:'#718096',marginTop:2}}>{r.desc}</div>
            </div>
          ))}</div>
          {error && <div style={{color:"#ef4444",fontSize:13,padding:"8px 12px",background:"rgba(239,68,68,0.1)",borderRadius:8,marginBottom:8,textAlign:"center"}}>{error}</div>}
          <div className="reg-btn-row"><button className="reg-btn reg-btn-s" onClick={()=>go(-1)}>â Back</button><button className="reg-btn reg-btn-p" onClick={()=>go(1)}>Continue â</button></div>
        </>}

        {step===2 && <>
          <div className="reg-step-title">Your music journey</div><div className="reg-step-sub">Help TAMi personalize your experience</div>
          <div className="reg-field"><label>Favorite Genre *</label><input placeholder="e.g. R&B, Classical, Pop"/></div>
          <div className="reg-field"><label>Favorite Song *</label><input placeholder="e.g. Moonlight Sonata"/></div>
          <div className="reg-field"><label>Primary Instrument</label><select><option>Piano</option><option>Guitar</option><option>Violin</option></select></div>
          <div className="reg-field"><label>Experience Level</label><div className="reg-chips">{['Beginner','Intermediate','Advanced'].map(e=><div key={e} className={`reg-chip ${exp===e?'sel':''}`} onClick={()=>setExp(e)}>{e}</div>)}</div></div>
          <div className="reg-btn-row"><button className="reg-btn reg-btn-s" onClick={()=>go(-1)}>â Back</button><button className="reg-btn reg-btn-p" onClick={()=>go(1)}>Continue â</button></div>
        </>}

        {step===3 && <>
          <div className="reg-step-title">Way You Learn</div><div className="reg-step-sub">Helps TAMi teach in the way that works best for you</div>
          <div className="reg-wyl-card">
            <div style={{fontSize:38,marginBottom:10}}>ð§ </div>
            <div style={{display:'inline-block',background:'rgba(78,205,196,.15)',color:'#4ecdc4',fontSize:9,letterSpacing:1.5,textTransform:'uppercase',padding:'3px 10px',borderRadius:20,marginBottom:10}}>Optional</div>
            <div style={{fontSize:16,fontWeight:800,marginBottom:8}}>Way You Learn Assessment</div>
            <div style={{fontSize:11,color:'#718096',lineHeight:1.7,marginBottom:16}}>10 quick questions help TAMi understand how you learn best.</div>
          </div>
          <div className="reg-wyl-q"><div style={{fontSize:11,fontWeight:500,marginBottom:8,lineHeight:1.5}}>ð® You want to learn a Mario Kart speed boost. Do you:</div>
            {['A. Watch a video online','B. Figure it out by trying','C. Ask someone to explain it'].map((o,i)=><div key={o} className={`reg-wyl-opt ${i===0?'sel':''}`}><div className="reg-radio"/>{o}</div>)}
          </div>
          <div className="reg-btn-row"><button className="reg-btn reg-btn-s" onClick={()=>go(-1)}>â Back</button><button className="reg-btn reg-btn-p" onClick={()=>go(1)}>Continue â</button></div>
        </>}

        {step===4 && <>
          <div className="reg-step-title">Music Assessment</div><div className="reg-step-sub">Helps TAMi set your starting point</div>
          {[['How long have you been learning piano?',['Less than 6 months','6 monthsâ2 years','2+ years'],0],['Can you read sheet music?',['Not at all','With some difficulty','Comfortably'],1],['What is your goal?',['Just for fun','Play for friends/family','Perform or take exams'],0]].map(([q,opts,sel])=>(
            <div key={q} style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:500,marginBottom:6}}>{q}</div><div className="reg-chips">{opts.map((o,i)=><div key={o} className={`reg-chip ${i===sel?'sel':''}`}>{o}</div>)}</div></div>
          ))}
          <div className="reg-btn-row"><button className="reg-btn reg-btn-s" onClick={()=>go(-1)}>â Back</button><button className="reg-btn reg-btn-p" onClick={()=>go(1)}>Continue â</button></div>
        </>}

        {step===5 && <>
          <div className="reg-step-title">Choose your avatar</div><div className="reg-step-sub">Pick a character or upload your own</div>
          <div className="reg-avatar-grid">{AVATARS.map((a,i)=>(
            <div key={a.name} className={`reg-avatar-card ${avatar===i?'sel':''}`} onClick={()=>setAvatar(i)}>
              <span className="reg-av-emoji">{a.emoji}</span><div className="reg-av-name">{a.name}</div><div className="reg-av-role">{a.role}</div>
            </div>
          ))}</div>
          <div className="reg-upload"><div style={{fontSize:22,marginBottom:5}}>ð·</div><div style={{fontSize:12,color:'#4ecdc4',fontWeight:600}}>Upload your own photo</div><div style={{fontSize:9,color:'#718096'}}>JPG, PNG or GIF Â· Max 5MB</div></div>
          <div className="reg-btn-row"><button className="reg-btn reg-btn-s" onClick={()=>go(-1)}>â Back</button><button className="reg-btn reg-btn-p" onClick={()=>go(1)}>Continue â</button></div>
        </>}

        {step===6 && <>
          <div className="reg-step-title">Confirm your profile</div><div className="reg-step-sub">Make sure everything looks right</div>
          <div className="reg-confirm-card"><div style={{fontSize:36}}>{AVATARS[avatar].emoji}</div><div><div style={{fontSize:15,fontWeight:700}}>{`${firstName} ${lastName}`.trim() || "Your Name"}</div><div style={{fontSize:10,color:'#718096',marginTop:2}}>{email || "your@email.com"}</div><div style={{display:'inline-block',background:'rgba(78,205,196,.15)',color:'#4ecdc4',fontSize:9,padding:'2px 8px',borderRadius:20,marginTop:4}}>{role}</div></div></div>
          <div className="reg-detail-card"><strong>ðµ Music Profile</strong>Instrument: Piano Â· {exp}<br/>Weekly Goal: 60 min</div>
          <div className="reg-detail-card"><strong>ð§  Learning Style</strong><span style={{color:'#4ecdc4'}}>Kinesthetic</span> â learns best by doing</div>
          <div className="reg-btn-row"><button className="reg-btn reg-btn-s" onClick={()=>go(-1)}>â Back</button><button className="reg-btn reg-btn-p" onClick={finish} disabled={isSubmitting} style={isSubmitting ? {opacity:0.6,pointerEvents:"none"} : {}}>{isSubmitting ? "Creating Account..." : "Finish Setup"} â</button></div>
        </>}
      </div>
    </div>
  )
}
