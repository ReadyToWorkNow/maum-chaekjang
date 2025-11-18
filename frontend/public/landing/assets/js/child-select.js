// Load children to dropdown and autofill the info form
(function () {
  document.addEventListener('DOMContentLoaded', async function () {
    const select = document.getElementById('childSelect');
    if (!select) return;

    try {
      const res = await fetch('/api/children');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      const items = data.items || [];
      // Fill options
      select.innerHTML = '<option value="">등록된 아이 선택(선택)</option>' +
        items.map(it => `<option value="${it.child_id}">#${it.child_id} ${it.name} (${it.age})</option>`).join('');

      select.addEventListener('change', function () {
        const id = this.value;
        if (!id) return;
        const child = items.find(x => String(x.child_id) === String(id));
        if (!child) return;
        // Autofill
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
        setVal('childName', child.name);
        setVal('childAge', child.age);
        setVal('abuseType', child.abuse_type);
        setVal('childSituation', child.note || child.recovery_stage || '');
        setVal('childInterests', '동물, 음악, 미술');
      });
    } catch (e) {
      // ignore quietly on failure
      // console.warn('아이 목록 로드 실패:', e);
    }
  });
})();

