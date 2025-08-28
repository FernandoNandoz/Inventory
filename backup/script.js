// ===== CONFIGURE AQUI A SUA URL DO APPS SCRIPT =====
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzPoFAAKTx1e1AFYRWOh2exNbaF7FAjWsiIFA-101EIBycxEiwUVlsKZufKqi_HKIEl/exec"; // troque após publicar
// ====================================================

let contadorItem = 1;
const numItemEl = document.getElementById('numItem');
const quantidadeEl = document.getElementById('quantidade');
const estadoPadraoEl = document.getElementById('estadoPadrao');
const rpContainer = document.getElementById('rpContainer');
const form = document.getElementById('inventarioForm');
const btnSalvar = document.getElementById('btnSalvar');
const btnLimpar = document.getElementById('btnLimpar');
const statusMsg = document.getElementById('statusMsg');
const tbody = document.querySelector('#tabelaItens tbody');

numItemEl.value = contadorItem;

function makeRPBlock(i){
    const block = document.createElement('div');
    block.className = 'rp-block';
    block.innerHTML = `
    <h4>Unidade ${i}</h4>
    <label>Nº RP</label>
    <input type="text" name="rp_${i}" required />
    <label>Estado Atual</label>
    <select name="estado_${i}" required>
        <option value="">Selecione</option>
        <option>Novo</option>
        <option>Bom</option>
        <option>Regular</option>
        <option>Ruim</option>
        <option>Inservível</option>
    </select>
    <label>Foto da Etiqueta</label>
    <input type="file" name="foto_${i}" accept="image/*" />
    <div class="preview"></div>
    `;
    const fileInput = block.querySelector('input[type=file]');
    const previewDiv = block.querySelector('.preview');
    fileInput.addEventListener('change', (ev)=>{
    previewDiv.innerHTML = '';
    [...fileInput.files].forEach(f=>{
        const url = URL.createObjectURL(f);
        const img = document.createElement('img');
        img.src = url; previewDiv.appendChild(img);
    });
    });
    // aplica estado padrão caso selecionado
    if(estadoPadraoEl.value){
    block.querySelector(`select[name=estado_${i}]`).value = estadoPadraoEl.value;
    }
    return block;
}

function renderRPBlocks(){
    const q = Math.max(1, parseInt(quantidadeEl.value||'1',10));
    rpContainer.innerHTML = '';
    for(let i=1;i<=q;i++) rpContainer.appendChild(makeRPBlock(i));
}

quantidadeEl.addEventListener('input', renderRPBlocks);
estadoPadraoEl.addEventListener('change', ()=>{
    // reatribui rapidamente o estado para os blocos já renderizados
    [...rpContainer.querySelectorAll('select[name^=estado_]')].forEach(sel=>{
    if(estadoPadraoEl.value) sel.value = estadoPadraoEl.value;
    });
});
renderRPBlocks();

function fileToBase64(file){
    return new Promise((resolve,reject)=>{
    if(!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result); // dataURL
    reader.onerror = reject;
    reader.readAsDataURL(file);
    });
}

async function coletarUnidadesEmBase64(q){
    const unidades = [];
    for(let i=1;i<=q;i++){
    const rp = form.querySelector(`[name=rp_${i}]`).value.trim();
    const estado = form.querySelector(`[name=estado_${i}]`).value;
    const fotoFile = form.querySelector(`[name=foto_${i}]`).files[0] || null;
    const fotoB64 = await fileToBase64(fotoFile);
    unidades.push({ rp, estado, fotos: fotoB64 ? [fotoB64] : [] });
    }
    return unidades;
}

function adicionarNaTabela(local){
    const { numItem, setor, especificacao, quantidade, unidades } = local;
    const li = unidades.map(u=>{
    const thumbs = (u._thumbsHTML || '');
    return `<li><strong>RP:</strong> ${u.rp} | <strong>Estado:</strong> ${u.estado}<br/><span class="thumbs">${thumbs}</span></li>`;
    }).join('');
    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td>${numItem}</td>
    <td>${setor}</td>
    <td>${especificacao}</td>
    <td>${quantidade}</td>
    <td><ul class="detalhes-list">${li}</ul></td>`;
    tbody.appendChild(tr);
}

form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    statusMsg.textContent = '';

    const numItem = numItemEl.value;
    const setor = document.getElementById('setor').value.trim();
    const especificacao = document.getElementById('especificacao').value.trim();
    const quantidade = Math.max(1, parseInt(quantidadeEl.value||'1',10));

    // coleta base64 e também gera thumbs locais para a tabela
    btnSalvar.disabled = true; btnSalvar.textContent = 'Salvando...';
    try{
    const unidades = await coletarUnidadesEmBase64(quantidade);
    // criar thumbs locais
    for(let i=1;i<=quantidade;i++){
        const file = form.querySelector(`[name=foto_${i}]`).files[0] || null;
        const url = file ? URL.createObjectURL(file) : null;
        unidades[i-1]._thumbsHTML = url ? `<img src="${url}" alt="Etiqueta">` : '';
    }

    const payload = { numItem, setor, especificacao, quantidade, unidades };

    // envia ao Google Sheets (Apps Script)
    if(GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL.startsWith('http')){
        // dica: se quiser resposta, remova 'no-cors' e permita anônimo no Apps Script
        await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
        });
        statusMsg.textContent = 'Enviado para a Planilha (Google Apps Script).';
    } else {
        statusMsg.textContent = 'Atenção: defina GOOGLE_APPS_SCRIPT_URL para enviar à planilha.';
    }

    // adiciona na tabela local
    adicionarNaTabela(payload);

    // incrementa contador e reseta
    contadorItem++; numItemEl.value = contadorItem;
    form.reset(); renderRPBlocks();
    } catch(err){
    console.error(err);
    statusMsg.textContent = 'Erro ao salvar. Tente novamente.';
    } finally {
    btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar';
    }
});

btnLimpar.addEventListener('click', ()=>{
    form.reset(); renderRPBlocks(); statusMsg.textContent = '';
});