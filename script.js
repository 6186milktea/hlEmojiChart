const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 600; canvas.height = 600;

let availableIcons = [];
let icons = [];
let selectedIcon = null;
let showWindow = false;
let isEraseMode = false;
let isInitialized = false; 
let currentPage = 0;
const iconsPerPage = 12;
let listFilter = {};
const SNAP = 5;

const win = { x: 100, y: 100, w: 400, h: 400, title: "➕✨" };

async function loadData() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error('404');
        const data = await response.json();
        availableIcons = data.availableIcons;
        
        const container = document.getElementById('filter-container');
        data.categories.forEach(cat => {
            const isDefaultOn = (cat.id !== "na");
            listFilter[cat.id] = isDefaultOn; 
            const label = document.createElement('label');
            label.className = 'switch';
            label.innerHTML = `
                <input type="checkbox" ${isDefaultOn ? 'checked' : ''} onchange="updateFilter('${cat.id}')">
                <span class="slider"></span>
                <span class="label-text" style="font-size:20px">${cat.label}</span>`;
            container.appendChild(label);
        });
        
        loadFromURL();
        isInitialized = true; 
        draw();
    } catch (e) { 
        console.error("Load failed", e);
        showToast("❌📁");
    }
}

function updateFilter(type) {
    listFilter[type] = !listFilter[type];
    currentPage = 0;
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 1;
    for (let i = 0; i <= 600; i += 50) {
        ctx.beginPath(); ctx.strokeStyle = (i === 300) ? "#444" : "#eee";
        ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(600, i); ctx.stroke();
    }

    icons.forEach(icon => drawEmoji(icon.emoji, icon.x, icon.y, 48, 18));
    drawLabels();

    const title = document.getElementById('chartTitle').value;
    if(title) {
        ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        const tw = ctx.measureText(title).width;
        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(300 - (tw/2+10), 10, tw+20, 40);
        ctx.fillStyle = "#333"; ctx.fillText(title, 300, 15);
    }

    if (showWindow) drawWindow();
    document.getElementById('addBtn').classList.toggle('active', showWindow);
    if (isInitialized) syncURL();
}

function drawEmoji(emoji, x, y, fontSize, overlap) {
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", Arial`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let segments = Array.from(emoji);
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const segmenter = new Intl.Segmenter("ja-JP", { granularity: "grapheme" });
            segments = Array.from(segmenter.segment(emoji)).map(s => s.segment);
        } catch (e) {}
    }
    
    if (segments.length > 1) {
        const step = fontSize - overlap;
        const startX = x - (step * (segments.length - 1)) / 2;
        segments.forEach((c, i) => ctx.fillText(c, startX + i * step, y));
    } else { ctx.fillText(emoji, x, y); }
}

function drawLabels() {
    const config = [
        { id: 'labelYpos', x: 300, y: 75, align: 'center' },
        { id: 'labelYneg', x: 300, y: 575, align: 'center' },
        { id: 'labelXpos', x: 585, y: 280, align: 'right' },
        { id: 'labelXneg', x: 15, y: 280, align: 'left' }
    ];
    config.forEach(l => {
        const txt = document.getElementById(l.id).value;
        if(!txt) return;
        ctx.font = "bold 16px sans-serif";
        const w = ctx.measureText(txt).width;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        let rx = l.x - (l.align==='center' ? w/2+5 : (l.align==='right' ? w+5 : -5));
        ctx.fillRect(rx, l.y-12, w+10, 24);
        ctx.fillStyle = "#333"; ctx.textAlign = l.align; ctx.fillText(txt, l.x, l.y);
    });
}

