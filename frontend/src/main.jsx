import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

function Root() {
  const [appReady, setAppReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Animate progress bar then dismiss splash automatically
    setTimeout(() => setProgress(35), 100)
    setTimeout(() => setProgress(70), 500)
    setTimeout(() => setProgress(95), 900)
    setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setFadeOut(true)
        setTimeout(() => setAppReady(true), 380)
      }, 200)
    }, 1300)
  }, [])

  if (appReady) return <App />

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#F5F6F8',
      display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column',
      opacity: fadeOut ? 0 : 1,
      transition:'opacity .38s ease',
      fontFamily:"'Inter', sans-serif",
    }}>
      {/* Dot grid */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        backgroundImage:'radial-gradient(circle,rgba(0,0,0,.05) 1px,transparent 1px)',
        backgroundSize:'28px 28px'}}/>
      {/* Orange glow */}
      <div style={{position:'absolute',top:'28%',left:'50%',transform:'translateX(-50%)',
        width:480,height:280,pointerEvents:'none',
        background:'radial-gradient(ellipse,rgba(249,115,22,.08) 0%,transparent 70%)'}}/>

      <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
        {/* Logo */}
        <div style={{
          width:72,height:72,borderRadius:20,margin:'0 auto 20px',
          background:'linear-gradient(135deg,#F97316,#EA580C)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 8px 32px rgba(249,115,22,.28)',
          animation:'lhPop .5s cubic-bezier(.34,1.56,.64,1) both',
        }}>
          <img src="/ai-lead-machine-logo.svg" alt="L"
            style={{width:48,height:48,objectFit:'contain'}}
            onError={e=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex'}}
          />
          <span style={{display:'none',color:'#fff',fontSize:28,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>L</span>
        </div>

        <div style={{fontFamily:"'Plus Jakarta Sans','Inter',sans-serif",fontSize:26,
          fontWeight:800,color:'#0F172A',letterSpacing:'-.02em',marginBottom:5,
          animation:'lhUp .4s ease .15s both'}}>
          LeadEmpire
        </div>
        <div style={{fontSize:13,color:'#94A3B8',marginBottom:32,
          animation:'lhUp .4s ease .25s both'}}>
          Build Your Empire, One Lead at a Time
        </div>

        {/* Progress bar */}
        <div style={{width:200,height:4,background:'#E2E8F0',borderRadius:99,
          overflow:'hidden',margin:'0 auto 14px',animation:'lhUp .4s ease .3s both'}}>
          <div style={{height:'100%',borderRadius:99,
            background:'linear-gradient(90deg,#F97316,#EA580C)',
            width:progress+'%',transition:'width .45s ease'}}/>
        </div>

        {/* Dots */}
        <div style={{display:'flex',gap:6,justifyContent:'center',animation:'lhUp .4s ease .35s both'}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#F97316',
              opacity:.3,animation:`lhDot 1.2s ease ${i*.2}s infinite`}}/>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes lhPop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
        @keyframes lhUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lhDot{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
      `}</style>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Root /></StrictMode>
)