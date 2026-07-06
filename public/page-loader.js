(function(){
  // Create splash overlay
  var overlay = document.createElement('div');
  overlay.id = 'page-loader';
  overlay.innerHTML = '<div style="position:fixed;inset:0;z-index:99999;background:#F7F7F7;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Inter,sans-serif;transition:opacity .38s ease">' +
    '<div style="position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(0,0,0,.05) 1px,transparent 1px);background-size:28px 28px"></div>' +
    '<div style="position:absolute;top:28%;left:50%;transform:translateX(-50%);width:480px;height:280px;pointer-events:none;background:radial-gradient(ellipse,rgba(80,0,179,.08) 0%,transparent 70%)"></div>' +
    '<div style="position:relative;z-index:1;text-align:center">' +
      '<div style="margin:0 auto 20px;animation:lhPop .5s cubic-bezier(.34,1.56,.64,1) both">' +
        '<img src="/new-logo.png" alt="LeadEmpire" style="height:100px;width:auto;object-fit:contain;display:block">' +
      '</div>' +
      '<div style="font-size:13px;color:#94A3B8;margin-bottom:32px;animation:lhUp .4s ease .25s both">Build Your Empire, One Lead at a Time</div>' +
      '<div style="width:200px;height:4px;background:#E2E8F0;border-radius:99px;overflow:hidden;margin:0 auto 14px;animation:lhUp .4s ease .3s both">' +
        '<div id="pl-bar" style="height:100%;border-radius:99px;background:linear-gradient(90deg,#5000B3,#3D008A);width:0%;transition:width .45s ease"></div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;justify-content:center;animation:lhUp .4s ease .35s both">' +
        '<div style="width:6px;height:6px;border-radius:50%;background:#5000B3;opacity:.3;animation:lhDot 1.2s ease 0s infinite"></div>' +
        '<div style="width:6px;height:6px;border-radius:50%;background:#5000B3;opacity:.3;animation:lhDot 1.2s ease .2s infinite"></div>' +
        '<div style="width:6px;height:6px;border-radius:50%;background:#5000B3;opacity:.3;animation:lhDot 1.2s ease .4s infinite"></div>' +
      '</div>' +
    '</div></div>';

  // Add keyframe animations
  var style = document.createElement('style');
  style.textContent = '@keyframes lhPop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}@keyframes lhUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes lhDot{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}';
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Animate progress bar
  var bar = document.getElementById('pl-bar');
  setTimeout(function(){ bar.style.width = '35%'; }, 100);
  setTimeout(function(){ bar.style.width = '70%'; }, 400);
  setTimeout(function(){ bar.style.width = '95%'; }, 700);
  setTimeout(function(){
    bar.style.width = '100%';
    setTimeout(function(){
      overlay.firstChild.style.opacity = '0';
      setTimeout(function(){ overlay.remove(); style.remove(); }, 400);
    }, 200);
  }, 1000);
})();
