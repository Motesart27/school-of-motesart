import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useIsMobile from '../hooks/useIsMobile.js'

const css = `
.settings-page{min-height:100vh;background:#0d0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff}
.set-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06)}
.set-header-left{display:flex;align-items:center;gap:12px}
.set-back{color:rgba(255,255,255,.6);font-size:20px;cursor:pointer;background:none;border:none}
.set-logout{padding:8px 18px;border-radius:8px;border:1px solid rgba(139,92,246,.4);background:transparent;color:#a78bfa;font-size:13px;font-weight:600;cursor:pointer}
.set-main{max-width:640px;margin:0 auto;padding:24px 16px 120px}
.set-card{background:rgba(22,26,40,.8);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px 24px;margin-bottom:24px}
.set-title{font-size:18px;font-weight:700;margin-bottom:24px;display:flex;align-items:center;gap:8px}
.av-area{display:flex;flex-direction:column;align-items:center;margin-bottom:28px}
.av-ring{width:160px;height:160px;border-radius:50%;padding:4px;background:linear-gradient(135deg,#a855f7,#7c3aed,#6d28d9);box-shadow:0 0 30px rgba(139,92,246,.35);margin-bottom:16px;display:flex;align-items:center;justify-content:center}
.av-inner{width:100%;height:100%;border-radius:50%;background:#1e2235;display:flex;align-items:center;justify-content:center;border:3px solid #0d0f1aoverflow:hidden}
.av-btns{display:flex;gap:12px;margin-bottom:10px}
.av-btn{padding:10px 22px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;display:flex;align-items:center;gap:6px}
.av-change{background:rgba(139,92,246,.15);color:#c4b5fd;border:1px solid rgba(139,92,246,.3)}
.av-remove{background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2)}
.set-field{margin-bottom:20px}
.set-field label{display:block;font-size:14px;font-weight:600;color:rgba(255,255,255,.8);margin-bottom:8px}
.set-field input{width:100%;padding:14px 18px;background:rgba(30,34,53,.9);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:15px;outline:none}
.set-field input:focus{border-color:rgba(139,92,246,.5)}
.set-field input[readonly]{opacity:.6;cursor:not-allowed}
.field-hint{font-size:11px;color:rgba(255,255,255,.3);margin-top:6px}
.contact-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}
.contact-opt{padding:16px;border-radius:12px;border:2px solid rgba(255,255,255,.08);background:rgba(30,34,53,.5);cursor:pointer;display:flex;align-items:center;gap:10px}
.contact-opt.selected{border-color:#a855f7;background:rgba(139,92,246,.08)}
.radio-circle{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.contact-opt.selected .radio-circle{border-color:#a855f7;background:rgba(139,92,246,.15)}
.radio-dot{width:10px;height:10px;border-radius:50%;background:#a855f7;transform:scale(0);transition:.2s}
.contact-opt.selected .radio-dot{transform:scale(1)}
.role-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
.role-chip{padding:8px 18px;border-radius:9999px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid transparent}
.role-chip.admin{background:rgba(234,179,8,.15);color:#fbbf24;border-color:rgba(234,179,8,.3)}
.role-chip.teacher{background:rgba(34,197,94,.15);color:#4ade80;border-color:rgba(34,197,94,.3)}
.role-chip.ambassador{background:rgba(249,115,22,.15);color:#fb923c;border-color:rgba(249,115,22,.3)}
.role-chip.student{background:rgba(148,163,184,.1);color:#94a3b8;border-color:rgba(148,163,184,.2)}
.role-chip.parent{background:rgba(236,72,153,.15);color:#f472b6;border-color:rgba(236,72,153,.3)}
.role-chip.selected{box-shadow:0 0 12px rgba(139,92,246,.3)}
.save-btn{width:100%;padding:16px;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;margin-top:8px;box-shadow:0 4px 20px rgba(168,85,247,.3)}
.pw-btn{width:100%;padding:16px;border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;background:rgba(30,34,53,.9);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.4);margin-top:8px}
`

export default function SettingsPage() {
 const mob = useIsMobile()
 const { user, logout } = useAuth()
 const navigate = useNavigate()
 const [contactMethod, setContactMethod] = useState('phone')
 const [selectedRole, setSelectedRole] = useState(user?.role || 'Student')
 const roles = [
 { key:'Admin', cls:'admin' }, { key:'Teacher', cls:'teacher' },
 { key:'Ambassador', cls:'ambassador' }, { key:'Student', cls:'student' }, { key:'Parent', cls:'parent' }, { key:'User', cls:'student' }
 ]

 return (
 <div className="settings-page">
 <style>{css}</style>
 <div className="set-header">
 <div className="set-header-left">
 <button className="set-back" onClick={()=>navigate('/dashboard')}>¢ Back</button>
 <h1 style={{fontSize: mob ? 16 : 20,fontWeight:700}}>Settings</h1>
 </div>
 <button className="set-logout" onClick={()=>{logout();navigate('/login')}}>Logout</button>
 </div>
 <div className="set-main">
 <div className="set-card">
 <div className="set-title">Profile</div>
 <div className="av-area">
 <div className="av-ring"><div className="av-inner"><img src={user?.photoURL || "/Motesart Avatar 1.PNG"} alt="Profile" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} /></div></div>
 <div className="av-btns">
 <button className="av-btn av-change">Change Photo</button>
 <button className="av-btn av-remove">Remove</button>
 </div>
 <div style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>Click photo or button to upload</div>
 </div>
 <div className="set-field"><label>Full Name</label><input defaultValue={user?.name || 'Motesart'} /></div>
 <div className="set-field"><label>Email</label><input readOnly value={user?.email || 'motesartproductions1@gmail.com'} /><div className="field-hint">Email cannot be changed</div></div>
 <div className="set-field"><label>Phone Number</label><input defaultValue="631-741-8189" /></div>
 <div className="set-field">
 <label>Preferred Contact Method</label>
 <div className="contact-row">
 <div className={`contact-opt ${contactMethod==='phone'?'selected':''}`} onClick={()=>setContactMethod('phone')}>
 <div className="radio-circle"><div className="radio-dot"/></div>
 <div><div style={{fontSize:14,fontWeight:600}}>Phone/SMS</div><div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>Receive messages via text</div></div>
 </div>
 <div className={`contact-opt ${contactMethod==='email'?'selected':''}`} onClick={()=>setContactMethod('email')}>
 <div className="radio-circle"><div className="radio-dot"/></div>
 <div><div style={{fontSize:14,fontWeight:600}}>Email</div><div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>Receive messages via email</div></div>
 </div>
 </div>
 </div>
 <div className="set-field">
 <label>Role</label>
 <div className="role-chips">
 {roles.map(r => <span key={r.key} className={`role-chip ${r.cls} ${selectedRole===r.key?'selected':''}`} onClick={()=>setSelectedRole(r.key)}>{r.key}</span>)}
 </div>
 </div>
 <button className="save-btn">Save Profile</button>
 </div>
 <div className="set-card">
 <div className="set-title">Change Password</div>
 <div className="set-field"><label>Current Password</label><input type="password" placeholder="Enter current password" /></div>
 <div className="set-field"><label>New Password</label><input type="password" placeholder="Enter new password" /></div>
 <div className="set-field"><label>Confirm New Password</label><input type="password" placeholder="Confirm new password" /></div>
 <button className="pw-btn">Change Password</button>
 </div>
 </div>
 </div>
 )
}
