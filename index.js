// Configuração da URL do Apps Script
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEVlymNRwoj1mAqQjvT4JJu55bf3BvB2ZwEx4HmfuGP0r2vxLASSKjoulE2jIdDydt/exec";

const selectSetor = document.getElementById('selectSetor');
const btnEntrarCadastrar = document.getElementById('btnEntrarCadastrar');
const filtroSetor = document.getElementById('filtroSetor');
const tabelaItens = document.getElementById('tabelaItens').querySelector('tbody');
const statusMsg = document.getElementById('statusMsg');

let todosItens = [];

// Carrega setores do Sheets
async function carregarSetores() {
  try {
    const resp = await fetch(GOOGLE_APPS_SCRIPT_URL + '?pagina=setores');
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.setores)) {
        selectSetor.innerHTML = '<option value="">Selecione o setor</option>' + data.setores.map(s => `<option value="${s}">${s}</option>`).join('');
        filtroSetor.innerHTML = '<option value="">Todos os setores</option>' + data.setores.map(s => `<option value="${s}">${s}</option>`).join('');
      }
    }
  } catch {}
}

// Carrega todos os itens cadastrados do Sheets
async function carregarItens() {
  statusMsg.textContent = 'Carregando itens...';
  tabelaItens.innerHTML = '';
  try {
    const resp = await fetch(GOOGLE_APPS_SCRIPT_URL + '?pagina=inventario');
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.itens)) {
        todosItens = data.itens;
        renderTabela();
        statusMsg.textContent = '';
      } else {
        statusMsg.textContent = 'Nenhum item encontrado.';
      }
    } else {
      statusMsg.textContent = 'Erro ao buscar itens.';
    }
  } catch {
    statusMsg.textContent = 'Erro de conexão.';
  }
}

// Renderiza a tabela de itens
function renderTabela() {
  const setorFiltro = filtroSetor.value;
  tabelaItens.innerHTML = '';
  todosItens.filter(item => !setorFiltro || item.setor === setorFiltro).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.numItem || ''}</td>
      <td>${item.setor || ''}</td>
      <td>${item.especificacao || ''}</td>
      <td>${item.quantidade || ''}</td>
      <td>${item.rp || ''}</td>
      <td>${item.estado || ''}</td>
      <td>${(item.fotos || '').split(',').map(url => url && url.trim() ? `<img src="${url.trim()}" class="img-thumb" loading="lazy">` : '').join('')}</td>
    `;
    tabelaItens.appendChild(tr);
  });
}


// Evento de filtro
filtroSetor.addEventListener('change', renderTabela);

// Habilita botão só se setor selecionado
selectSetor.addEventListener('change', () => {
  btnEntrarCadastrar.disabled = !selectSetor.value;
});

// Botão entrar/cadastrar: salva setor e vai para index.html
btnEntrarCadastrar.addEventListener('click', () => {
  const setor = selectSetor.value;
  if (!setor) {
    alert('Selecione um setor!');
    return;
  }
  localStorage.setItem('setorSelecionado', setor);
  window.location.href = 'cadastro.html';
});

// Inicialização
carregarSetores();
carregarItens();
