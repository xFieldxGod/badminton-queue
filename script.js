// Global variables
let queue = [];
let players = [];
let playerStats = {};
let selectedPlayers = new Set();
let draggedItem = null;
let draggedIndex = null;
let isMatchInProgress = false;

// Local Storage functions
function saveToLocalStorage() {
    localStorage.setItem('badmintonQueue', JSON.stringify(queue));
    localStorage.setItem('badmintonPlayers', JSON.stringify(players));
    localStorage.setItem('badmintonPlayerStats', JSON.stringify(playerStats));
    localStorage.setItem('badmintonIsMatchInProgress', JSON.stringify(isMatchInProgress));
}

function loadFromLocalStorage() {
    const savedQueue = localStorage.getItem('badmintonQueue');
    const savedPlayers = localStorage.getItem('badmintonPlayers');
    const savedPlayerStats = localStorage.getItem('badmintonPlayerStats');
    const savedMatchStatus = localStorage.getItem('badmintonIsMatchInProgress');

    if (savedQueue) queue = JSON.parse(savedQueue);
    if (savedPlayers) players = JSON.parse(savedPlayers);
    if (savedPlayerStats) playerStats = JSON.parse(savedPlayerStats);
    if (savedMatchStatus) isMatchInProgress = JSON.parse(savedMatchStatus);

    // Restore match UI if a match was in progress
    if (isMatchInProgress && queue.length >= 2) {
        document.getElementById('matchSection').style.display = 'block';
        const team1 = queue[0];
        const team2 = queue[1];
        document.getElementById('team1').textContent = team1.players.map(p => p.name).join(', ');
        document.getElementById('team2').textContent = team2.players.map(p => p.name).join(', ');
    }

    renderList();
    checkAndShowStartButton();
}

// Player management functions
function addPlayer() {
    const input = document.getElementById('playerName');
    const name = input.value.trim();
    
    // ตรวจสอบว่ามีชื่อซ้ำหรือไม่
    const isNameExists = players.some(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (name && !isNameExists) {
        const playerId = Date.now();
        const newPlayer = {
            id: playerId,
            name: name,
            status: 'available'
        };
        
        // สร้างหรือโหลดสถิติ
        if (!playerStats[name]) {
            playerStats[name] = {
                wins: 0,
                losses: 0,
                matches: 0
            };
        }
        
        players.push(newPlayer);
        input.value = '';
        renderList();
        input.focus();
        saveToLocalStorage();
    } else if (isNameExists) {
        alert('มีชื่อผู้เล่นนี้อยู่แล้ว');
        input.value = '';
        input.focus();
    }
}

function removePlayer(playerId) {
    if (confirm('คุณต้องการลบผู้เล่นนี้ใช่หรือไม่?')) {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        // ลบผู้เล่นออกจาก players array แต่ยังเก็บสถิติไว้
        players = players.filter(p => p.id !== playerId);
        
        // ลบจากคิวถ้าอยู่ในคู่แข่งขัน
        queue = queue.filter(match => {
            const hasPlayer = match.players.some(p => p.id === playerId);
            if (hasPlayer && match.players.length <= 2) {
                // ถ้าเป็นคู่เดี่ยว ลบทั้งคู่
                return false;
            } else if (hasPlayer) {
                // ถ้าเป็นคู่ผสม ลบเฉพาะผู้เล่นที่ต้องการลบ
                match.players = match.players.filter(p => p.id !== playerId);
            }
            return true;
        });

        // ลบจาก selectedPlayers ถ้าถูกเลือกอยู่
        if (selectedPlayers.has(playerId)) {
            selectedPlayers.delete(playerId);
            document.getElementById('selectedCount').textContent = selectedPlayers.size;
        }

        // อัพเดท UI
        renderList();
        checkAndShowStartButton();
        saveToLocalStorage();
    }
}

function togglePlayerSelection(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player || player.status !== 'available') return;

    if (selectedPlayers.has(playerId)) {
        selectedPlayers.delete(playerId);
    } else if (selectedPlayers.size < 4) {
        selectedPlayers.add(playerId);
    }

    document.getElementById('selectedCount').textContent = selectedPlayers.size;
    document.getElementById('matchButton').disabled = selectedPlayers.size < 2;
    renderList();
}

// Match management functions
function createMatch() {
    if (selectedPlayers.size < 2) return;

    const selectedPlayerObjects = Array.from(selectedPlayers)
        .map(id => players.find(p => p.id === id))
        .filter(p => p);

    const matchGroup = {
        id: Date.now(),
        players: selectedPlayerObjects,
        status: 'waiting',
        winStreak: 0
    };

    queue.push(matchGroup);
    
    // Update player status
    players = players.map(p => {
        if (selectedPlayers.has(p.id)) {
            return { ...p, status: 'waiting' };
        }
        return p;
    });

    selectedPlayers.clear();
    document.getElementById('selectedCount').textContent = 0;
    document.getElementById('matchButton').disabled = true;
    
    checkAndShowStartButton();
    renderList();
    saveToLocalStorage();
}