function drawWindow() {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0,0,600,600);
    ctx.fillStyle = "white"; ctx.fillRect(win.x, win.y, win.w, win.h);
    
    const inactiveFilters = Object.keys(listFilter).filter(k => !listFilter[k]);
    const filtered = availableIcons.filter(item => {
        const types = Array.isArray(item.type) ? item.type : [item.type];
        return !types.some(t => inactiveFilters.includes(t));
    });

    const maxPage = Math.max(0, Math.ceil(filtered.length / iconsPerPage) - 1);
    ctx.fillStyle = "#2c3e50"; ctx.fillRect(win.x, win.y, win.w, 45);
    ctx.fillStyle = "white"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${win.title} (${filtered.length})`, win.x+200, win.y+30);

    const pageIcons = filtered.slice(currentPage*iconsPerPage, (currentPage+1)*iconsPerPage);
    pageIcons.forEach((item, i) => {
        const ix = win.x + 55 + (i%4)*95, iy = win.y + 90 + Math.floor(i/4)*95;
        ctx.fillStyle = "#f8f9fa"; ctx.fillRect(ix-40, iy-40, 80, 80);
        drawEmoji(item.emoji, ix, iy+5, 45, 25); 
    });

    ctx.fillStyle = "#f1f3f5"; ctx.fillRect(win.x, win.y+350, win.w, 50);
    ctx.fillStyle = "#2c3e50"; ctx.font = "bold 18px sans-serif";
    if(currentPage > 0) ctx.fillText("⬅️", win.x+70, win.y+385);
    if(currentPage < maxPage) ctx.fillText("➡️", win.x+330, win.y+385);
}

function showToast(msg) {
    const old = document.querySelector('.toast'); if(old) old.remove();
    const t = document.createElement('div'); t.className='toast'; t.innerText=msg;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.add('fade-out'); setTimeout(()=>t.remove(), 500); }, 2000);
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = 600 / rect.width;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * scale, y: (cy - rect.top) * scale };
}

function handleDown(mx, my) {
    if(showWindow) {
        if (mx < win.x || mx > win.x + win.w || my < win.y || my > win.y + win.h) { showWindow = false; return; }
        const inactiveFilters = Object.keys(listFilter).filter(k => !listFilter[k]);
        const filtered = availableIcons.filter(item => {
            const types = Array.isArray(item.type) ? item.type : [item.type];
            return !types.some(t => inactiveFilters.includes(t));
        });
        if(my > win.y + 350) {
            const maxPage = Math.max(0, Math.ceil(filtered.length / iconsPerPage) - 1);
            if(mx < win.x + 200) currentPage = Math.max(0, currentPage-1);
            else if(currentPage < maxPage) currentPage++;
            return;
        }
        const pageIcons = filtered.slice(currentPage*iconsPerPage, (currentPage+1)*iconsPerPage);
        pageIcons.forEach((item, i) => {
            const ix = win.x + 55 + (i%4)*95, iy = win.y + 90 + Math.floor(i/4)*95;
            if(mx > ix-40 && mx < ix+40 && my > iy-40 && my < iy+40) {
                icons.push({ id: Date.now()+Math.random(), iconId: item.id, x: 300, y: 300, emoji: item.emoji });
                showWindow = false;
            }
        });
    } else {
        const idx = icons.findLastIndex(i => Math.sqrt((mx-i.x)**2 + (my-i.y)**2) < 35);
        if(idx !== -1) {
            if(isEraseMode) { icons.splice(idx, 1); draw(); }
            else { selectedIcon = icons[idx]; }
        }
    }
}

canvas.addEventListener('mousedown', e => { const p = getPos(e); handleDown(p.x, p.y); draw(); });
canvas.addEventListener('touchstart', e => { const p = getPos(e); handleDown(p.x, p.y); draw(); e.preventDefault(); }, {passive:false});
window.addEventListener('mousemove', e => {
    const p = getPos(e);
    if(selectedIcon) { selectedIcon.x = Math.round(p.x/SNAP)*SNAP; selectedIcon.y = Math.round(p.y/SNAP)*SNAP; draw(); }
});
window.addEventListener('touchmove', e => {
    const p = getPos(e);
    if(selectedIcon) { selectedIcon.x = Math.round(p.x/SNAP)*SNAP; selectedIcon.y = Math.round(p.y/SNAP)*SNAP; draw(); e.preventDefault(); }
}, {passive:false});
window.addEventListener('mouseup', () => selectedIcon = null);
window.addEventListener('touchend', () => selectedIcon = null);

document.getElementById('eraseModeBtn').addEventListener('click', function() {
    isEraseMode = !isEraseMode;
    this.innerText = isEraseMode ? "🧼" : "👆";
    this.classList.toggle('active', isEraseMode);
    document.body.classList.toggle('erase-active', isEraseMode);
    showToast(isEraseMode ? "🧼 ✅" : "👆 ✅");
});

document.getElementById('addBtn').addEventListener('click', () => {
    if (!showWindow && isEraseMode) {
        isEraseMode = false;
        const eb = document.getElementById('eraseModeBtn');
        eb.innerText = "👆"; eb.classList.remove('active');
        document.body.classList.remove('erase-active');
    }
    showWindow = !showWindow;
    if(showWindow) currentPage = 0;
    draw();
});

let clearTimer = null;
document.getElementById('clearBtn').addEventListener('click', function() {
    const btn = this;
    if (!btn.classList.contains('confirm-active')) {
        btn.classList.add('confirm-active');
        btn.innerText = "❓⚠️🔥💣🔥⚠️❓";
        clearTimeout(clearTimer);
        clearTimer = setTimeout(() => { btn.classList.remove('confirm-active'); btn.innerText = "🔥💣🔥"; }, 3000);
    } else {
        icons = []; btn.classList.remove('confirm-active'); btn.innerText = "🔥💣🔥";
        showToast("🧹✨"); draw();
    }
});

document.getElementById('shareBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => showToast("🔗📋 ✨🏷️"));
});
document.getElementById('saveBtn').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = canvas.toDataURL(); a.download = '📊.png'; a.click();
    showToast("💾🖼️ ✅");
});

function syncURL() {
    try {
        const data = {
            t: document.getElementById('chartTitle').value,
            l: ["labelYpos", "labelYneg", "labelXpos", "labelXneg"].map(id => document.getElementById(id).value),
            i: icons.map(icon => `${icon.iconId},${icon.x/SNAP},${icon.y/SNAP}`).join(';')
        };
        const jsonStr = JSON.stringify(data);
        const uint8array = new TextEncoder().encode(jsonStr);
        const base64 = btoa(String.fromCharCode(...uint8array));
        const newURL = window.location.pathname + "?d=" + base64;
        window.history.replaceState(null, '', newURL);
    } catch (e) {}
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('d');
    if (!d) return;
    try {
        const binary = atob(d);
        const uint8array = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
        const jsonStr = new TextDecoder().decode(uint8array);
        const data = JSON.parse(jsonStr);
        if (data.t) document.getElementById('chartTitle').value = data.t;
        const ids = ["labelYpos", "labelYneg", "labelXpos", "labelXneg"];
        if (data.l) ids.forEach((id, i) => document.getElementById(id).value = data.l[i] || "");
        if (data.i && availableIcons.length > 0) {
            icons = data.i.split(';').map(str => {
                const p = str.split(',');
                const master = availableIcons.find(a => String(a.id) === String(p[0]));
                return master ? { id: Math.random(), iconId: p[0], emoji: master.emoji, x: p[1]*SNAP, y: p[2]*SNAP } : null;
            }).filter(i => i !== null);
        }
    } catch (e) { console.error("URL Load Error", e); }
}

document.getElementById('exportBtn').addEventListener('click', () => {
    const data = { title: document.getElementById('chartTitle').value, icons: icons, labels: ["labelYpos", "labelYneg", "labelXpos", "labelXneg"].map(id => document.getElementById(id).value) };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {type: 'application/json'})); a.download = 'chart.json'; a.click();
});
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', e => {
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const d = JSON.parse(ev.target.result);
            document.getElementById('chartTitle').value = d.title || "";
            ["labelYpos", "labelYneg", "labelXpos", "labelXneg"].forEach((id, i) => document.getElementById(id).value = d.labels[i] || "");
            icons = d.icons.map(icon => {
                const master = availableIcons.find(a => String(a.id) === String(icon.iconId));
                return { ...icon, emoji: master ? master.emoji : icon.emoji };
            });
            draw();
        } catch(e) { showToast("❌"); }
    };
    reader.readAsText(e.target.files[0]);
});

loadData();