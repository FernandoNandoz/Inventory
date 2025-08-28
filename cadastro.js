
// Painel de gerenciamento da fila offline
function atualizarPainelOffline() {
    const painel = document.getElementById('painelOffline');
    if (!painel) return;
    let fila = [];
    try {
        fila = JSON.parse(localStorage.getItem('filaInventario') || '[]');
    } catch (e) {}
    if (!fila.length) {
        painel.style.display = 'none';
        painel.innerHTML = '';
        return;
    }
    painel.style.display = '';
    painel.innerHTML = `
    <div style="background:#fff3cd;border:1px solid #ffeeba;padding:12px;border-radius:8px;">
    <strong>Cadastros pendentes (offline):</strong> ${fila.length}<br>
    <ul style="max-height:120px;overflow:auto;margin:8px 0 8px 0;padding-left:18px;">
    ${fila.map((item, idx) => `<li><b>#${item.numItem}</b> - ${item.setor || '-'} - ${item.especificacao?.slice(0,30) || ''}${item.especificacao && item.especificacao.length>30 ? '...' : ''}</li>`).join('')}
    </ul>
    <button type="button" id="btnLimparFilaOffline" style="background:#b71c1c;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;">Limpar fila</button>
    </div>
    `;
    document.getElementById('btnLimparFilaOffline').onclick = () => {
        if (confirm('Tem certeza que deseja apagar todos os cadastros pendentes?')) {
            localStorage.removeItem('filaInventario');
            atualizarPainelOffline();
        }
    };
}

// Atualiza painel sempre que a fila mudar
window.addEventListener('storage', atualizarPainelOffline);
window.addEventListener('DOMContentLoaded', atualizarPainelOffline);
setInterval(atualizarPainelOffline, 5000);


// ===== CONFIGURE AQUI A SUA URL DO APPS SCRIPT =====
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEVlymNRwoj1mAqQjvT4JJu55bf3BvB2ZwEx4HmfuGP0r2vxLASSKjoulE2jIdDydt/exec"; // troque após publicar
// ====================================================


// --- INICIALIZAÇÃO DE CAMPOS E SETOR FIXO ---
const numItemEl = document.getElementById('numItem');
const setorEl = document.getElementById('setor');
const setorSelecionado = localStorage.getItem('setorSelecionado');
if (!setorSelecionado) {
    window.location.href = 'index.html';
} else if (setorEl) {
    setorEl.textContent = setorSelecionado;
}
const rpContainer = document.getElementById('rpContainer');
const form = document.getElementById('inventarioForm');
const btnSalvar = document.getElementById('btnSalvar');
const btnLimpar = document.getElementById('btnLimpar');
const statusMsg = document.getElementById('statusMsg');
const tbody = document.querySelector('#tabelaItens tbody');


// --- USO LOCAL E CACHE POR SETOR ---
let contadorItem = parseInt(localStorage.getItem('contadorItem') || '1', 10);
numItemEl.value = contadorItem;

// Utiliza cache por setor
function getCacheSetorAtual() {
    const setor = setorEl.value || '';
    if (!setor) return [];
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem('filaCadastroSetor') || '{}'); } catch {}
    return cache[setor] || [];
}

function setCacheSetorAtual(lista) {
    const setor = setorEl.value || '';
    if (!setor) return;
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem('filaCadastroSetor') || '{}'); } catch {}
    cache[setor] = lista;
    localStorage.setItem('filaCadastroSetor', JSON.stringify(cache));
}

function limparCacheSetorAtual() {
    const setor = setorEl.value || '';
    if (!setor) return;
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem('filaCadastroSetor') || '{}'); } catch {}
    delete cache[setor];
    localStorage.setItem('filaCadastroSetor', JSON.stringify(cache));
}

// Botão para enviar para planilha
const btnEnviarPlanilha = document.createElement('button');
btnEnviarPlanilha.type = 'button';
btnEnviarPlanilha.textContent = 'Enviar para planilha';
btnEnviarPlanilha.className = 'btn-add-unidade';
btnEnviarPlanilha.style.display = 'none';
btnEnviarPlanilha.style.marginBottom = '12px';
form.parentNode.insertBefore(btnEnviarPlanilha, form.nextSibling);

function atualizarVisibilidadeBtnEnviar() {
    const pendentes = getCacheSetorAtual();
    btnEnviarPlanilha.style.display = (pendentes.length > 0) ? 'block' : 'none';
}

// Atualiza tabela de itens cadastrados localmente (por setor)
function renderTabelaPendentes() {
    tbody.innerHTML = '';
    const pendentes = getCacheSetorAtual();
    pendentes.forEach(item => adicionarNaTabela(item));
}

// Ao carregar, mostra os pendentes do setor atual
if (setorEl) {
    atualizarVisibilidadeBtnEnviar();
    renderTabelaPendentes();
}





function makeRPBlock(i) {
    const block = document.createElement('div');
    block.className = 'rp-block';
    block.innerHTML = `
    <div class="rp-block-header">
      <h4>Unidade ${i}</h4>
      <button type="button" class="btn-remove-unidade" title="Remover unidade" aria-label="Remover unidade">&times;</button>
    </div>
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
    <button type="button" class="btn-capturar">Capturar Foto</button>
    <input type="file" name="foto_${i}" accept="image/*" capture="environment" style="display:none" required />
    <div class="preview"></div>
    `;

    const fileInput = block.querySelector('input[type=file]');
    const previewDiv = block.querySelector('.preview');
    const btnCapturar = block.querySelector('.btn-capturar');
    const btnRemove = block.querySelector('.btn-remove-unidade');

    btnRemove.addEventListener('click', () => {
        // Só permite remover se houver mais de um bloco
        if (rpContainer.querySelectorAll('.rp-block').length > 1) {
            block.remove();
            // Atualiza os índices e títulos dos blocos restantes
            [...rpContainer.querySelectorAll('.rp-block')].forEach((b, idx) => {
                const h4 = b.querySelector('h4');
                if (h4) h4.textContent = `Unidade ${idx + 1}`;
                // Atualiza os names dos campos
                const rpInput = b.querySelector('input[type=text]');
                if (rpInput) rpInput.name = `rp_${idx + 1}`;
                const estadoSel = b.querySelector('select');
                if (estadoSel) estadoSel.name = `estado_${idx + 1}`;
                const fotoInput = b.querySelector('input[type=file]');
                if (fotoInput) fotoInput.name = `foto_${idx + 1}`;
            });
        }
    });

    btnCapturar.addEventListener('click', () => {
        // ...existing code...
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = 0;
        modal.style.left = 0;
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.8)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = 9999;

        modal.innerHTML = `
            <div style="background:#fff;padding:10px;border-radius:8px;max-width:95vw;">
                <video autoplay playsinline style="width:400px;max-width:90vw;"></video>
                <br>
                <button type="button" class="tirar-foto">Tirar Foto</button>
                <button type="button" class="fechar-modal">Cancelar</button>
            </div>
        `;

        document.body.appendChild(modal);

        const video = modal.querySelector('video');
        const btnTirarFoto = modal.querySelector('.tirar-foto');
        const btnFechar = modal.querySelector('.fechar-modal');
        let stream = null;

        // ...existing code...
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(s => {
                stream = s;
                video.srcObject = stream;
            })
            .catch(() => {
                alert('Não foi possível acessar a câmera.');
                document.body.removeChild(modal);
            });

        btnTirarFoto.addEventListener('click', () => {
            // ...existing code...
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(blob => {
                // ...existing code...
                const file = new File([blob], `foto_rp_${i}.jpg`, { type: 'image/jpeg' });
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                previewDiv.innerHTML = '';
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                previewDiv.appendChild(img);
                if (stream) stream.getTracks().forEach(t => t.stop());
                document.body.removeChild(modal);
            }, 'image/jpeg', 0.95);
        });

        btnFechar.addEventListener('click', () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
            document.body.removeChild(modal);
        });
    });

    // campo estadoPadraoEl removido
    return block;
}


// Botão para adicionar unidade
const btnAddUnidade = document.createElement('button');
btnAddUnidade.type = 'button';
btnAddUnidade.textContent = 'Adicionar Unidade';
btnAddUnidade.className = 'btn-add-unidade-addUnidade';
rpContainer.after(btnAddUnidade);

function addRPBlock() {
    const idx = rpContainer.querySelectorAll('.rp-block').length + 1;
    rpContainer.appendChild(makeRPBlock(idx));
}

function resetRPBlocks() {
    rpContainer.innerHTML = '';
    addRPBlock();
}

btnAddUnidade.addEventListener('click', addRPBlock);

resetRPBlocks();

function fileToBase64(file){
    return new Promise((resolve,reject)=>{
    if(!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result); // dataURL
    reader.onerror = reject;
    reader.readAsDataURL(file);
    });
}

async function coletarUnidadesEmBase64(){
    const unidades = [];
    const blocos = rpContainer.querySelectorAll('.rp-block');
    for(let i=0;i<blocos.length;i++){
        const idx = i+1;
        const rp = form.querySelector(`[name=rp_${idx}]`).value.trim();
        const estado = form.querySelector(`[name=estado_${idx}]`).value;
        const fotoFile = form.querySelector(`[name=foto_${idx}]`).files[0] || null;
        const fotoB64 = await fileToBase64(fotoFile);
        unidades.push({ rp, estado, fotos: fotoB64 ? [fotoB64] : [] });
    }
    return unidades;
}

function adicionarNaTabela(local){
    const { numItem, setor, especificacao, unidades } = local;
    const quantidade = (unidades || []).length;
    const li = (unidades || []).map(u => {
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
    const setor = setorEl.value.trim();
    const especificacao = document.getElementById('especificacao').value.trim();
    const quantidade = rpContainer.querySelectorAll('.rp-block').length;

    // coleta base64 e também gera thumbs locais para a tabela
    btnSalvar.disabled = true; btnSalvar.textContent = 'Salvando...';
    try{
        const unidades = await coletarUnidadesEmBase64();
        // criar thumbs locais
        for(let i=1;i<=quantidade;i++){
            const file = form.querySelector(`[name=foto_${i}]`).files[0] || null;
            const url = file ? URL.createObjectURL(file) : null;
            unidades[i-1]._thumbsHTML = url ? `<img src="${url}" alt="Etiqueta">` : '';
        }

        const payload = { numItem, setor, especificacao, unidades };

        // Salva no cache do setor
        let lista = getCacheSetorAtual();
        lista.push(payload);
        setCacheSetorAtual(lista);
        // Memoriza setor selecionado
        if (setor) {
            localStorage.setItem('setorSelecionado', setor);
        }
        statusMsg.textContent = 'Cadastro salvo localmente para o setor. Envie para a planilha ao finalizar.';

        // Atualiza tabela e botão
        renderTabelaPendentes();
        atualizarVisibilidadeBtnEnviar();

        // incrementa contador, salva no localStorage e reseta
        contadorItem++;
        localStorage.setItem('contadorItem', contadorItem);
        numItemEl.value = contadorItem;
        form.reset(); resetRPBlocks();
    } catch(err){
        console.error(err);
        statusMsg.textContent = 'Erro ao salvar. Tente novamente.';
    } finally {
        btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar';
    }
});

    // Função para enviar todos os cadastros do setor atual para o Sheets
    async function enviarTodosParaPlanilha() {
        const setor = setorEl.value || '';
        if (!setor) {
            statusMsg.textContent = 'Selecione um setor para enviar.';
            return;
        }
        const lista = getCacheSetorAtual();
        if (!lista.length) {
            statusMsg.textContent = 'Nenhum cadastro pendente para este setor.';
            return;
        }
        btnEnviarPlanilha.disabled = true;
        btnEnviarPlanilha.textContent = 'Enviando...';
        let enviados = 0;
        for (let i = 0; i < lista.length; i++) {
            try {
                await fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lista[i])
                });
                enviados++;
            } catch (e) {
                break;
            }
        }
        if (enviados > 0) {
            limparCacheSetorAtual();
            renderTabelaPendentes();
            atualizarVisibilidadeBtnEnviar();
            statusMsg.textContent = 'Todos os cadastros do setor enviados para a planilha!';
        } else {
            statusMsg.textContent = 'Erro ao enviar para a planilha. Tente novamente.';
        }
        btnEnviarPlanilha.disabled = false;
        btnEnviarPlanilha.textContent = 'Enviar para planilha';
    }

    btnEnviarPlanilha.addEventListener('click', enviarTodosParaPlanilha);
btnLimpar.addEventListener('click', ()=>{
    form.reset(); resetRPBlocks(); statusMsg.textContent = '';
    // Mantém o próximo número do item
    numItemEl.value = contadorItem;
});