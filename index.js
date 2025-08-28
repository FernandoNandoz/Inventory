// Atualizar setores do Sheets
const btnAtualizarSetores = document.getElementById('btnAtualizarSetores');
if (btnAtualizarSetores) {
  btnAtualizarSetores.addEventListener('click', async () => {
    btnAtualizarSetores.disabled = true;
    btnAtualizarSetores.textContent = 'Atualizando...';
    selectSetor.disabled = true;
    filtroSetor.disabled = true;
    btnEntrarCadastrar.disabled = true;
    try {
      const resp = await fetch(GOOGLE_APPS_SCRIPT_URL + '?pagina=setores');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.setores) && data.setores.length) {
          selectSetor.innerHTML = '<option value="">Selecione o setor</option>' + data.setores.map(s => `<option value="${s}">${s}</option>`).join('');
          filtroSetor.innerHTML = '<option value="">Todos os setores</option>' + data.setores.map(s => `<option value="${s}">${s}</option>`).join('');
          localStorage.setItem('setoresDisponiveis', JSON.stringify(data.setores));
          statusMsg.textContent = 'Setores atualizados com sucesso!';
        } else {
          statusMsg.textContent = 'Nenhum setor encontrado no Sheets.';
        }
      } else {
        statusMsg.textContent = 'Erro ao buscar setores do Sheets.';
      }
    } catch {
      statusMsg.textContent = 'Erro de conexão ao atualizar setores.';
    } finally {
      btnAtualizarSetores.disabled = false;
      btnAtualizarSetores.textContent = 'Atualizar setores do Sheets';
      selectSetor.disabled = false;
      filtroSetor.disabled = false;
      btnEntrarCadastrar.disabled = !selectSetor.value;
    }
  });
}
// Configuração da URL do Apps Script
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEVlymNRwoj1mAqQjvT4JJu55bf3BvB2ZwEx4HmfuGP0r2vxLASSKjoulE2jIdDydt/exec";

const selectSetor = document.getElementById('selectSetor');
const btnEntrarCadastrar = document.getElementById('btnEntrarCadastrar');
const filtroSetor = document.getElementById('filtroSetor');
const tabelaItens = document.getElementById('tabelaItens').querySelector('tbody');
const statusMsg = document.getElementById('statusMsg');

let todosItens = [];

// Carrega setores do localStorage, só busca do Sheets ao clicar no botão
function carregarSetoresLocal() {
  let setores = [];
  try {
    setores = JSON.parse(localStorage.getItem('setoresDisponiveis') || '[]');
  } catch {}
  if (setores.length) {
    selectSetor.innerHTML = '<option value="">Selecione o setor</option>' + setores.map(s => `<option value="${s}">${s}</option>`).join('');
    filtroSetor.innerHTML = '<option value="">Todos os setores</option>' + setores.map(s => `<option value="${s}">${s}</option>`).join('');
  } else {
    // Se não houver cache, mostra opção vazia
    selectSetor.innerHTML = '<option value="">Nenhum setor disponível</option>';
    filtroSetor.innerHTML = '<option value="">Nenhum setor disponível</option>';
  }
}

// Carrega todos os itens cadastrados do Sheets (apenas quando solicitado pelo botão)
async function carregarItens() {
  statusMsg.textContent = 'Carregando itens...';
  tabelaItens.innerHTML = '';
  btnCarregarItens.disabled = true;
  filtroSetor.disabled = true;
  if (typeof btnAtualizarSetores !== 'undefined' && btnAtualizarSetores) btnAtualizarSetores.disabled = true;
  try {
    const resp = await fetch(GOOGLE_APPS_SCRIPT_URL + '?pagina=inventario');
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.itens)) {
        localStorage.setItem('itensCadastrados', JSON.stringify(data.itens));
        todosItens = data.itens;
        renderTabela();
        statusMsg.textContent = 'Itens atualizados com sucesso!';
      } else {
        statusMsg.textContent = 'Nenhum item encontrado.';
      }
    } else {
      statusMsg.textContent = 'Erro ao buscar itens.';
    }
  } catch {
    statusMsg.textContent = 'Erro de conexão.';
  } finally {
    btnCarregarItens.disabled = false;
    filtroSetor.disabled = false;
    if (typeof btnAtualizarSetores !== 'undefined' && btnAtualizarSetores) btnAtualizarSetores.disabled = false;
  }
}

// Carrega itens do localStorage
function carregarItensLocal() {
  let itens = [];
  try {
    itens = JSON.parse(localStorage.getItem('itensCadastrados') || '[]');
  } catch {}
  todosItens = itens;
  renderTabela();
}

// Renderiza a tabela de itens com filtro de setor e RP
function renderTabela() {
  const setorFiltro = filtroSetor.value;
  const rpFiltro = (document.getElementById('filtroRP')?.value || '').trim().toLowerCase();
  tabelaItens.innerHTML = '';
  todosItens.filter(item => {
    const setorOk = !setorFiltro || setorFiltro === '' || item.setor === setorFiltro;
    // Garante busca por RP mesmo se for número
    let rpItem = item.rp;
    if (typeof rpItem === 'number') rpItem = String(rpItem);
    rpItem = (rpItem || '').toLowerCase();
    const rpOk = !rpFiltro || rpItem.includes(rpFiltro);
    return setorOk && rpOk;
  }).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Setor">${item.setor || ''}</td>
      <td data-label="RP">${item.rp || ''}</td>
      <td data-label="Especificação">${item.especificacao || ''}</td>
      <td data-label="Quantidade">${item.quantidade || ''}</td>
    `;
    tabelaItens.appendChild(tr);
  });
}


// Evento de filtro
filtroSetor.addEventListener('change', renderTabela);
const filtroRP = document.getElementById('filtroRP');
if (filtroRP) {
  filtroRP.addEventListener('input', renderTabela);
}

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
carregarSetoresLocal();
carregarItensLocal();

// Evento do botão para carregar itens do Sheets
const btnCarregarItens = document.getElementById('btnCarregarItens');
if (btnCarregarItens) {
  btnCarregarItens.addEventListener('click', carregarItens);
}
