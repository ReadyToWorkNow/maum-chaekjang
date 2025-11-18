// Child ID lookup: fetch from DB and autofill the info form
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('childIdLookupBtn');
    var input = document.getElementById('childIdInput');
    var msg = document.getElementById('childIdLookupMsg');
    if(!btn || !input) return;

    function setMsg(text, ok){
      if(!msg) return;
      msg.textContent = text || '';
      msg.style.color = ok ? '#2e7d32' : '#d32f2f';
    }

    function setVal(id, val){ var el=document.getElementById(id); if(el){ el.value = val==null?'':val; } }

    async function fetchChildById(id){
      // Try abused_child first
      let res = await fetch('/api/abused-child/' + encodeURIComponent(id));
      if(res.status === 404 || res.status === 501){
        // Fallback to children
        res = await fetch('/api/children/' + encodeURIComponent(id));
      }
      if(!res.ok) {
        const body = await res.json().catch(()=>({}));
        throw new Error(body.error || ('HTTP ' + res.status));
      }
      return res.json();
    }

    btn.addEventListener('click', async function(){
      const id = (input.value||'').trim();
      if(!id){ setMsg('아이 번호를 입력하세요.', false); return; }
      setMsg('조회 중...', true);
      try{
        const child = await fetchChildById(id);
        // Autofill fields
        setVal('childName', child.name);
        setVal('childAge', child.age);
        setVal('abuseType', child.abuse_type);
        // Optional: use note or recovery_stage as situation if present
        if(child.note){ setVal('childSituation', child.note); }
        else if(child.recovery_stage){ setVal('childSituation', child.recovery_stage); }
        setMsg('불러왔어요: ' + (child.name || ('#' + id)), true);
      }catch(e){
        setMsg('입력하신 번호는 없는 번호입니다.', false);
      }
    });
  });
})();
