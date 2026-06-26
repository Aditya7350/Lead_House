import { useState, useEffect, useCallback, useRef } from 'react'

const API = window.location.origin.includes('5173') ? 'http://localhost:3000' : ''

const NICHES = [
  {value:"dentists",label:"Dentists / Dental",keywords:["dentist","dental clinic","dental office","family dentist","cosmetic dentist"]},
  {value:"plumbers",label:"Plumbers / HVAC",keywords:["plumber","plumbing services","emergency plumber"]},
  {value:"restaurants",label:"Restaurants / Cafes",keywords:["restaurant","cafe","dining","family restaurant"]},
  {value:"salons",label:"Salons / Barbershops",keywords:["hair salon","beauty salon","barbershop"]},
  {value:"realestate",label:"Real Estate",keywords:["real estate agent","realtor","property dealer"]},
  {value:"auto",label:"Auto Repair",keywords:["auto repair","car mechanic","auto service"]},
  {value:"gyms",label:"Gyms / Fitness",keywords:["gym","fitness studio","yoga studio"]},
  {value:"lawyers",label:"Lawyers / Law Firms",keywords:["lawyer","attorney","law firm"]},
  {value:"vets",label:"Veterinary",keywords:["veterinary","vet clinic","animal hospital"]},
  {value:"cleaning",label:"Cleaning Services",keywords:["cleaning service","house cleaning"]},
  {value:"it_services",label:"IT Services / Tech",keywords:["IT services","IT company","software company","tech company"]},
  {value:"web_dev",label:"Web Development",keywords:["web development","web design company"]},
  {value:"digital_marketing",label:"Digital Marketing",keywords:["digital marketing agency","SEO agency"]},
  {value:"accounting",label:"Accounting / CA",keywords:["accountant","CA firm","tax consultant"]},
  {value:"photography",label:"Photography",keywords:["photographer","photo studio","wedding photographer"]},
  {value:"education",label:"Education / Coaching",keywords:["coaching classes","tuition center","training institute"]},
  {value:"hospital",label:"Hospitals / Clinics",keywords:["hospital","clinic","medical center"]},
  {value:"hotel",label:"Hotels / Resorts",keywords:["hotel","resort","guest house"]},
  {value:"construction",label:"Construction",keywords:["construction company","builder","contractor"]},
  {value:"custom",label:"Custom (type your own)",keywords:[]},
]
const COUNTRIES = [
  {code:"US",name:"United States"},{code:"GB",name:"United Kingdom"},{code:"IN",name:"India"},
  {code:"CA",name:"Canada"},{code:"AU",name:"Australia"},{code:"DE",name:"Germany"},
  {code:"AE",name:"UAE"},{code:"SG",name:"Singapore"},{code:"NZ",name:"New Zealand"},
]
const STATUS = {
  new:{color:"#64748B",bg:"#F1F5F9",label:"NEW",icon:""},
  qualified:{color:"#0EA5E9",bg:"#E0F2FE",label:"SCORED",icon:""},
  demo_built:{color:"#F97316",bg:"#FFF7ED",label:"DEMO READY",icon:""},
  contacted:{color:"#8B5CF6",bg:"#F5F3FF",label:"CONTACTED",icon:""},
  replied:{color:"#10B981",bg:"#D1FAE5",label:"REPLIED",icon:""},
  archived:{color:"#94A3B8",bg:"#F8FAFC",label:"ARCHIVED",icon:""},
}

function getScoreBadge(score) {
  if (score == null) return { label: 'Unscored', color: '#94A3B8', bg: '#F8FAFC', icon: '' }
  if (score >= 8) return { label: 'Hot Lead', color: '#DC2626', bg: '#FEF2F2', icon: '' }
  if (score >= 6) return { label: 'Warm Lead', color: '#F59E0B', bg: '#FFFBEB', icon: '' }
  if (score >= 4) return { label: 'Cool Lead', color: '#0EA5E9', bg: '#F0F9FF', icon: '' }
  return { label: 'Cold Lead', color: '#64748B', bg: '#F8FAFC', icon: '' }
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json"
  }
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return "just now"
  if (d < 3600) return Math.floor(d/60) + "m ago"
  if (d < 86400) return Math.floor(d/3600) + "h ago"
  return Math.floor(d/86400) + "d ago"
}
function getEmail(l) { if(l.email) return l.email; try { return "info@" + new URL(l.website_url).hostname.replace("www.","") } catch(e) { return "" } }
function getHost(u) { try { return new URL(u).hostname } catch(e) { return "" } }