function startMatch() {
    if (!queue || queue.length < 2 || isMatchInProgress) return;

    isMatchInProgress = true;
    document.getElementById('matchSection').style.display = 'block';
    document.getElementById('startMatchContainer').style.display = 'none';

    const team1 = queue[0];
    const team2 = queue[1];

    document.getElementById('team1').textContent = team1.players.map(p => p.name).join(', ');
    document.getElementById('team2').textContent = team2.players.map(p => p.name).join(', ');

    // Update team status
    queue = queue.map((team, index) => {
        if (index < 2) {
            return { ...team, status: 'playing' };
        }
        return team;
    });

    renderList();
    saveToLocalStorage();
}

function matchResult(winningTeam) {
    if (!isMatchInProgress || queue.length < 2) return;

    const losingTeam = winningTeam === 1 ? queue[1] : queue[0];
    const winningTeamObj = winningTeam === 1 ? queue[0] : queue[1];

    // Update player stats
    winningTeamObj.players.forEach(player => {
        if (!playerStats[player.name]) {
            playerStats[player.name] = { wins: 0, losses: 0, matches: 0 };
        }
        playerStats[player.name].wins++;
        playerStats[player.name].matches++;
    });

    losingTeam.players.forEach(player => {
        if (!playerStats[player.name]) {
            playerStats[player.name] = { wins: 0, losses: 0, matches: 0 };
        }
        playerStats[player.name].losses++;
        playerStats[player.name].matches++;
    });

    // Update queue
    queue = queue.filter(team => team !== losingTeam && team !== winningTeamObj);
    const updatedWinningTeam = { ...winningTeamObj };
    const updatedLosingTeam = { ...losingTeam, winStreak: 0, status: 'waiting' };

    if (updatedWinningTeam.winStreak >= 1) {
        // ชนะครบ 2 รอบ, ไปต่อท้าย
        updatedWinningTeam.winStreak = 0;
        updatedWinningTeam.status = 'waiting';
        queue = [...queue, updatedLosingTeam, updatedWinningTeam];
    } else {
        // ยังไม่ครบ 2 รอบ, อยู่ที่เดิม
        updatedWinningTeam.winStreak++;
        updatedWinningTeam.status = 'waiting';
        queue = [updatedWinningTeam, ...queue, updatedLosingTeam];
    }

    isMatchInProgress = false;
    document.getElementById('matchSection').style.display = 'none';
    
    checkAndShowStartButton();
    renderList();
    saveToLocalStorage();
}

function splitTeam(matchId) {
    const matchIndex = queue.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;

    const match = queue[matchIndex];
    
    // Set players status to available
    players = players.map(p => {
        if (match.players.find(mp => mp.id === p.id)) {
            return { ...p, status: 'available' };
        }
        return p;
    });

    // Remove team from queue
    queue = queue.filter((_, index) => index !== matchIndex);

    renderList();
    checkAndShowStartButton();
    saveToLocalStorage();
}

// Drag and drop functions
function handleDragStart(e) {
    if (isMatchInProgress) return;
    draggedItem = this;
    draggedIndex = parseInt(this.getAttribute('data-index'));
    this.classList.add('dragging');
}

function handleDragEnd(e) {
    if (isMatchInProgress) return;
    this.classList.remove('dragging');
    draggedItem = null;
    draggedIndex = null;
}

function handleDragOver(e) {
    if (isMatchInProgress) return;
    e.preventDefault();
}

function handleDrop(e) {
    if (isMatchInProgress) return;
    e.preventDefault();
    const dropIndex = parseInt(this.getAttribute('data-index'));
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        const newQueue = [...queue];
        const temp = newQueue[draggedIndex];
        newQueue.splice(draggedIndex, 1);
        newQueue.splice(dropIndex, 0, temp);
        queue = newQueue;
        renderList();
        saveToLocalStorage();
    }
}

// Touch events for mobile
function handleTouchStart(e) {
    if (isMatchInProgress) return;
    const touch = e.touches[0];
    this.classList.add('dragging');
    draggedItem = this;
    draggedIndex = parseInt(this.getAttribute('data-index'));
    this.touchY = touch.clientY;
}

function handleTouchMove(e) {
    if (!draggedItem || isMatchInProgress) return;
    e.preventDefault();

    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const queueItem = elements.find(el => el.classList.contains('list-item') && el !== draggedItem);

    if (queueItem) {
        const dropIndex = parseInt(queueItem.getAttribute('data-index'));
        if (dropIndex !== draggedIndex) {
            const newQueue = [...queue];
            const temp = newQueue[draggedIndex];
            newQueue.splice(draggedIndex, 1);
            newQueue.splice(dropIndex, 0, temp);
            queue = newQueue;
            draggedIndex = dropIndex;
            renderList();
            saveToLocalStorage();
        }
    }
}

function handleTouchEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
        draggedIndex = null;
    }
}

