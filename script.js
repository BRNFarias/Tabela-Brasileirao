// --- CONFIGURAÇÃO ---
const TOTAL_TURNS = 8; 

// Dados iniciais
let players = [
    { id: 0, name: "Jogador 1" },
    { id: 1, name: "Jogador 2" },
    { id: 2, name: "Jogador 3" },
    { id: 3, name: "Jogador 4" }
];

let schedule = [];

// --- FUNÇÕES DE "BANCO DE DADOS" LOCAL ---
function saveData() {
    const data = {
        players: players,
        schedule: schedule
    };
    localStorage.setItem('torneioDados', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('torneioDados');
    if (saved) {
        const data = JSON.parse(saved);
        players = data.players;
        schedule = data.schedule;
        
        // Atualiza inputs de nomes
        document.getElementById('p1-name').value = players[0].name;
        document.getElementById('p2-name').value = players[1].name;
        document.getElementById('p3-name').value = players[2].name;
        document.getElementById('p4-name').value = players[3].name;
        
        return true;
    }
    return false;
}

function resetTournament() {
    if(confirm("Tem certeza que deseja apagar tudo e reiniciar?")) {
        localStorage.removeItem('torneioDados');
        location.reload();
    }
}

// --- INICIALIZAÇÃO ---
function init() {
    // Tenta carregar dados salvos. Se não tiver, gera novos.
    const hasData = loadData();
    
    if (!hasData) {
        generateSchedule();
        saveData(); // Salva o estado inicial
    }
    
    // Renderiza mantendo os valores que acabaram de ser carregados
    renderMatches(true); 
    calculateTable();
}

function generateSchedule() {
    schedule = [];
    const pairings = [
        { h: 0, a: 1 }, { h: 2, a: 3 },
        { h: 0, a: 2 }, { h: 1, a: 3 },
        { h: 0, a: 3 }, { h: 1, a: 2 }
    ];

    for (let t = 1; t <= TOTAL_TURNS; t++) {
        pairings.forEach(pair => {
            if (t % 2 === 0) {
                schedule.push({ round: t, home: pair.a, away: pair.h, penWinner: null, hScore: '', aScore: '' });
            } else {
                schedule.push({ round: t, home: pair.h, away: pair.a, penWinner: null, hScore: '', aScore: '' });
            }
        });
    }
}

function updateNames() {
    players[0].name = document.getElementById('p1-name').value;
    players[1].name = document.getElementById('p2-name').value;
    players[2].name = document.getElementById('p3-name').value;
    players[3].name = document.getElementById('p4-name').value;
    
    renderMatches(true);
    calculateTable();
    saveData(); // Salva alteração
}

function renderMatches(preserveValues = false) {
    const container = document.getElementById('matches-list');
    
    // Se não estivermos preservando (primeira carga), usamos os dados do objeto schedule
    // Se estivermos preservando (digitação), lemos do DOM (mas aqui simplifiquei para sempre ler do schedule que é a fonte da verdade)
    
    container.innerHTML = '';
    let currentRound = 0;
    let roundContainer = null;

    schedule.forEach((match, index) => {
        if (match.round !== currentRound) {
            if (roundContainer) container.appendChild(roundContainer);
            container.innerHTML += `<div class="round-header">TURNO ${match.round}</div>`;
            roundContainer = document.createElement('div');
            roundContainer.className = 'matches-grid';
            currentRound = match.round;
        }

        const homeName = players[match.home].name;
        const awayName = players[match.away].name;
        
        // Recupera valores salvos no objeto
        const valH = match.hScore !== undefined ? match.hScore : '';
        const valA = match.aScore !== undefined ? match.aScore : '';
        
        // Verifica se pênaltis estão ativos
        const showPen = (valH !== '' && valA !== '' && valH === valA) ? 'active' : '';
        const checkHome = (match.penWinner === match.home) ? 'checked' : '';
        const checkAway = (match.penWinner === match.away) ? 'checked' : '';

        const html = `
            <div class="match" id="match-card-${index}">
                <div class="match-main">
                    <span class="team-name" title="${homeName}">${homeName}</span>
                    <div class="score-inputs">
                        <input type="number" id="m${index}_h" value="${valH}" oninput="handleScoreInput(${index})" min="0">
                        <span>x</span>
                        <input type="number" id="m${index}_a" value="${valA}" oninput="handleScoreInput(${index})" min="0">
                    </div>
                    <span class="team-name" title="${awayName}">${awayName}</span>
                </div>
                
                <div class="penalty-area ${showPen}" id="pen-area-${index}">
                    <span class="penalty-label">Pênaltis: Quem venceu?</span>
                    <div class="penalty-radios">
                        <label>
                            <input type="radio" name="pen_rad_${index}" value="${match.home}" onchange="handlePenInput(${index}, ${match.home})" ${checkHome}> 
                            Casa
                        </label>
                        <label>
                            <input type="radio" name="pen_rad_${index}" value="${match.away}" onchange="handlePenInput(${index}, ${match.away})" ${checkAway}> 
                            Fora
                        </label>
                    </div>
                </div>
            </div>
        `;
        roundContainer.innerHTML += html;
    });
    if (roundContainer) container.appendChild(roundContainer);
}

function handleScoreInput(index) {
    const hInput = document.getElementById(`m${index}_h`);
    const aInput = document.getElementById(`m${index}_a`);
    const penArea = document.getElementById(`pen-area-${index}`);
    
    // Atualiza o objeto schedule (nossa fonte de verdade)
    schedule[index].hScore = hInput.value;
    schedule[index].aScore = aInput.value;

    const scoreH = hInput.value;
    const scoreA = aInput.value;

    if (scoreH !== '' && scoreA !== '' && scoreH === scoreA) {
        penArea.classList.add('active');
    } else {
        penArea.classList.remove('active');
        schedule[index].penWinner = null;
        // Limpa visualmente os radios se sair do empate
        const radios = document.getElementsByName(`pen_rad_${index}`);
        radios.forEach(r => r.checked = false);
    }
    
    calculateTable();
    saveData(); // Salva cada gol digitado
}

function handlePenInput(index, winnerId) {
    schedule[index].penWinner = winnerId;
    calculateTable();
    saveData(); // Salva pênalti
}

function calculateTable() {
    let stats = players.map(p => ({
        ...p, pts: 0, j: 0, v: 0, d: 0, gp: 0, gc: 0, sg: 0
    }));

    schedule.forEach((match) => {
        // Usa os valores do objeto schedule
        if (match.hScore !== '' && match.aScore !== '') {
            const gh = parseInt(match.hScore);
            const ga = parseInt(match.aScore);

            const pHome = stats[match.home];
            const pAway = stats[match.away];

            pHome.j++; pAway.j++;
            pHome.gp += gh; pHome.gc += ga;
            pAway.gp += ga; pAway.gc += gh;

            let winner = null;

            if (gh > ga) winner = match.home;
            else if (ga > gh) winner = match.away;
            else if (match.penWinner !== null) winner = match.penWinner;

            if (winner !== null) {
                if (winner === match.home) {
                    pHome.v++; pHome.pts += 3;
                    pAway.d++;
                } else {
                    pAway.v++; pAway.pts += 3;
                    pHome.d++;
                }
            }
        }
    });

    stats.forEach(p => p.sg = p.gp - p.gc);

    stats.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.v !== a.v) return b.v - a.v;
        if (b.sg !== a.sg) return b.sg - a.sg;
        return b.gp - a.gp;
    });

    const tbody = document.getElementById('standings-body');
    tbody.innerHTML = '';
    stats.forEach((p, index) => {
        const row = `
            <tr>
                <td>${index + 1}º</td>
                <td style="text-align:left; padding-left:10px;">${p.name}</td>
                <td><strong>${p.pts}</strong></td>
                <td>${p.j}</td>
                <td>${p.v}</td>
                <td>${p.d}</td>
                <td>${p.sg}</td>
                <td>${p.gp}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

window.onload = init;