// ============ LOGIN PAGE ============
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let nodes = [], W, H, animId
    const resize = () => { W = canvas.width = canvas.parentElement.offsetWidth; H = canvas.height = canvas.parentElement.offsetHeight }
    resize(); window.addEventListener('resize', resize)
    for (let i = 0; i < 18; i++) nodes.push({ x: Math.random()*2000, y: Math.random()*1200, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3, r:Math.random()*2+1.5, pulse:0, ps:0 })
    const iv = setInterval(() => { const n = nodes[Math.floor(Math.random()*nodes.length)]; n.pulse=1; n.ps=0.015 }, 2000)
    const draw = () => {
      ctx.clearRect(0,0,W,H)
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) { const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,dist=Math.sqrt(dx*dx+dy*dy); if(dist<150){ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.strokeStyle=`rgba(249,115,22,${(1-dist/150)*.12})`;ctx.lineWidth=.5;ctx.stroke()}}
      for(const n of nodes){n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;if(n.pulse>0){n.pulse-=n.ps;ctx.beginPath();ctx.arc(n.x,n.y,n.r+n.pulse*16,0,Math.PI*2);ctx.fillStyle=`rgba(234,88,12,${n.pulse*.25})`;ctx.fill()}ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle=n.pulse>.5?'#EA580C':'#F97316';ctx.fill()}
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); clearInterval(iv); window.removeEventListener('resize', resize) }
  }, [])

  // const handleSubmit = async () => {
  //   if (!email || !pass) { setErr('Enter email and password'); return }
  //   if (isSignUp && !name) { setErr('Enter your name'); return }
  //   setLoading(true); setErr('')
  //   try {
  //     const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login'
  //     const body = isSignUp ? {email, password:pass, name} : {email, password:pass}
  //     const res = await fetch(API + endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
  //     const data = await res.json()
  //     // if (data.token) { localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); onLogin(data.user) }
  //     if (data.token) {
  //       localStorage.setItem('token', data.token)
  //       localStorage.setItem('user', JSON.stringify(data.user))
  //       onLogin(data.user)
  //     }

  //     else setErr(data.detail || (isSignUp ? 'Registration failed' : 'Invalid credentials'))
  //   } catch(e) { setErr('Cannot connect to server') }
  //   setLoading(false)
  // }
  const handleSubmit = async () => {
    // Fix: read from DOM if React state missed browser autofill
    const emailVal = email || document.querySelector('.login-form input[type="email"]')?.value?.trim() || ''
    const passVal = pass || document.querySelector('.login-form input[type="password"]')?.value || ''
    if (emailVal && !email) setEmail(emailVal)
    if (passVal && !pass) setPass(passVal)

    if (!emailVal || !passVal) { setErr('Enter email and password'); return }
    if (isSignUp && !name) { setErr('Enter your name'); return }
    setLoading(true); setErr('')
    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login'
      const body = isSignUp ? {email: emailVal, password: passVal, name} : {email: emailVal, password: passVal}
      const res = await fetch(API + endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
      } else {
        setErr(data.detail || (isSignUp ? 'Registration failed' : 'Invalid credentials'))
      }
    } catch(e) { setErr('Cannot connect to server') }
    setLoading(false)
  }

  return (
    <div className="login-split">
      <div className="login-brand">
        <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} />
        <div style={{position:'relative',zIndex:2}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:48}}>
            <img src="/ai-lead-machine-logo.svg" alt="LeadEmpire" style={{width:48,height:48,borderRadius:14,boxShadow:'0 8px 32px rgba(249,115,22,.3)'}} />
            <div><h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:26,fontWeight:700}}>LeadEmpire</h1><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#94A3B8'}}>ai-powered lead generation</span></div>
          </div>
          <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:44,fontWeight:700,lineHeight:1.15,letterSpacing:'-.03em',marginBottom:20}}>Find leads.<br/>Build demos.<br/><em style={{fontStyle:'normal',background:'linear-gradient(135deg,#F97316,#EA580C)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Close clients.</em></h2>
          <p style={{fontSize:16,color:'#CBD5E1',lineHeight:1.7,maxWidth:440}}>LeadEmpire discovers businesses, qualifies them, builds demo websites, and sends personalized outreach — all on autopilot.</p>
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-form">
          <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:28,fontWeight:600,marginBottom:8}}>{isSignUp ? 'Create account' : 'Welcome back'}</h2>
          <p style={{color:'#475569',fontSize:14,marginBottom:36}}>{isSignUp ? 'Start your free trial today' : 'Sign in to your dashboard'}</p>
          {err && <div style={{background:'#fee2e2',border:'1px solid #fca5a5',color:'#b91c1c',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:16}}>{err}</div>}
          {isSignUp && <div style={{marginBottom:22}}>
            <label style={{display:'block',fontSize:12,fontWeight:500,color:'#475569',marginBottom:6}}>Full Name</label>
            <input className="input" type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
          </div>}
          <div style={{marginBottom:22}}>
            <label style={{display:'block',fontSize:12,fontWeight:500,color:'#475569',marginBottom:6}}>Email</label>
            <input className="input" type="email" placeholder="you@agency.com" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div style={{marginBottom:22,position:'relative'}}>
            <label style={{display:'block',fontSize:12,fontWeight:500,color:'#475569',marginBottom:6}}>Password</label>
            <input className="input" type={showPw?'text':'password'} placeholder="Enter password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleSubmit()}} />
            <button onClick={()=>setShowPw(!showPw)} style={{position:'absolute',right:14,top:34,background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>{showPw?'Hide':'Show'}</button>
          </div>
          <button className="login-btn" onClick={handleSubmit} disabled={loading}>{loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign in')}</button>
          <div style={{textAlign:'center',marginTop:24,fontSize:13,color:'#475569'}}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span onClick={()=>{setIsSignUp(!isSignUp);setErr('')}} style={{color:'#F97316',cursor:'pointer',fontWeight:600}}>{isSignUp ? 'Sign in' : 'Sign up free'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ LEAD CARD ============
function LeadCard({ lead, onAction, loading }) {
  const sc = STATUS[lead.status] || STATUS.new
  const isNew = lead.status === 'new' || lead.qualification === 'pending'
  const isQ = lead.qualification === 'qualified'
  const hasD = lead.demo_site_built
  const canE = hasD && lead.status !== 'contacted' && lead.status !== 'replied'
  const em = getEmail(lead)
  const mapUrl = lead.latitude && lead.longitude ? `https://maps.google.com/maps?q=${lead.latitude},${lead.longitude}&z=16&output=embed` : null
  const mapLink = lead.latitude ? `https://www.google.com/maps?q=${lead.latitude},${lead.longitude}` : null
  const score = lead.website_score
  const pct = score != null ? (score/10)*100 : null
  const badge = getScoreBadge(score)
  const stars = lead.google_rating ? Math.round(lead.google_rating * 2) / 2 : 0

  return (
    <div className="lead-card" style={{overflow:'hidden',display:'flex',flexDirection:'column'}}>
      {/* Map + Badge overlay */}
      <div className="lead-map">
        {mapUrl ? <iframe src={mapUrl} loading="lazy" referrerPolicy="no-referrer" /> : <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569',background:'linear-gradient(135deg,#F8FAFC,#F1F5F9)'}}>No location data</div>}
        <div style={{position:'absolute',top:10,left:10,display:'flex',gap:6}}>
          <span style={{padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,letterSpacing:'.05em',color:sc.color,background:sc.bg,border:`1px solid ${sc.color}20`,backdropFilter:'blur(8px)'}}>{sc.icon} {sc.label}</span>
        </div>
        {score != null && <div style={{position:'absolute',top:10,right:10,padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:700,color:badge.color,background:badge.bg,border:`1px solid ${badge.color}20`,backdropFilter:'blur(8px)'}}>{badge.icon} {badge.label}</div>}
        {mapLink && <a href={mapLink} target="_blank" rel="noreferrer" style={{position:'absolute',bottom:8,right:8,padding:'4px 10px',borderRadius:6,background:'rgba(255,255,255,.92)',color:'#64748B',fontSize:11,textDecoration:'none',backdropFilter:'blur(4px)'}}>Maps ↗</a>}
      </div>

      {/* Header: name + rating */}
      <div style={{padding:'14px 18px 8px'}}>
        <h3 style={{fontSize:15,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",color:'#0F172A',marginBottom:4,lineHeight:1.3}}>{lead.business_name}</h3>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
          <span style={{fontSize:11,color:'#64748B',fontWeight:500}}>{lead.niche} · {lead.city}</span>
          {stars > 0 ? (
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{display:'flex',gap:1}}>
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= Math.floor(stars) ? '#F59E0B' : i - 0.5 <= stars ? 'url(#half)' : '#E2E8F0'} stroke="none">
                    <defs><linearGradient id="half"><stop offset="50%" stopColor="#F59E0B"/><stop offset="50%" stopColor="#E2E8F0"/></linearGradient></defs>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <span style={{fontSize:12,fontWeight:700,color:'#F59E0B',fontFamily:"'JetBrains Mono',monospace"}}>{lead.google_rating}</span>
              {lead.review_count > 0 && <span style={{fontSize:10,color:'#94A3B8'}}>({lead.review_count})</span>}
            </div>
          ) : <span style={{fontSize:10,color:'#CBD5E1'}}>No reviews</span>}
        </div>
      </div>

      {/* Contact details grid */}
      <div style={{padding:'6px 18px 10px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px'}}>
        {[
          {icon:'',value:lead.website_url?getHost(lead.website_url):'',href:lead.website_url,miss:'No website',label:'Web'},
          {icon:'',value:em,href:em?'mailto:'+em:null,miss:'No email',label:'Email'},
          {icon:'',value:lead.phone,href:lead.phone?'tel:'+lead.phone:null,miss:'No phone',label:'Phone'},
          {icon:'',value:lead.address?lead.address.split(',').slice(0,2).join(','):'',miss:'No address',label:'Location'},
        ].map((r,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 0',minWidth:0}}>
            <span style={{fontSize:10,color:'#94A3B8',fontWeight:600,minWidth:42}}>{r.label}</span>
            {r.value ? (r.href ? <a href={r.href} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#0EA5E9',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.value}</a> : <span style={{fontSize:11,color:'#334155',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.value}</span>) : <span style={{fontSize:10,color:'#CBD5E1',fontStyle:'italic'}}>{r.miss}</span>}
          </div>
        ))}
      </div>

      {/* AI Score section */}
      <div style={{padding:'10px 18px',borderTop:'1px solid #F1F5F9',background:pct!=null?'#FAFAFA':'transparent',flex:1}}>
        {pct != null ? (
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {/* Circular score */}
            <div style={{position:'relative',width:48,height:48,flexShrink:0}}>
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#F1F5F9" strokeWidth="4"/>
                <circle cx="24" cy="24" r="20" fill="none" stroke={badge.color} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${pct * 1.256} 999`} transform="rotate(-90 24 24)"
                  style={{transition:'stroke-dasharray .8s ease'}}/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:badge.color}}>{score}</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                <span style={{fontSize:12,fontWeight:700,color:'#0F172A'}}>AI Lead Score</span>
                <span style={{fontSize:10,padding:'1px 8px',borderRadius:10,background:badge.bg,color:badge.color,fontWeight:600,border:`1px solid ${badge.color}20`}}>{badge.icon} {badge.label}</span>
              </div>
              <div style={{fontSize:10,color:'#64748B',lineHeight:1.4}}>
                {score >= 8 ? 'High-value prospect — prioritize outreach' : score >= 6 ? 'Good potential — worth reaching out' : score >= 4 ? 'Average — may need more research' : 'Low match — consider skipping'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:48,height:48,borderRadius:'50%',border:'3px dashed #E2E8F0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#CBD5E1',flexShrink:0}}>?</div>
            <div><div style={{fontSize:12,fontWeight:600,color:'#94A3B8'}}>Not scored yet</div><div style={{fontSize:10,color:'#CBD5E1'}}>Run AI Analysis to get a lead score</div></div>
          </div>
        )}
        {lead.ai_analysis && <div style={{marginTop:8,padding:'8px 10px',borderRadius:8,background:'#F8FAFC',fontSize:11,color:'#475569',lineHeight:1.5,borderLeft:'3px solid #F97316'}}>{lead.ai_analysis}</div>}
      </div>

      {/* Demo site link */}
      {lead.demo_site_url && <div style={{padding:'0 18px 10px'}}><a href={lead.demo_site_url} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:8,background:'linear-gradient(135deg,rgba(249,115,22,.06),rgba(234,88,12,.06))',border:'1px solid rgba(249,115,22,.15)',textDecoration:'none'}}><span style={{fontSize:14,color:'#F97316',fontWeight:700}}>DEMO</span><div><div style={{fontSize:12,fontWeight:600,color:'#F97316'}}>Demo Site Ready</div><div style={{fontSize:10,color:'#64748B'}}>Click to preview</div></div><span style={{marginLeft:'auto',color:'#F97316',fontSize:16}}>↗</span></a></div>}

      {/* Action buttons */}
      <div className="lead-actions" style={{marginTop:'auto'}}>
        {isNew && <button className="btn btn-sm" onClick={()=>onAction(lead.id,'qualify')} disabled={loading[lead.id+'qualify']} style={{background:'linear-gradient(135deg,#0EA5E9,#0284C7)',color:'#fff',border:'none',flex:1,fontWeight:600,fontSize:11}}>
          {loading[lead.id+'qualify']?<span className="spinner"/>:'AI Analyze'}
        </button>}
        {isQ && !hasD && <button className="btn btn-sm" onClick={()=>onAction(lead.id,'build-demo')} disabled={loading[lead.id+'build-demo']} style={{background:'linear-gradient(135deg,#F97316,#EA580C)',color:'#fff',border:'none',flex:1,fontWeight:600,fontSize:11}}>
          {loading[lead.id+'build-demo']?<span className="spinner"/>:'Build Demo'}
        </button>}
        {canE && <button className="btn btn-sm" onClick={()=>onAction(lead.id,'send-email')} disabled={loading[lead.id+'send-email']} style={{background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'#fff',border:'none',flex:1,fontWeight:600,fontSize:11}}>
          {loading[lead.id+'send-email']?<span className="spinner"/>:'Outreach'}
        </button>}
        {score != null && <a href={API+'/report/'+lead.id} target="_blank" rel="noreferrer" className="btn btn-sm" style={{background:'#0F172A',color:'#fff',border:'none',flex:1,textDecoration:'none',justifyContent:'center',fontWeight:600,fontSize:11}}>Report</a>}
        {lead.demo_site_url && <a href={API+'/portal/'+lead.id} target="_blank" rel="noreferrer" className="btn btn-sm" style={{color:'#F97316',background:'#FFF7ED',border:'1px solid #FED7AA',flex:1,textDecoration:'none',justifyContent:'center',fontWeight:600,fontSize:11}}>Portal</a>}
      </div>
    </div>
  )
}

// ============ AI CHAT PAGE ============
function AIChatPage({ API, leads }) {
  const [messages, setMessages] = useState([{role:'ai',text:'Hey! I\'m your LeadEmpire AI Assistant. I have full access to your leads, scores, and pipeline.\n\nTry asking me things like:\n• "Who\'s my hottest lead?"\n• "Draft a cold email for [business name]"\n• "How do I use the demo builder?"\n• "Summarize my lead pipeline"\n\nOr select a specific lead from the right panel for deeper analysis.'}])
  const [input, setInput] = useState('')
  const [selectedLead, setSelectedLead] = useState('')
  const [loading, setLoading] = useState(false)

  const suggestions = [
    "Who's my hottest lead right now?",
    "Summarize my lead pipeline",
    "Draft a cold email for my best lead",
    "What should I do next?",
    "How do I build demo sites?",
    "Which leads should I prioritize?",
  ]

  const send = async (text) => {
    const userMsg = (text || input).trim()
    if (!userMsg) return
    setMessages(prev => [...prev, {role:'user', text: userMsg}])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(API + '/api/chat', {
        method: 'POST', headers: {'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}`},
        body: JSON.stringify({message: userMsg, lead_id: selectedLead || null})
      })
      const data = await res.json()
      setMessages(prev => [...prev, {role:'ai', text: data.response}])
    } catch(e) {
      setMessages(prev => [...prev, {role:'ai', text: 'Error connecting to AI.'}])
    }
    setLoading(false)
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:20,height:'calc(100vh - 140px)'}}>
      <div style={{display:'flex',flexDirection:'column',background:'#FFFFFF',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #F1F5F9',fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
          <img src="/ai-lead-machine-logo.svg" alt="L" style={{width:28,height:28,borderRadius:8}} />
          <span>AI Assistant</span>
          {selectedLead && <span style={{fontSize:11,color:'#F97316',fontWeight:500,padding:'2px 8px',background:'#FFF7ED',borderRadius:6}}>Lead selected</span>}
          <span style={{marginLeft:'auto',fontSize:11,color:'#94A3B8'}}>Powered by Claude</span>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:12}}>
          {messages.map(function(m, i) {
            return <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{maxWidth:'80%',padding:'12px 16px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',background:m.role==='user'?'linear-gradient(135deg,#F97316,#EA580C)':'#F8FAFC',color:m.role==='user'?'#fff':'#1E293B',fontSize:13,lineHeight:1.7,border:m.role==='user'?'none':'1px solid #E2E8F0',whiteSpace:'pre-wrap'}}>
                {m.text}
              </div>
            </div>
          })}
          {loading && <div style={{display:'flex'}}><div style={{padding:'12px 16px',borderRadius:'14px 14px 14px 4px',background:'#F8FAFC',border:'1px solid #E2E8F0',fontSize:13,color:'#64748B',display:'flex',alignItems:'center',gap:8}}><span className="spinner" style={{width:14,height:14}}/>Analyzing your leads...</div></div>}

          {/* Suggestion chips — show only at start */}
          {messages.length <= 1 && !loading && (
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
              {suggestions.map((s,i) => (
                <button key={i} onClick={()=>send(s)} style={{padding:'8px 14px',borderRadius:10,border:'1px solid #E2E8F0',background:'#FFFFFF',fontSize:12,color:'#334155',cursor:'pointer',fontWeight:500,transition:'all .15s'}}
                  onMouseEnter={e=>{e.target.style.background='#FFF7ED';e.target.style.borderColor='#FED7AA'}}
                  onMouseLeave={e=>{e.target.style.background='#FFFFFF';e.target.style.borderColor='#E2E8F0'}}
                >{s}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:14,borderTop:'1px solid #F1F5F9',display:'flex',gap:8}}>
          <input className="input" value={input} onChange={function(e){setInput(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter')send()}} placeholder="Ask about leads, strategy, emails, or platform help..." style={{flex:1,fontSize:13}} />
          <button className="btn btn-primary" onClick={()=>send()} disabled={loading} style={{padding:'10px 20px',fontSize:13}}>Send</button>
        </div>
      </div>

      {/* Lead selector sidebar */}
      <div style={{background:'#FFFFFF',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.04)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid #F1F5F9',fontSize:12,fontWeight:700,color:'#475569'}}>Lead Context</div>
        <div style={{overflowY:'auto',flex:1}}>
          <div onClick={function(){setSelectedLead('')}} style={{padding:'10px 14px',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:8,background:selectedLead===''?'#FFF7ED':'transparent',borderLeft:selectedLead===''?'3px solid #F97316':'3px solid transparent'}}>
            <span>●</span><span style={{fontWeight:selectedLead===''?600:400}}>All Leads (general)</span>
          </div>
          {leads.map(function(l) {
            const sc = l.website_score
            const badge = sc >= 8 ? '●' : sc >= 6 ? '●' : sc >= 4 ? '●' : sc != null ? '●' : '○'
            return <div key={l.id} onClick={function(){setSelectedLead(l.id)}} style={{padding:'10px 14px',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',gap:8,background:selectedLead===l.id?'#FFF7ED':'transparent',borderLeft:selectedLead===l.id?'3px solid #F97316':'3px solid transparent'}}>
              <span>{badge}</span><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:selectedLead===l.id?600:400}}>{l.business_name}</span>
            </div>
          })}
        </div>
      </div>
    </div>
  )
}

// ============ PRICING PAGE ============
function PricingPage({ onSelectPlan, currentPlan, trialDaysLeft }) {
  const plans = [
    {
      id: "starter", name: "Starter", price: "Free", currency: "", period: "",
      tagline: "Try LeadEmpire at no cost",
      features: ["200 leads / month", "20 demo sites", "100 emails", "2 AI scores (try free)", "30 AI chats", "AI Assistant included", "Google Maps scraping", "Email support"],
    },
    {
      id: "growth", name: "Growth", price: "4,999", currency: "₹", period: "/month", popular: true,
      tagline: "For growing agencies closing more deals",
      features: ["1,000 leads / month", "100 demo sites", "500 emails", "Unlimited AI chats", "AI Assistant included", "Priority support", "Custom branding", "Audit Reports"],
    },
    {
      id: "agency", name: "Agency", price: "9,999", currency: "₹", period: " Lifetime",
      tagline: "One-time payment, unlimited forever",
      features: ["Unlimited leads", "Unlimited demos", "Unlimited emails", "Unlimited AI chats", "Free AI Assistant", "White-label", "Dedicated support", "API access"],
    },
  ]

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 50%,#FFF1E6 100%)',padding:'60px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:24}}>
          <img src="/ai-lead-machine-logo.svg" alt="LeadEmpire" style={{width:44,height:44,borderRadius:12,boxShadow:'0 8px 32px rgba(249,115,22,.25)'}} />
          <span style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:24,fontWeight:700,color:'#0F172A'}}>LeadEmpire</span>
        </div>

        {currentPlan === 'expired' ? (
          <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'16px 24px',maxWidth:500,margin:'0 auto 32px',color:'#991B1B',fontSize:14}}>
            Your 7-day free trial has ended. Choose a plan to continue using LeadEmpire.
          </div>
        ) : currentPlan === 'trial' ? (
          <div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:12,padding:'16px 24px',maxWidth:500,margin:'0 auto 32px',color:'#9A3412',fontSize:14}}>
            {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left on your free trial. Upgrade anytime!
          </div>
        ) : null}

        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:42,fontWeight:700,color:'#0F172A',marginBottom:12,letterSpacing:'-.02em'}}>Choose Your Plan</h1>
        <p style={{fontSize:16,color:'#64748B',maxWidth:540,margin:'0 auto 16px',lineHeight:1.6}}>Start with a 7-day free trial. Starter is free forever. Pro at ₹4,999/month. Agency at ₹9,999 lifetime. All plans include Google Maps scraping, AI scoring, demo site builder, email outreach, and AI Assistant.</p>
        <div style={{display:'inline-block',padding:'8px 20px',borderRadius:10,background:'#0F172A',color:'#fff',fontSize:13,fontWeight:600,marginBottom:40}}>7 Days Free Trial · No Card Required · Pay via UPI / Cards</div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:24,maxWidth:1000,margin:'0 auto'}}>
          {plans.map(p => (
            <div key={p.id} style={{background:'#fff',borderRadius:16,border:p.popular?'2px solid #F97316':'1px solid #E2E8F0',padding:32,position:'relative',boxShadow:p.popular?'0 20px 60px rgba(249,115,22,.15)':'0 4px 20px rgba(0,0,0,.04)',transform:p.popular?'scale(1.03)':'none'}}>
              {p.popular && <div style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#F97316,#EA580C)',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 16px',borderRadius:20,letterSpacing:'.05em'}}>MOST POPULAR</div>}
              <h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:'#0F172A',marginBottom:4}}>{p.name}</h3>
              <p style={{fontSize:13,color:'#64748B',marginBottom:20}}>{p.tagline}</p>
              <div style={{marginBottom:24}}><span style={{fontSize:42,fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",color:'#0F172A'}}>{p.currency}{p.price}</span><span style={{fontSize:14,color:'#64748B'}}>{p.period}</span></div>
              <button onClick={() => onSelectPlan(p.id)} style={{width:'100%',padding:'14px 0',borderRadius:10,border:'none',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:24,background:p.popular?'linear-gradient(135deg,#F97316,#EA580C)':'#0F172A',color:'#fff',boxShadow:p.popular?'0 8px 24px rgba(249,115,22,.3)':'none'}}>
                Get Started
              </button>
              <div style={{textAlign:'left'}}>
                {p.features.map((f,i) => <div key={i} style={{padding:'8px 0',fontSize:13,color:'#475569',display:'flex',alignItems:'center',gap:8,borderBottom:i < p.features.length - 1 ? '1px solid #F8FAFC' : 'none'}}>
                  <span style={{color:'#F97316'}}>✓</span>{f}
                </div>)}
              </div>
            </div>
          ))}
        </div>

        {currentPlan === 'trial' && (
          <button onClick={() => onSelectPlan('skip')} style={{marginTop:32,padding:'10px 24px',border:'1px solid #E2E8F0',borderRadius:8,background:'transparent',color:'#64748B',fontSize:13,cursor:'pointer'}}>
            Continue with Free Trial →
          </button>
        )}

        <p style={{marginTop:32,fontSize:12,color:'#94A3B8'}}>7-day free trial on all plans. Billed monthly. Cancel anytime. Payments via UPI, Credit/Debit Card, Net Banking, Google Pay, PhonePe, Paytm & more. Need help? Contact sales@ioweb3.io</p>
      </div>
    </div>
  )
}

// ============ SCRAPE LOADER ============
function ScrapeLoader({ city, niche, startedAt, leadsFound }) {
  const [stage, setStage] = useState(0)
  const [dots, setDots] = useState('')

  const stages = [
    { icon: '●', text: `Searching Google Maps for ${niche} in ${city}`, duration: 5000 },
    { icon: '●', text: 'Discovering businesses in your area', duration: 8000 },
    { icon: '●', text: 'Extracting contact details & ratings', duration: 10000 },
    { icon: '●', text: 'Analyzing websites & online presence', duration: 10000 },
    { icon: '●', text: 'Saving leads to your database', duration: 8000 },
    { icon: '●', text: 'Almost done — finalizing results', duration: 15000 },
  ]

  useEffect(() => {
    const elapsed = Date.now() - (startedAt || Date.now())
    let total = 0
    for (let i = 0; i < stages.length; i++) {
      total += stages[i].duration
      if (elapsed < total) { setStage(i); break }
      if (i === stages.length - 1) setStage(i)
    }
    const interval = setInterval(() => {
      const el = Date.now() - (startedAt || Date.now())
      let t = 0
      for (let i = 0; i < stages.length; i++) {
        t += stages[i].duration
        if (el < t) { setStage(i); break }
        if (i === stages.length - 1) setStage(i)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [startedAt])

  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(i)
  }, [])

  const progress = Math.min(95, ((Date.now() - (startedAt || Date.now())) / 60000) * 100)

  if (leadsFound > 0) {
    return (
      <div style={{background:'linear-gradient(135deg,#D1FAE5,#ECFDF5)',border:'1px solid #6EE7B7',borderRadius:16,padding:'28px 32px',marginBottom:24,textAlign:'center',animation:'fadeIn .5s ease'}}>
        <div style={{fontSize:32,marginBottom:12,color:'#10B981',fontWeight:800}}>✓</div>
        <h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:'#065F46',marginBottom:6}}>Found {leadsFound} new lead{leadsFound !== 1 ? 's' : ''}!</h3>
        <p style={{fontSize:13,color:'#047857'}}>Scroll down to see your leads. More may still be loading.</p>
      </div>
    )
  }

  return (
    <div style={{background:'linear-gradient(135deg,#FFF7ED,#FFFBF5)',border:'1px solid #FED7AA',borderRadius:16,padding:'28px 32px',marginBottom:24,overflow:'hidden',position:'relative'}}>
      {/* Animated background shimmer */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(249,115,22,.04),transparent)',animation:'shimmer 2s infinite',backgroundSize:'200% 100%'}}/>

      <div style={{position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
          <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(135deg,#F97316,#EA580C)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:18,fontWeight:700,boxShadow:'0 8px 24px rgba(249,115,22,.25)',animation:'pulse 2s infinite'}}>
            {stages[stage]?.icon || '●'}
          </div>
          <div>
            <h3 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:700,color:'#0F172A',marginBottom:2}}>
              Scraping {niche} in {city}{dots}
            </h3>
            <p style={{fontSize:13,color:'#64748B'}}>{stages[stage]?.text || 'Processing...'}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{background:'#FED7AA',borderRadius:8,height:6,overflow:'hidden',marginBottom:12}}>
          <div style={{height:'100%',borderRadius:8,background:'linear-gradient(90deg,#F97316,#EA580C)',transition:'width 2s ease',width:progress+'%'}}/>
        </div>

        {/* Stage indicators */}
        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
          {stages.map((s, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:6,fontSize:11,
              background: i < stage ? '#D1FAE5' : i === stage ? '#FFF7ED' : '#F8FAFC',
              color: i < stage ? '#065F46' : i === stage ? '#9A3412' : '#94A3B8',
              border: i === stage ? '1px solid #FED7AA' : '1px solid transparent',
              fontWeight: i === stage ? 600 : 400
            }}>
              {i < stage ? '✓' : i === stage ? s.icon : '○'} {s.icon === stages[stage]?.icon && i === stage ? 'Active' : i < stage ? 'Done' : ''}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

// ============ MAIN APP ============
// ─── Skeleton helpers ────────────────────────────────────────────────
function SkeletonStatCards() {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:28}}>
      {Array.from({length:6}).map((_,i) => (
        <div key={i} className="stat-card-skeleton">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="skeleton skeleton-text" style={{width:'60%'}} />
            <div className="skeleton skeleton-circle" style={{width:28,height:28}} />
          </div>
          <div className="skeleton skeleton-text xl" style={{width:'40%',marginTop:4}} />
        </div>
      ))}
    </div>
  )
}

function SkeletonActivityRows({ count=6 }) {
  return (
    <>{Array.from({length:count}).map((_,i) => (
      <div key={i} className="activity-skeleton-row">
        <div className="skeleton skeleton-circle" style={{width:30,height:30,flexShrink:0}} />
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
          <div className="skeleton skeleton-text" style={{width:'70%'}} />
          <div className="skeleton skeleton-text sm" style={{width:'30%'}} />
        </div>
      </div>
    ))}</>
  )
}

function SkeletonLeadCards({ count=6 }) {
  return (
    <>{Array.from({length:count}).map((_,i) => (
      <div key={i} className="lead-card-skeleton">
        <div className="skeleton skeleton-rect skeleton-map" />
        <div className="skeleton-body">
          <div style={{display:'flex',gap:6,marginBottom:4}}>
            <div className="skeleton skeleton-text sm" style={{width:'40%'}} />
          </div>
          <div className="skeleton skeleton-text lg" style={{width:'80%'}} />
          <div className="skeleton skeleton-text sm" style={{width:'50%'}} />
        </div>
        {[1,2,3].map(r => (
          <div key={r} className="skeleton-row" style={{padding:'6px 18px',borderBottom:'1px solid #F8FAFC',display:'flex',gap:10}}>
            <div className="skeleton skeleton-circle" style={{width:18,height:18,flexShrink:0}} />
            <div className="skeleton skeleton-text" style={{flex:1}} />
          </div>
        ))}
        <div className="skeleton-actions">
          <div className="skeleton skeleton-rect" style={{height:30,flex:1}} />
          <div className="skeleton skeleton-rect" style={{height:30,flex:1}} />
        </div>
      </div>
    ))}</>
  )
}

export default function App({ onReady }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })
  
  const [profile, setProfile] = useState(
  JSON.parse(localStorage.getItem("leadhouse_profile")) || {
    name: user?.name || "",
    email: user?.email || "",
    company: "LeadEmpire"
  }
  );

  const [branding, setBranding] = useState(
    JSON.parse(localStorage.getItem("leadhouse_branding")) || {
      agency: "LeadEmpire",
      signature: "Thanks,\nLeadEmpire Team"
    }
  );

  const saveProfile = () => {
    localStorage.setItem(
      "leadhouse_profile",
      JSON.stringify(profile)
    );

    alert("Profile updated successfully");
  };

  const saveBranding = () => {
    localStorage.setItem(
      "leadhouse_branding",
      JSON.stringify(branding)
    );

    alert("Branding saved successfully");
  };

  const upgradePlan = () => {
    alert("Upgrade plans coming soon! Contact sales@ioweb3.io for early access.");
  };

  const [page, setPage] = useState('dashboard')
  const [pageKey, setPageKey] = useState(0)
  const [stats, setStats] = useState({total_leads:0,qualified:0,demos_built:0,contacted:0,replied:0,emails_today:0})
  const [leads, setLeads] = useState([])
  const [activity, setActivity] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [connected, setConnected] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedNav, setExpandedNav] = useState({})
  const [usageSummary, setUsageSummary] = useState(null)
  const [showPricing, setShowPricing] = useState(false)
  const [scrapeActive, setScrapeActive] = useState(false)
  const [scrapeInfo, setScrapeInfo] = useState({ city: '', niche: '', startedAt: null, prevCount: 0 })
  const [city, setCity] = useState(''); const [country, setCountry] = useState('US'); const [niche, setNiche] = useState('dentists')
  const [customKw, setCustomKw] = useState(''); const [radius, setRadius] = useState(25)
  const [scraping, setScraping] = useState(false); const [scrapeMsg, setScrapeMsg] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const [filter, setFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [filterNiche, setFilterNiche] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterScore, setFilterScore] = useState('')
  const [filterContact, setFilterContact] = useState({ website: false, email: false, phone: false })
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)

  const token = localStorage.getItem('token')

  // Dismiss splash as soon as component mounts
  useEffect(() => { if (onReady) onReady() }, [])

  // const fetchAll = useCallback(async () => {
  //   try {
  //     const [s,l,a,c] = await Promise.all([
  //       fetch(API+'/api/stats', { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(r=>r.json()),
  //       fetch(API+'/api/leads?limit=100', { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(r=>r.json()),
  //       fetch(API+'/api/activity?limit=30', { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(r=>r.json()),
  //       fetch(API+'/api/campaigns', { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(r=>r.json()),
  //     ])
  //     setStats(s); setLeads(l); setActivity(a); setCampaigns(c); setConnected(true)
  //   } catch { setConnected(false) }
  //   finally { setDataLoading(false) }
  // }, [])