// Utility functions
function calculateWinRate(stats) {
    if (!stats || stats.matches === 0) return 0;
    return ((stats.wins / stats.matches) * 100).toFixed(1);
}

function checkAndShowStartButton() {
    const startMatchContainer = document.getElementById('startMatchContainer');
    if (queue && queue.length >= 2 && !isMatchInProgress) {
        startMatchContainer.style.display = 'block';
    } else {
        startMatchContainer.style.display = 'none';
    }
}

// Render function
function renderList() {
    const queueList = document.getElementById('queueList');
    let html = '';

    // แสดงคิว
    if (queue && queue.length > 0) {
        html += '<div class="section-header">รายการคิว</div>';
        queue.forEach((match, index) => {
            const playerNames = match.players.map(p => p.name).join(', ');
            const winStreakBadge = match.winStreak > 0 ? 
                `<div class="win-streak-badge">ชนะ ${match.winStreak} ครั้ง</div>` : '';
            
            html += `
                <div class="list-item ${match.status === 'playing' ? 'playing' : ''}"
                     draggable="true"
                     data-index="${index}">
                    <div class="item-info">
                        <div class="drag-handle">☰</div>
                        <div class="number-badge">${index + 1}</div>
                        <div>${playerNames}</div>
                        <div class="status-badge ${match.status}">
                            ${match.status === 'playing' ? 'กำลังเล่น' : 'รอคิว'}
                        </div>
                        ${winStreakBadge}
                    </div>
                    <div class="button-group">
                        ${match.status === 'playing' ? '' :
                        `<button class="split" onclick="splitTeam(${match.id})">แยกคู่</button>`}
                    </div>
                </div>
            `;
        });
        html += '<div class="divider"></div>';
    }

    // แสดงผู้เล่นที่ว่าง
    const availablePlayers = players.filter(p => p.status === 'available');
    if (availablePlayers.length > 0) {
        html += '<div class="section-header">ผู้เล่นที่ว่าง</div>';
        availablePlayers.forEach(player => {
            html += `
                <div class="list-item ${selectedPlayers.has(player.id) ? 'selected' : ''}">
                    <div class="item-info">
                        <div>${player.name}</div>
                        <div class="status-badge available">ว่าง</div>
                    </div>
                    <div class="button-group">
                        <button 
                            class="${selectedPlayers.has(player.id) ? 'remove' : 'select'}"
                            onclick="togglePlayerSelection(${player.id})"
                        >
                            ${selectedPlayers.has(player.id) ? 'ยกเลิก' : 'เลือก'}
                        </button>
                        <button 
                            class="remove"
                            onclick="removePlayer(${player.id})"
                        >
                        ลบ
                        </button>
                    </div>
                </div>
            `;
        });
        html += '<div class="divider"></div>';
    }

    // แสดงสถิติผู้เล่น
    if (Object.keys(playerStats).length > 0) {
        html += `
            <div class="stats-section">
                <div class="section-header">สถิติผู้เล่น</div>
                <div class="stats-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ชื่อ</th>
                                <th>แมทช์</th>
                                <th>ชนะ</th>
                                <th>แพ้</th>
                                <th>อัตราชนะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(playerStats)
                                .sort((a, b) => calculateWinRate(b[1]) - calculateWinRate(a[1]))
                                .map(([name, stats]) => `
                                    <tr>
                                        <td>${name}</td>
                                        <td>${stats.matches}</td>
                                        <td>${stats.wins}</td>
                                        <td>${stats.losses}</td>
                                        <td>${calculateWinRate(stats)}%</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    queueList.innerHTML = html;

    // Add event listeners for drag and drop
    const queueItems = document.querySelectorAll('.list-item[draggable="true"]');
    queueItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        
        item.addEventListener('touchstart', handleTouchStart);
        item.addEventListener('touchmove', handleTouchMove);
        item.addEventListener('touchend', handleTouchEnd);
    });
}

// Event listeners
document.getElementById('playerName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addPlayer();
    }
});

// Initialize
window.addEventListener('load', loadFromLocalStorage);

// Add control buttons
const header = document.querySelector('.header');

// Add clear all data button
const clearButton = document.createElement('button');
clearButton.textContent = 'ล้างข้อมูลทั้งหมด';
clearButton.style.backgroundColor = '#f44336';
clearButton.style.marginTop = '10px';
clearButton.onclick = function() {
    if (confirm('คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?')) {
        localStorage.clear();
        location.reload();
    }
};
header.appendChild(clearButton);

// Add clear stats button
const clearStatsButton = document.createElement('button');
clearStatsButton.textContent = 'ล้างประวัติการแข่งขัน';
clearStatsButton.style.backgroundColor = '#ff9800';
clearStatsButton.style.marginTop = '10px';
clearStatsButton.style.marginLeft = '10px';
clearStatsButton.onclick = function() {
    if (confirm('คุณต้องการล้างประวัติการแข่งขันทั้งหมดใช่หรือไม่?')) {
        playerStats = {};
        saveToLocalStorage();
        renderList();
    }
};
header.appendChild(clearStatsButton);