const fetchAll = useCallback(async () => {

  const token = localStorage.getItem("token");
  if (!token) { setUser(null); return; }

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [sRes,lRes,aRes,cRes] = await Promise.all([
      fetch(API+"/api/stats",{headers}),
      fetch(API+"/api/leads?limit=100",{headers}),
      fetch(API+"/api/activity?limit=30",{headers}),
      fetch(API+"/api/campaigns",{headers}),
    ]);

    setStats(await sRes.json());
    setLeads(await lRes.json());
    setActivity(await aRes.json());
    setCampaigns(await cRes.json());
    setConnected(true);

    // Fetch usage separately so it doesn't break main data loading
    try {
      const uRes = await fetch(API+"/api/usage",{headers});
      const usage = await uRes.json();
      setUsageSummary(usage);
      // if (usage.plan === 'expired') { setShowPricing(true); }
      if (!usage.is_admin && (usage.trial_expired === true || usage.access === false || usage.plan === 'expired')) {
        setShowPricing(true);
      }
    } catch(e) { console.log("Usage fetch failed:", e); }

  } catch { setConnected(false); }
  finally { setDataLoading(false); }

}, []);

const authHeaders = {
  Authorization: `Bearer ${localStorage.getItem('token')}`
}

  useEffect(() => { if(user){fetchAll(); const i=setInterval(fetchAll,12000); return ()=>clearInterval(i)} }, [user, fetchAll])

  // Auto-detect when scrape is done (new leads appeared) — MUST be before conditional returns
  useEffect(() => {
    if (scrapeActive && leads.length > scrapeInfo.prevCount) {
      setTimeout(() => setScrapeActive(false), 2000)
    }
  }, [leads.length, scrapeActive, scrapeInfo.prevCount])

  const navigateTo = (id) => { setPage(id); setPageKey(k => k + 1) }

  // if (!token || !user) return <LoginPage onLogin={setUser} />
  if (!token || !user) return <LoginPage onLogin={setUser} />

  // Hard paywall: expired trial, non-admin → only the purchase page is reachable
  const trialExpired = user && !user.is_admin &&
    (user.trial_expired === true || user.access === false)
  if (trialExpired && !showPricing) {
    // force pricing on next tick
    setShowPricing(true)
  }

  // Plan gate: show pricing if trial expired
  const handleSelectPlan = async (planId) => {
    if (planId === 'skip') { setShowPricing(false); return; }

    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

    try {
      // Create Razorpay order
      const res = await fetch(API + '/api/payments/create-order', {
        method: 'POST', headers, body: JSON.stringify({ plan: planId })
      })
      const data = await res.json()

      // If Razorpay not configured, fallback to manual
      if (data.manual) {
        const ok = window.confirm(
          `You selected ${planId.charAt(0).toUpperCase() + planId.slice(1)}.\n\nContact admin to activate your plan.\nEmail: sales@ioweb3.io`
        )
        if (ok) window.open('mailto:sales@ioweb3.io?subject=LeadEmpire Upgrade — ' + planId, '_blank')
        return
      }

      // Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://checkout.razorpay.com/v1/checkout.js'
          s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })
      }

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'LeadEmpire',
        description: data.plan_name,
        order_id: data.order_id,
        prefill: { email: user?.email || '', contact: '' },
        theme: { color: '#F97316' },
        modal: { ondismiss: function() {} },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        handler: async function(response) {
          // Verify payment
          try {
            const vRes = await fetch(API + '/api/payments/verify', {
              method: 'POST', headers,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId
              })
            })
            const vData = await vRes.json()
            if (vData.success) {
              alert('Payment successful! Welcome to ' + planId.charAt(0).toUpperCase() + planId.slice(1) + ' plan!')
              setShowPricing(false)
              fetchAll()
            } else {
              alert('Payment verification failed. Contact support.')
            }
          } catch(e) {
            alert('Verification error. Your payment was received — contact support if plan is not activated.')
          }
        }
      })
      rzp.open()
    } catch(e) {
      alert('Error creating payment. Please try again or contact support.')
    }
  }

  if (showPricing) return <PricingPage
    onSelectPlan={handleSelectPlan}
    currentPlan={usageSummary?.plan || 'trial'}
    trialDaysLeft={usageSummary?.trial_days_left || 0}
  />

  const startScrape = async () => {
    if(!city.trim()){setScrapeMsg('Enter a city');return}
    setScraping(true);setScrapeMsg('Scraping '+city+'...')
    const nd=NICHES.find(n=>n.value===niche)
    const kw=niche==='custom'?(customKw||'business').split(',').map(k=>k.trim()):(customKw.trim()?customKw.split(',').map(k=>k.trim()):(nd?nd.keywords:[niche]))
    try{
      const scrapeRes = await fetch(API+'/api/quick-scrape',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body:JSON.stringify({city:city.trim(),
          country_code:country,
          niche:niche==='custom'?customKw.split(',')[0]||'business':nd?.value||niche,keywords:kw,radius_km:radius
        })})
      if (scrapeRes.status === 403) { setScrapeMsg('Limit reached — upgrade your plan'); setShowPricing(true); setScraping(false); return }
      setScrapeMsg('Started! Redirecting to My Leads...')

      // Activate scrape loader
      setScrapeActive(true)
      setScrapeInfo({ city: city.trim(), niche: nd?.label || niche, startedAt: Date.now(), prevCount: leads.length })

      setPage('leads'); setPageKey(k => k + 1)
      navigateTo('leads')

      // Aggressive polling during scrape
      const polls = [3000, 6000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000]
      polls.forEach(ms => setTimeout(fetchAll, ms))
      // Auto-stop loader after 90s max
      setTimeout(() => setScrapeActive(false), 90000)
    }catch(e){setScrapeMsg('Error: '+e.message)}
    setScraping(false)
  }

  const leadAction=async(id,act)=>{setActionLoading(p=>({...p,[id+act]:true}));try{const r=await fetch(API+'/api/leads/'+id+'/'+act,{method:'POST', headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});if(r.status===403){setShowPricing(true);setActionLoading(p=>({...p,[id+act]:false}));return}setTimeout(fetchAll,3000);setTimeout(fetchAll,8000)}catch{};setTimeout(()=>setActionLoading(p=>({...p,[id+act]:false})),10000)}
  const bulkAction=async(ep,lb)=>{setActionLoading(p=>({...p,[lb]:true}));try{const r=await fetch(API+'/api/run/'+ep,{method:'POST', headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});if(r.status===403){setShowPricing(true);setActionLoading(p=>({...p,[lb]:false}));return}setTimeout(fetchAll,3000);setTimeout(fetchAll,10000)}catch{};setTimeout(()=>setActionLoading(p=>({...p,[lb]:false})),15000)}
  const logout=()=>{localStorage.clear();setUser(null)}
  const toggleNav=(id)=>setExpandedNav(p=>({...p,[id]:!p[id]}))

  // Unique values for filter dropdowns
  const uniqueNiches = [...new Set(leads.map(l => l.niche).filter(Boolean))]
  const uniqueCities = [...new Set(leads.map(l => l.city).filter(Boolean))]
  const activeFilterCount = [searchQ, filterNiche, filterCity, filterScore, filterContact.website, filterContact.email, filterContact.phone].filter(Boolean).length

  // Apply all filters
  let filtered = leads.filter(l => {
    // Status filter
    if (filter === 'new' && l.status !== 'new') return false
    if (filter === 'qualified' && !(l.qualification === 'qualified' && !l.demo_site_built)) return false
    if (filter === 'demo' && !l.demo_site_built) return false
    if (filter === 'contacted' && l.status !== 'contacted' && l.status !== 'replied') return false

    // Search
    if (searchQ) {
      const q = searchQ.toLowerCase()
      const match = (l.business_name || '').toLowerCase().includes(q) ||
        (l.address || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q)
      if (!match) return false
    }

    // Niche filter
    if (filterNiche && l.niche !== filterNiche) return false

    // City filter
    if (filterCity && l.city !== filterCity) return false

    // Score filter
    if (filterScore) {
      const sc = l.website_score || 0
      if (filterScore === 'hot' && sc < 8) return false
      if (filterScore === 'warm' && (sc < 6 || sc >= 8)) return false
      if (filterScore === 'cool' && (sc < 4 || sc >= 6)) return false
      if (filterScore === 'cold' && sc >= 4) return false
      if (filterScore === 'unscored' && l.website_score != null) return false
    }

    // Contact filters
    if (filterContact.website && !l.website_url) return false
    if (filterContact.email && !l.email && !getEmail(l)) return false
    if (filterContact.phone && !l.phone) return false

    return true
  })

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    if (sortBy === 'rating') return (b.google_rating || 0) - (a.google_rating || 0)
    if (sortBy === 'score') return (b.website_score || 0) - (a.website_score || 0)
    if (sortBy === 'reviews') return (b.review_count || 0) - (a.review_count || 0)
    if (sortBy === 'name') return (a.business_name || '').localeCompare(b.business_name || '')
    return 0
  })
  const nd = NICHES.find(n=>n.value===niche)
  const demoLeads = leads.filter(l=>l.demo_site_built)

  const Ico = {
    dashboard: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>,
    find:      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4.5"/><line x1="10.5" y1="10.5" x2="15" y2="15"/></svg>,
    leads:     <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 13v-1a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v1"/><circle cx="6.5" cy="4.5" r="2.5"/><path d="M14 13v-1a3 3 0 0 0-2-2.83"/><path d="M11 2.17a3 3 0 0 1 0 5.66"/></svg>,
    demos:     <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="2" width="14" height="10" rx="1.5"/><path d="M5 15h6M8 12v3"/><path d="M4 6l2.5 2L4 10"/><line x1="8.5" y1="10" x2="12" y2="10"/></svg>,
    email:     <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 5l7 5 7-5"/></svg>,
    campaigns: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2L2 6.5l5 2 2 5L14 2z"/><line x1="7" y1="8.5" x2="10" y2="5.5"/></svg>,
    activity:  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="1,9 4,5 7,8 10,4 13,6 15,3"/></svg>,
    scout:     <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8 1l1.8 3.6L14 5.5l-3 2.9.7 4.1L8 10.4l-3.7 2.1.7-4.1L2 5.5l4.2-.9z"/></svg>,
    reports:   <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="1" width="10" height="14" rx="1.5"/><line x1="6" y1="5" x2="10" y2="5"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="11" x2="8" y2="11"/></svg>,
    settings:  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"/></svg>,
  }

  const NAV = [
    {section:'MAIN',items:[
      {id:'dashboard',icon:Ico.dashboard,label:'Dashboard'},
      {id:'find',icon:Ico.find,label:'Find Leads',children:[{id:'scrape',label:'Google Maps Search'},{id:'custom_search',label:'Custom / IT Search'}]},
      {id:'leads',icon:Ico.leads,label:'My Leads',badge:leads.length||null},
      {id:'demos',icon:Ico.demos,label:'Demo Sites',badge:demoLeads.length||null,badgeClass:'green'},
    ]},
    {section:'OUTREACH',items:[
      {id:'outreach_email',icon:Ico.email,label:'Email Outreach'},
      {id:'campaigns',icon:Ico.campaigns,label:'Campaigns'},
      {id:'activity',icon:Ico.activity,label:'Activity'},
    ]},
    {section:'TOOLS',items:[
      {id:'ai_chat',icon:Ico.scout,label:'AI Assistant',badge:'New',badgeClass:'green'},
      {id:'reports',icon:Ico.reports,label:'Reports'},
      {id:'settings',icon:Ico.settings,label:'Settings'},
    ]},
  ]

  const pageTitle = {dashboard:'Dashboard',ai_chat:'AI Assistant',scrape:'Find Leads — Google Maps',custom_search:'Find Leads — Custom Search',leads:'My Leads',demos:'Demo Sites',outreach_email:'Email Outreach',campaigns:'Campaigns',activity:'Activity Log',reports:'Reports',settings:'Settings'}
  // const saveProfile = async () => {
  // alert("Profile updated successfully");
  // };

  // const saveBranding = async () => {
  //   alert("Branding saved successfully");
  // };

  // const upgradePlan = () => {
  //   window.open("/pricing", "_blank");
  // };

  // const contactSupport = () => {
  //   window.open(
  //     "mailto:adityasarode7272@gmail.com?subject=LeadEmpire Support"
  //   );
  // };
  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className={`sidebar${collapsed?' collapsed':''}`}>
        <div className="sidebar-logo"><img src="/ai-lead-machine-logo.svg" alt="LeadEmpire" style={{width:38,height:38,borderRadius:10,boxShadow:'0 4px 12px rgba(249,115,22,.25)'}} /><div><h1>LeadEmpire</h1><span className="sub">Build Your Empire, One Lead at a Time</span></div></div>
        <nav className="sidebar-nav">
          {NAV.map(group => (
            <div key={group.section} className="nav-group">
              <div className="nav-section">{group.section}</div>
              {group.items.map(item => (
                <div key={item.id}>
                  <div className={`nav-item${page===item.id||(item.children?.some(c=>c.id===page))?' active':''}`} onClick={()=>{if(item.children){toggleNav(item.id)}else{navigateTo(item.id)}}}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && <span className={`nav-badge${item.badgeClass?' '+item.badgeClass:''}`}>{item.badge}</span>}
                    {item.children && <span className={`nav-arrow${expandedNav[item.id]?' open':''}`}>▶</span>}
                  </div>
                  {item.children && expandedNav[item.id] && (
                    <div className="nav-sub" style={{maxHeight:item.children.length*40}}>
                      {item.children.map(child => <div key={child.id} className={`nav-item${page===child.id?' active':''}`} onClick={()=>navigateTo(child.id)}><span className="nav-label">{child.label}</span></div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user"><div className="avatar">{(user.name||user.email||'A')[0].toUpperCase()}</div><div><div className="uname">{user.name||'Admin'}</div><div className="uemail">{user.email}</div></div></div>
          <button className="logout-btn" onClick={logout}>Sign Out</button>
          <button className="collapse-btn" onClick={()=>setCollapsed(!collapsed)}>{collapsed?'▶':'◀'} {collapsed?'':'Collapse'}</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        <div className="topbar">
          <h2>{pageTitle[page]||'Dashboard'}</h2>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {usageSummary && usageSummary.plan === 'trial' && (
              <div onClick={()=>setShowPricing(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,background:'#FFF7ED',border:'1px solid #FED7AA',cursor:'pointer',fontSize:11,color:'#9A3412',fontWeight:600}}>
                {usageSummary.trial_days_left}d left · <span style={{color:'#F97316'}}>Upgrade</span>
              </div>
            )}
            <div style={{display:'flex',gap:6}}>
              {[{l:'Leads',v:stats.total_leads,c:'#c2410c',bg:'#ffedd5'},{l:'Qualified',v:stats.qualified,c:'#0891b2',bg:'#ecfeff'},{l:'Demos',v:stats.demos_built,c:'#b45309',bg:'#fef3c7'},{l:'Replied',v:stats.replied,c:'#047857',bg:'#d1fae5'}].map(p=><div key={p.l} className="stat-pill" style={{color:p.c,background:p.bg,border:`1px solid ${p.c}25`}}><span className="label" style={{color:p.c}}>{p.l}</span>{p.v}</div>)}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:connected?'#047857':'#b91c1c'}}><span className="live-dot" style={{background:connected?'#10b981':'#ef4444',animation:connected?'pulse-dot 2s infinite':'none'}}/>{connected?'Live':'Offline'}</div>
          </div>
        </div>

        <main style={{padding:'24px 28px'}}>

        {/* DASHBOARD */}
        {page==='dashboard' && <div key={pageKey} className="page-content">
          {dataLoading ? <SkeletonStatCards /> : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:28}}>
            {[
              {l:'Total Leads',v:stats.total_leads,c:'#c2410c',bg:'#ffedd5',
                ico:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 13v-1a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v1"/><circle cx="6.5" cy="4.5" r="2.5"/><path d="M14 13v-1a3 3 0 0 0-2-2.83"/><path d="M11 2.17a3 3 0 0 1 0 5.66"/></svg>},
              {l:'Qualified',v:stats.qualified,c:'#0891b2',bg:'#ecfeff',
                ico:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M13 4L6.5 11 3 7.5"/></svg>},
              {l:'Demo Sites',v:stats.demos_built,c:'#b45309',bg:'#fef3c7',
                ico:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="1" y="2" width="14" height="10" rx="1.5"/><path d="M5 15h6M8 12v3"/><path d="M4.5 6l2 2-2 2"/><line x1="8.5" y1="10" x2="11.5" y2="10"/></svg>},
              {l:'Contacted',v:stats.contacted,c:'#4f46e5',bg:'#eef2ff',
                ico:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 5l7 5 7-5"/></svg>},
              {l:'Replied',v:stats.replied,c:'#047857',bg:'#d1fae5',
                ico:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M14 10c0 1.1-.9 2-2 2H5l-4 3V4c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2v6z"/></svg>},
              {l:'Today',v:stats.emails_today,c:'#b91c1c',bg:'#fde8e8',
                ico:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="1" y="2" width="14" height="13" rx="1.5"/><line x1="1" y1="6" x2="15" y2="6"/><line x1="5" y1="1" x2="5" y2="4"/><line x1="11" y1="1" x2="11" y2="4"/></svg>},
            ].map(s=>
              <div key={s.l} className="stat-card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontSize:12,color:'#475569',fontWeight:500}}>{s.l}</span>
                  <span style={{color:s.c,width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',background:s.bg}}>{s.ico}</span>
                </div>
                <div className="stat-value" style={{color:'#0F172A'}}>{s.v}</div>
              </div>
            )}
          </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div>
              <h3 style={{fontSize:14,fontWeight:600,color:'#64748B',marginBottom:12}}>Recent Activity</h3>
              <div className="card" style={{maxHeight:380,overflowY:'auto'}}>
                {dataLoading ? <SkeletonActivityRows count={6} /> : (
                  <>{activity.slice(0,10).map((it,i)=><div key={it.id||i} style={{padding:'10px 16px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:14}}>{{scrape:'→',qualify:'→',build:'→',email:'→',reply:'←'}[it.type]||'·'}</span><span style={{fontSize:12,color:'#475569',flex:1}}>{it.message}</span><span style={{fontSize:10,color:'#64748B',fontFamily:"'JetBrains Mono',monospace"}}>{timeAgo(it.created_at)}</span></div>)}{activity.length===0&&<div style={{padding:40,textAlign:'center',color:'#64748B',fontSize:13}}>No activity yet</div>}</>
                )}
              </div>
            </div>
            <div><h3 style={{fontSize:14,fontWeight:600,color:'#64748B',marginBottom:12}}>Quick Actions</h3><div style={{display:'flex',flexDirection:'column',gap:10}}>{[{l:'Find New Leads',d:'Scrape by location',a:()=>navigateTo('scrape'),i:''},{l:'AI Score All',d:'Analyze & rank leads',a:()=>bulkAction('qualify','bQ'),i:''},{l:'Build All Demos',d:'Generate websites',a:()=>bulkAction('build-sites','bB'),i:''},{l:'Launch Outreach',d:'Send email campaigns',a:()=>bulkAction('outreach','bE'),i:''}].map(a=><button key={a.l} className="btn" onClick={a.a} style={{padding:'14px 16px',textAlign:'left',justifyContent:'flex-start'}}><div><div style={{fontSize:13,fontWeight:500,color:'#0F172A'}}>{a.l}</div><div style={{fontSize:11,color:'#64748B'}}>{a.d}</div></div></button>)}</div></div>
          </div>
        </div>}

        {/* FIND LEADS */}
        {(page==='scrape'||page==='custom_search') && <div key={pageKey} className="page-content" style={{maxWidth:780}}>

          {/* Hero banner */}
          <div style={{background:'linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 60%,#FEF3C7 100%)',borderRadius:16,padding:'28px 32px',marginBottom:28,border:'1px solid #FED7AA',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:120,height:120,borderRadius:'50%',background:'rgba(249,115,22,.08)'}} />
            <div style={{position:'absolute',bottom:-30,right:40,width:80,height:80,borderRadius:'50%',background:'rgba(249,115,22,.05)'}} />
            <div style={{position:'relative',zIndex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                {page==='custom_search'
                  ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                }
                <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:700,color:'#0F172A',margin:0}}>
                  {page==='custom_search' ? 'Custom Business Search' : 'Google Maps Lead Finder'}
                </h2>
              </div>
              <p style={{fontSize:14,color:'#64748B',margin:0,maxWidth:500,lineHeight:1.6}}>
                {page==='custom_search'
                  ? 'Search for any business type — IT companies, software firms, marketing agencies, or anything you can imagine.'
                  : 'Discover businesses in any city and niche. We extract names, emails, phone numbers, ratings, and websites automatically.'}
              </p>
            </div>
          </div>

          {/* How it works steps */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:28}}>
            {[
              {icon:'1',label:'Find',desc:'Scrape leads',color:'#F97316'},
              {icon:'2',label:'Score',desc:'AI qualifies',color:'#0EA5E9'},
              {icon:'3',label:'Demo',desc:'Build sites',color:'#8B5CF6'},
              {icon:'4',label:'Outreach',desc:'Send emails',color:'#10B981'},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:'center',padding:'14px 8px',borderRadius:12,background:i===0?'#FFF7ED':'#F8FAFC',border:i===0?'1.5px solid #FED7AA':'1px solid #E2E8F0',transition:'all .2s'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:i===0?'#F97316':s.color||'#94A3B8',color:'#fff',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'}}>{s.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:i===0?'#EA580C':'#0F172A'}}>{s.label}</div>
                <div style={{fontSize:10,color:'#94A3B8'}}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Search form card */}
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',padding:'28px 28px 24px',boxShadow:'0 2px 12px rgba(0,0,0,.03)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#F97316'}} />
              <span style={{fontSize:13,fontWeight:700,color:'#0F172A',fontFamily:"'Space Grotesk',sans-serif"}}>Search Configuration</span>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:6,letterSpacing:'.03em'}}>CITY / AREA *</label>
                <input className="input" placeholder="e.g. Pune, Miami, London..." value={city} onChange={e=>setCity(e.target.value)} style={{fontSize:14}} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:6,letterSpacing:'.03em'}}>COUNTRY</label>
                <select className="select" value={country} onChange={e=>setCountry(e.target.value)}>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:6,letterSpacing:'.03em'}}>
                  {page==='custom_search' ? 'BUSINESS TYPE' : 'NICHE'}
                </label>
                {page==='custom_search'
                  ? <input className="input" placeholder="Type anything: IT consulting, pet shop, tattoo studio..." value={customKw} onChange={e=>setCustomKw(e.target.value)} style={{fontSize:14}} />
                  : <><select className="select" value={niche} onChange={e=>setNiche(e.target.value)}>{NICHES.map(n=><option key={n.value} value={n.value}>{n.label}</option>)}</select>
                    {niche==='custom'&&<input className="input" style={{marginTop:8}} placeholder="Type your niche..." value={customKw} onChange={e=>setCustomKw(e.target.value)} />}</>
                }
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:6,letterSpacing:'.03em'}}>RADIUS: {radius}km</label>
                <div style={{padding:'0 4px',marginTop:4}}>
                  <input type="range" min="5" max="50" value={radius} onChange={e=>setRadius(+e.target.value)} style={{width:'100%',accentColor:'#F97316'}} />
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#94A3B8',marginTop:2}}><span>5km</span><span>25km</span><span>50km</span></div>
                </div>
              </div>
            </div>

            {page!=='custom_search'&&<div style={{marginBottom:20}}>
              <label style={{fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:6,letterSpacing:'.03em'}}>KEYWORDS</label>
              <input className="input" placeholder={nd?nd.keywords.join(', '):''} value={customKw} onChange={e=>setCustomKw(e.target.value)} />
              {!customKw&&nd&&nd.keywords.length>0&&<div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                {nd.keywords.map(k=><span key={k} onClick={()=>setCustomKw(k)} style={{padding:'4px 10px',borderRadius:6,background:'#FFF7ED',border:'1px solid #FED7AA',fontSize:11,color:'#EA580C',fontWeight:500,cursor:'pointer',transition:'all .15s'}}>{k}</span>)}
              </div>}
            </div>}

            <div style={{display:'flex',alignItems:'center',gap:16,paddingTop:8,borderTop:'1px solid #F1F5F9'}}>
              <button className="btn btn-primary" onClick={startScrape} disabled={scraping} style={{padding:'13px 36px',fontSize:14,borderRadius:10}}>
                {scraping ? <><span className="spinner" style={{width:14,height:14,marginRight:8}} /> Scraping...</> : 'Start Scraping'}
              </button>
              <span style={{fontSize:12,color:'#94A3B8'}}>Usually takes 30-60 seconds</span>
            </div>
          </div>

          {scrapeMsg&&<div style={{marginTop:16,padding:'12px 16px',borderRadius:10,background:scrapeMsg.includes('Error')||scrapeMsg.includes('Limit')?'#FEF2F2':'#F0FDF4',color:scrapeMsg.includes('Error')||scrapeMsg.includes('Limit')?'#991B1B':'#065F46',border:scrapeMsg.includes('Error')||scrapeMsg.includes('Limit')?'1px solid #FECACA':'1px solid #BBF7D0',fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:scrapeMsg.includes('Error')||scrapeMsg.includes('Limit')?'#EF4444':'#10B981',flexShrink:0}} />{scrapeMsg}
          </div>}

          {/* Popular niches quick-select (Google Maps mode only) */}
          {page==='scrape' && <div style={{marginTop:24}}>
            <div style={{fontSize:11,fontWeight:600,color:'#94A3B8',letterSpacing:'.05em',marginBottom:10}}>POPULAR NICHES</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {NICHES.filter(n=>n.value!=='custom').slice(0,10).map(n=>(
                <button key={n.value} onClick={()=>setNiche(n.value)} style={{padding:'6px 14px',borderRadius:8,border:niche===n.value?'1.5px solid #F97316':'1px solid #E2E8F0',background:niche===n.value?'#FFF7ED':'#fff',color:niche===n.value?'#EA580C':'#475569',fontSize:12,fontWeight:500,cursor:'pointer',transition:'all .15s',fontFamily:'inherit'}}>
                  {n.label}
                </button>
              ))}
            </div>
          </div>}
        </div>}

        {/* MY LEADS */}
        {page==='leads' && <div key={pageKey} className="page-content">
          {/* Scrape progress loader */}
          {scrapeActive && <ScrapeLoader
            city={scrapeInfo.city}
            niche={scrapeInfo.niche}
            startedAt={scrapeInfo.startedAt}
            leadsFound={leads.length - scrapeInfo.prevCount}
          />}

          {/* Top bar: status tabs + bulk actions */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:12}}>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[['all','All ('+filtered.length+')'],['new','New'],['qualified','Scored'],['demo','Has Demo'],['contacted','Contacted']].map(f=>
                <button key={f[0]} className={`btn btn-sm ${filter===f[0]?'btn-primary':''}`} onClick={()=>setFilter(f[0])}>{f[1]}</button>
              )}
            </div>
            <div style={{display:'flex',gap:6}}>
              <button className="btn btn-sm" onClick={()=>bulkAction('qualify','bQ')} disabled={actionLoading.bQ} style={{background:'linear-gradient(135deg,#0EA5E9,#0284C7)',color:'#fff',border:'none',fontWeight:600}}>{actionLoading.bQ?<span className="spinner"/>:'AI Score All'}</button>
              <button className="btn btn-sm" onClick={()=>bulkAction('build-sites','bB')} disabled={actionLoading.bB} style={{background:'linear-gradient(135deg,#F97316,#EA580C)',color:'#fff',border:'none',fontWeight:600}}>{actionLoading.bB?<span className="spinner"/>:'Build Demos'}</button>
              <button className="btn btn-sm" onClick={()=>bulkAction('outreach','bE')} disabled={actionLoading.bE} style={{background:'linear-gradient(135deg,#8B5CF6,#7C3AED)',color:'#fff',border:'none',fontWeight:600}}>{actionLoading.bE?<span className="spinner"/>:'Send Outreach'}</button>
            </div>
          </div>

          {/* Search + Filter toggle + Sort */}
          <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200,position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#94A3B8'}}>⌕</span>
              <input
                className="input"
                placeholder="Search by name, address, email, phone..."
                value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                style={{paddingLeft:36,fontSize:13,height:38}}
              />
            </div>
            <button
              className="btn btn-sm"
              onClick={()=>setShowFilters(!showFilters)}
              style={{height:38,padding:'0 14px',background:showFilters||activeFilterCount?'#0F172A':'#fff',color:showFilters||activeFilterCount?'#fff':'#64748B',border:'1px solid #E2E8F0',fontWeight:600,fontSize:12,display:'flex',alignItems:'center',gap:6}}
            >
              Filters {activeFilterCount > 0 && <span style={{background:'#F97316',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:700}}>{activeFilterCount}</span>}
            </button>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{height:38,padding:'0 12px',borderRadius:8,border:'1px solid #E2E8F0',fontSize:12,color:'#334155',background:'#fff',cursor:'pointer'}}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="score">Highest Score</option>
              <option value="rating">Highest Rating</option>
              <option value="reviews">Most Reviews</option>
              <option value="name">A → Z</option>
            </select>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <div style={{background:'#FAFAFA',border:'1px solid #E2E8F0',borderRadius:12,padding:'16px 20px',marginBottom:16,display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{minWidth:150}}>
                <label style={{fontSize:11,color:'#64748B',fontWeight:600,display:'block',marginBottom:4}}>Industry</label>
                <select value={filterNiche} onChange={e=>setFilterNiche(e.target.value)} style={{width:'100%',height:34,borderRadius:8,border:'1px solid #E2E8F0',fontSize:12,padding:'0 10px',background:'#fff'}}>
                  <option value="">All Industries</option>
                  {uniqueNiches.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{minWidth:150}}>
                <label style={{fontSize:11,color:'#64748B',fontWeight:600,display:'block',marginBottom:4}}>City</label>
                <select value={filterCity} onChange={e=>setFilterCity(e.target.value)} style={{width:'100%',height:34,borderRadius:8,border:'1px solid #E2E8F0',fontSize:12,padding:'0 10px',background:'#fff'}}>
                  <option value="">All Cities</option>
                  {uniqueCities.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{minWidth:150}}>
                <label style={{fontSize:11,color:'#64748B',fontWeight:600,display:'block',marginBottom:4}}>Lead Score</label>
                <select value={filterScore} onChange={e=>setFilterScore(e.target.value)} style={{width:'100%',height:34,borderRadius:8,border:'1px solid #E2E8F0',fontSize:12,padding:'0 10px',background:'#fff'}}>
                  <option value="">Any Score</option>
                  <option value="hot">Hot Leads (8+)</option>
                  <option value="warm">Warm Leads (6-7)</option>
                  <option value="cool">Cool Leads (4-5)</option>
                  <option value="cold">Cold Leads (0-3)</option>
                  <option value="unscored">Unscored</option>
                </select>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <label style={{fontSize:11,color:'#64748B',fontWeight:600,marginRight:4}}>Has:</label>
                {[['website','Website'],['email','Email'],['phone','Phone']].map(([k,lb])=>
                  <label key={k} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:filterContact[k]?'#0F172A':'#94A3B8',cursor:'pointer',padding:'4px 10px',borderRadius:6,background:filterContact[k]?'#E0F2FE':'#F8FAFC',border:`1px solid ${filterContact[k]?'#BAE6FD':'#F1F5F9'}`}}>
                    <input type="checkbox" checked={filterContact[k]} onChange={e=>setFilterContact(p=>({...p,[k]:e.target.checked}))} style={{display:'none'}} />
                    {lb}
                  </label>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button onClick={()=>{setSearchQ('');setFilterNiche('');setFilterCity('');setFilterScore('');setFilterContact({website:false,email:false,phone:false});setSortBy('newest')}}
                  style={{height:34,padding:'0 14px',borderRadius:8,border:'1px solid #FECACA',background:'#FEF2F2',color:'#DC2626',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                  Clear All
                </button>
              )}
            </div>
          )}

          {/* Results count */}
          {(searchQ || filterNiche || filterCity || filterScore || filterContact.website || filterContact.email || filterContact.phone) && (
            <div style={{fontSize:12,color:'#64748B',marginBottom:12}}>
              Showing {filtered.length} of {leads.length} leads
              {searchQ && <span> matching "<b>{searchQ}</b>"</span>}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:18}}>
            {dataLoading ? <SkeletonLeadCards count={6} /> : filtered.map((l,i)=><LeadCard key={l.id||i} lead={l} onAction={leadAction} loading={actionLoading}/>)}
          </div>
          {!dataLoading && !scrapeActive && filtered.length===0&&<div style={{padding:60,textAlign:'center',color:'#64748B'}}>{leads.length > 0 ? 'No leads match your filters. Try adjusting them.' : 'No leads yet. Go to Find Leads to get started.'}</div>}
        </div>}

        {/* DEMO SITES */}
        {page==='demos' && <div>
          <p style={{fontSize:13,color:'#64748B',marginBottom:20}}>All generated demo websites for your leads.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
            {demoLeads.map((l,i)=><div key={l.id||i} className="card"><div style={{padding:18,display:'flex',alignItems:'center',gap:14}}><div style={{width:44,height:44,borderRadius:10,background:'linear-gradient(135deg,rgba(249,115,22,.15),rgba(234,88,12,.15))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#F97316'}}>D</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:'#0F172A'}}>{l.business_name}</div><div style={{fontSize:12,color:'#64748B'}}>{l.niche} · {l.city}</div></div><a href={l.demo_site_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">View ↗</a></div></div>)}
          </div>
          {demoLeads.length===0&&<div style={{padding:60,textAlign:'center',color:'#64748B'}}>No demo sites yet. Qualify leads and build demos.</div>}
        </div>}

        {/* EMAIL OUTREACH */}
        {page==='outreach_email' && <div>
          <div style={{display:'flex',gap:12,marginBottom:24}}><button className="btn btn-primary" onClick={()=>bulkAction('outreach','bO')} disabled={actionLoading.bO}>{actionLoading.bO?<span className="spinner"/>:'Send All Due Emails'}</button></div>
          <h3 style={{fontSize:14,fontWeight:600,color:'#64748B',marginBottom:12}}>Recent Emails</h3>
          <div className="card">{(Array.isArray(activity) ? activity : []).filter(a => a.type === "email").map((it,i)=><div key={it.id||i} style={{padding:'12px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:14,color:'#4f46e5'}}>●</span><span style={{fontSize:13,color:'#475569',flex:1}}>{it.message}</span><span style={{fontSize:10,color:'#64748B',fontFamily:"'JetBrains Mono',monospace"}}>{timeAgo(it.created_at)}</span></div>)}{activity.filter(a=>a.type==='email').length===0&&<div style={{padding:40,textAlign:'center',color:'#64748B',fontSize:13}}>No emails sent yet. Build demos first, then send outreach.</div>}</div>
        </div>}

        {/* CAMPAIGNS */}
        {page==='campaigns' && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {campaigns.map((c,i)=><div key={c.id||i} className="card"><div className="card-body"><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{width:8,height:8,borderRadius:'50%',background:c.status==='active'?'#10b981':'#475569',display:'inline-block'}}/><span style={{fontSize:14,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}}>{c.name}</span></div><span className="badge" style={{color:c.status==='active'?'#10b981':'#64748b',background:c.status==='active'?'#0a3d2e':'#1e293b'}}>{c.status}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12,color:'#64748B'}}><div><span style={{color:'#64748B'}}>Niche:</span> {c.niche}</div><div><span style={{color:'#64748B'}}>City:</span> {c.city}</div><div><span style={{color:'#64748B'}}>Country:</span> {c.country_code}</div><div><span style={{color:'#64748B'}}>Keywords:</span> {(c.keywords||[]).length}</div></div></div></div>)}
          {campaigns.length===0&&<div style={{padding:48,textAlign:'center',color:'#64748B'}}>No campaigns yet. Search for leads to create one.</div>}
        </div>}

        {/* ACTIVITY */}
        {page==='activity' && <div style={{maxWidth:720}}><div className="card">{activity.map((it,i)=>{const cs={scrape:'#c2410c',qualify:'#0891b2',build:'#b45309',email:'#4f46e5',reply:'#047857'},em={scrape:'→',qualify:'→',build:'→',email:'→',reply:'←'};return<div key={it.id||i} style={{padding:'12px 20px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:12}}><div style={{width:30,height:30,borderRadius:7,background:(cs[it.type]||'#64748b')+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{em[it.type]||'·'}</div><div style={{flex:1,fontSize:13,color:it.type==='reply'?'#047857':'#1E293B',fontWeight:it.type==='reply'?600:400}}>{it.message}</div><div style={{fontSize:11,color:'#64748B',fontFamily:"'JetBrains Mono',monospace"}}>{timeAgo(it.created_at)}</div></div>})}{activity.length===0&&<div style={{padding:48,textAlign:'center',color:'#64748B'}}>No activity yet.</div>}</div></div>}

        {/* AI ASSISTANT */}
        {page==='ai_chat' && <AIChatPage API={API} leads={leads} />}

        {/* REPORTS */}
        {page==='reports' && <div className="page-content">
          <div style={{marginBottom:20}}>
            <p style={{fontSize:13,color:'#64748B'}}>Generate branded audit reports for your leads. Share with clients or download as PDF.</p>
          </div>

          {leads.filter(l => l.website_score || l.ai_analysis).length === 0 ? (
            <div style={{padding:60,textAlign:'center'}}>
              
              <h3 style={{fontSize:18,fontWeight:600,color:'#334155',marginBottom:8}}>No scored leads yet</h3>
              <p style={{fontSize:13,color:'#64748B',maxWidth:400,margin:'0 auto 20px'}}>Run AI Score on your leads first, then come back here to generate professional audit reports.</p>
              <button className="btn btn-primary" onClick={()=>navigateTo('leads')}>Go to My Leads →</button>
            </div>
          ) : (
            <div style={{display:'grid',gap:12}}>
              {leads.filter(l => l.website_score || l.ai_analysis).map(l => {
                const sc = l.website_score || 0
                const badge = getScoreBadge(sc)
                return (
                  <div key={l.id} style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px',background:'#fff',borderRadius:12,border:'1px solid #E2E8F0'}}>
                    {/* Score circle */}
                    <div style={{position:'relative',width:44,height:44,flexShrink:0}}>
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#F1F5F9" strokeWidth="4"/>
                        <circle cx="22" cy="22" r="18" fill="none" stroke={badge.color} strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={`${(sc/10)*113} 999`} transform="rotate(-90 22 22)"/>
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:badge.color,fontFamily:"'JetBrains Mono',monospace"}}>{sc}</div>
                    </div>
                    {/* Business info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                        <span style={{fontSize:14,fontWeight:700,color:'#0F172A',fontFamily:"'Space Grotesk',sans-serif"}}>{l.business_name}</span>
                        <span style={{padding:'2px 8px',borderRadius:6,fontSize:10,fontWeight:600,color:badge.color,background:badge.bg,border:`1px solid ${badge.color}20`}}>{badge.icon} {badge.label}</span>
                      </div>
                      <div style={{fontSize:11,color:'#64748B'}}>{l.niche} · {l.city} · {l.google_rating ? '⭐ '+l.google_rating : 'No rating'} {l.review_count ? '('+l.review_count+' reviews)' : ''}</div>
                    </div>
                    {/* Actions */}
                    <div style={{display:'flex',gap:8,flexShrink:0}}>
                      <a href={API+'/report/'+l.id} target="_blank" rel="noreferrer" style={{padding:'8px 16px',borderRadius:8,background:'linear-gradient(135deg,#0F172A,#1E293B)',color:'#fff',fontSize:12,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>
                        View Report
                      </a>
                      <button onClick={()=>{navigator.clipboard.writeText(window.location.origin+'/report/'+l.id);alert('Report link copied!')}} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',fontSize:12,cursor:'pointer',color:'#64748B'}}>
                        Copy Link
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>}

        {/* SETTINGS */}
        {/* {page==='settings' && <div style={{maxWidth:600}}>
          <div className="card" style={{marginBottom:20}}><div className="card-header"><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#F59E0B'}} /><span style={{fontSize:14,fontWeight:600}}>API Configuration</span></div><div className="card-body"><div style={{marginBottom:16}}><label style={{fontSize:12,color:'#64748B',display:'block',marginBottom:6}}>Anthropic API Key</label><input className="input" type="password" defaultValue="sk-ant-•••••••••" disabled /></div><div style={{marginBottom:16}}><label style={{fontSize:12,color:'#64748B',display:'block',marginBottom:6}}>Google Maps API Key</label><input className="input" type="password" defaultValue="AIza•••••••••" disabled /></div><div><label style={{fontSize:12,color:'#64748B',display:'block',marginBottom:6}}>Resend API Key</label><input className="input" type="password" defaultValue="re_•••••••••" disabled /></div><p style={{fontSize:11,color:'#64748B',marginTop:12}}>Edit these in your .env file and restart the server.</p></div></div>
          <div className="card"><div className="card-header"><span style={{fontSize:14,color:'#4f46e5'}}>●</span><span style={{fontSize:14,fontWeight:600}}>Email Configuration</span></div><div className="card-body"><div style={{marginBottom:16}}><label style={{fontSize:12,color:'#64748B',display:'block',marginBottom:6}}>From Email</label><input className="input" defaultValue={user.email} /></div><div><label style={{fontSize:12,color:'#64748B',display:'block',marginBottom:6}}>Agency Name</label><input className="input" defaultValue="Web Agency" /></div><button className="btn btn-primary" style={{marginTop:16}}>Save Settings</button></div></div>
        </div>} */}
        {/* SETTINGS */}
        {page==='settings' &&
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>

          {/* ── Profile ── */}
          <div className="settings-card">
            <h3><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#F97316',marginRight:8,verticalAlign:'middle'}} />Profile</h3>
            <div className="settings-form">
              <div>
                <label>Name</label>
                <input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} />
              </div>
              <div>
                <label>Email</label>
                <input value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} />
              </div>
              <div>
                <label>Company Name</label>
                <input value={profile.company} onChange={e=>setProfile({...profile,company:e.target.value})} />
              </div>
              <button className="btn btn-primary" onClick={saveProfile}>Save Changes</button>
            </div>
          </div>

          {/* ── Usage & Limits ── */}
          <div className="settings-card">
            <h3><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#0EA5E9',marginRight:8,verticalAlign:'middle'}} />Usage & Limits</h3>
            <div style={{marginBottom:18,padding:'10px 14px',borderRadius:10,background:usageSummary?.plan==='admin'?'#D1FAE5':usageSummary?.plan==='trial'?'#FFF7ED':'#EFF6FF',border:'1px solid',borderColor:usageSummary?.plan==='admin'?'#6EE7B7':usageSummary?.plan==='trial'?'#FED7AA':'#BFDBFE',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>Plan: {usageSummary?.plan_label||'Free Trial'}</span>
              {usageSummary?.plan==='trial' && <span style={{fontSize:11,fontWeight:600,color:'#9A3412',background:'#FED7AA',padding:'2px 8px',borderRadius:6}}>{usageSummary?.trial_days_left||0} days left</span>}
            </div>
            {[
              {label:'Leads',used:usageSummary?.leads?.used||0,limit:usageSummary?.leads?.limit||15},
              {label:'AI Chats',used:usageSummary?.ai_chats?.used||0,limit:usageSummary?.ai_chats?.limit||3},
              {label:'Demo Sites',used:usageSummary?.demos?.used||0,limit:usageSummary?.demos?.limit||2},
              {label:'Emails',used:usageSummary?.emails?.used||0,limit:usageSummary?.emails?.limit||5},
            ].map(item=>(
              <div key={item.label} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,color:'#475569',marginBottom:4}}>
                  <span>{item.label}</span>
                  <span style={{color:'#94A3B8'}}>{item.used.toLocaleString()} / {item.limit.toLocaleString()}</span>
                </div>
                <div style={{height:6,borderRadius:3,background:'#F1F5F9',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:item.used/item.limit>0.8?'#EF4444':'#F97316',width:Math.min(100,(item.used/item.limit)*100)+'%',transition:'width .3s ease'}} />
                </div>
              </div>
            ))}
            {usageSummary?.plan!=='admin' && usageSummary?.plan!=='agency' && (
              <button className="btn btn-primary" style={{marginTop:8}} onClick={()=>setShowPricing(true)}>Upgrade Plan</button>
            )}
          </div>

          {/* ── Agency Branding ── */}
          <div className="settings-card">
            <h3><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#8B5CF6',marginRight:8,verticalAlign:'middle'}} />Agency Branding</h3>
            <div className="settings-form">
              <div>
                <label>Agency Name</label>
                <input value={branding.agency} onChange={e=>setBranding({...branding,agency:e.target.value})} />
              </div>
              <div>
                <label>Email Signature</label>
                <textarea rows={4} style={{width:'100%',padding:'10px 13px',borderRadius:9,border:'1.5px solid #CBD5E1',background:'#fff',color:'#0F172A',fontSize:13,fontFamily:"'Inter',sans-serif",outline:'none',resize:'vertical'}} value={branding.signature} onChange={e=>setBranding({...branding,signature:e.target.value})} />
              </div>
              <button className="btn btn-primary" onClick={saveBranding}>Save Branding</button>
            </div>
          </div>

          {/* ── Billing & Subscription ── */}
          <div className="settings-card">
            <h3><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#10B981',marginRight:8,verticalAlign:'middle'}} />Billing & Subscription</h3>
            <div style={{marginBottom:18,padding:'12px 16px',borderRadius:10,background:'#F8FAFC',border:'1px solid #E2E8F0'}}>
              <div style={{fontSize:11,fontWeight:600,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:4}}>Current Plan</div>
              <div style={{fontSize:18,fontWeight:800,color:'#0F172A',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{usageSummary?.plan_label||'Free Trial'}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:18}}>
              {[
                {icon:'✓',text:(usageSummary?.leads?.limit||15).toLocaleString()+' Leads Included'},
                {icon:'✓',text:(usageSummary?.ai_chats?.limit||3).toLocaleString()+' AI Chats Included'},
                {icon:'✓',text:(usageSummary?.demos?.limit||2).toLocaleString()+' Demo Sites Included'},
                {icon:usageSummary?.plan==='admin'?'✓':'→',text:usageSummary?.plan==='admin'?'Unlimited admin access':usageSummary?.plan==='agency'?'Unlimited agency access':'Upgrade to unlock more'},
              ].map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#334155'}}>
                  <span style={{fontSize:15}}>{f.icon}</span>{f.text}
                </div>
              ))}
            </div>
            {usageSummary?.plan!=='admin' && usageSummary?.plan!=='agency' && (
              <button className="btn btn-primary" onClick={()=>setShowPricing(true)}>View Plans</button>
            )}
          </div>

          {/* ── Support ── */}
          <div className="settings-card" style={{gridColumn:'1 / -1'}}>
            <h3><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#64748B',marginRight:8,verticalAlign:'middle'}} />Support</h3>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:'#0F172A',marginBottom:4}}>IOWEB3 Technologies</div>
                <div style={{fontSize:13,color:'#64748B'}}>sales@ioweb3.io</div>
                <div style={{fontSize:12,color:'#94A3B8',marginTop:4}}>Average response time: &lt; 24 hrs</div>
              </div>
              <button className="btn btn-primary" onClick={()=>window.open('mailto:sales@ioweb3.io?subject=LeadEmpire Support')}>Contact Support</button>
            </div>
          </div>

          </div>
          }
        </main>
      </div>
    </div>
  )
}