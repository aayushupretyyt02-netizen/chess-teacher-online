// --- GLOBAL VARIABLES & STATE MANAGEMENT ---
let board = null, game = new Chess(), moveHistory = [], evaluations = [], currentMoveIndex = -1, evalChart = null;

// --- DOM ELEMENT CACHING (will be populated once DOM is loaded) ---
let dom = {}; 

// --- INITIALIZATION & EVENT LISTENERS ---

// Wait for the DOM to be fully loaded before initializing everything
document.addEventListener('DOMContentLoaded', function() {
    // Populate the dom object now that we know all elements exist
    dom = { 
        pgnInput: document.getElementById("pgnInput"), 
        analyzeBtn: document.getElementById("analyzeBtn"), 
        resetBtn: document.getElementById("resetBtn"), 
        prevBtn: document.getElementById("prevBtn"), 
        nextBtn: document.getElementById("nextBtn"), 
        copyFenBtn: document.getElementById('copyFenBtn'), 
        copyPgnBtn: document.getElementById('copyPgnBtn'),
        generateReportBtn: document.getElementById('generateReportBtn'),
        reportModal: document.getElementById('reportModal'),
        closeModal: document.querySelector('.close-button'),
        reportContent: document.getElementById('report-content'),
        svg: document.getElementById('arrows-svg'), 
        progressContainer: document.getElementById('progress-container'), 
        progressBar: document.getElementById('progress-bar'), 
        progressText: document.getElementById('progress-text'), 
        evalBarWhite: document.getElementById('eval-bar-white'), 
        headerText: document.getElementById('header-text'), 
        coachExplanation: document.getElementById('coach-explanation'), 
        analysisOutput: document.getElementById("analysis-output"), 
        whiteAccuracy: document.getElementById('white-accuracy'), 
        blackAccuracy: document.getElementById('black-accuracy'), 
        boardContainer: document.getElementById('board-container'),
        loader: document.getElementById('loader-container') // Added loader element
    };

    // Initialize the board
    board = Chessboard("board", { position: "start", draggable: false, pieceTheme: "pieces/{piece}.png" });
    adjustEvalBarHeight();
    
    // Add all event listeners, with checks to ensure elements exist
    window.addEventListener('resize', () => {
        if (board) { board.resize(); updateBoardToMove(currentMoveIndex); adjustEvalBarHeight(); }
    });
    if(dom.analyzeBtn) dom.analyzeBtn.addEventListener("click", handleAnalysis);
    if(dom.resetBtn) dom.resetBtn.addEventListener("click", resetAnalysis);
    if(dom.prevBtn) dom.prevBtn.addEventListener("click", navigatePrev);
    if(dom.nextBtn) dom.nextBtn.addEventListener("click", navigateNext);
    if(dom.copyFenBtn) dom.copyFenBtn.addEventListener('click', copyFen);
    if(dom.copyPgnBtn) dom.copyPgnBtn.addEventListener('click', copyPgn);
    if(dom.generateReportBtn) dom.generateReportBtn.addEventListener('click', generateAnalysisReport);
    if(dom.closeModal) dom.closeModal.addEventListener('click', () => {
        if (dom.reportModal) dom.reportModal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (dom.reportModal && event.target == dom.reportModal) {
            dom.reportModal.style.display = 'none';
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') navigateNext();
        if (e.key === 'ArrowLeft') navigatePrev();
    });
});


function adjustEvalBarHeight() {
    if (!dom.boardContainer) return;
    const boardContainer = dom.boardContainer;
    const evalBarContainer = document.getElementById('eval-bar-container');
    if (boardContainer && evalBarContainer) { evalBarContainer.style.height = `${boardContainer.offsetHeight}px`; }
}

// --- VISUALIZATION FUNCTIONS ---
function drawArrow(from, to, color) {
    if (!dom.boardContainer || !dom.svg) return;
    const boardSize = dom.boardContainer.offsetWidth;
    const scaleFactor = boardSize / 420;
    const strokeWidth = Math.max(4, 9 * scaleFactor);
    const markerSize = Math.max(3, 5 * scaleFactor);
    const fromCoords = squareToCoords(from);
    const toCoords = squareToCoords(to);
    const markerId = `ah-${color}`;
    if (!document.getElementById(markerId)) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', markerId);
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', 8);
        marker.setAttribute('refY', 5);
        marker.setAttribute('markerWidth', markerSize);
        marker.setAttribute('markerHeight', markerSize);
        marker.setAttribute('orient', 'auto-start-reverse');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        path.style.fill = (color === 'green') ? 'var(--green)' : 'var(--red)';
        marker.appendChild(path);
        dom.svg.appendChild(marker);
    }
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromCoords.x);
    line.setAttribute('y1', fromCoords.y);
    line.setAttribute('x2', toCoords.x);
    line.setAttribute('y2', toCoords.y);
    line.style.stroke = (color === 'green') ? 'var(--green)' : 'var(--red)';
    line.style.strokeWidth = `${strokeWidth}px`;
    line.setAttribute('marker-end', `url(#${markerId})`);
    dom.svg.appendChild(line);
}
function squareToCoords(square) {
    if (!dom.boardContainer) return { x: 0, y: 0 };
    const boardSize = dom.boardContainer.offsetWidth;
    const squareSize = boardSize / 8;
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    return { x: file * squareSize + squareSize / 2, y: rank * squareSize + squareSize / 2 };
}
function highlightSquare(square, color) { $(`#board .square-${square}`).addClass(`highlight-${color}`); }
function clearVisuals() { 
    if (dom.svg) dom.svg.innerHTML = ''; 
    $('#board .square-55d63').removeClass('highlight-green highlight-red'); 
}

// --- UI UPDATE FUNCTIONS ---
function updateProgress(current, total) {
    if (total === 0) return;
    const percent = Math.round((current / total) * 100);
    if (dom.progressBar) {
        dom.progressBar.style.width = `${percent}%`;
        dom.progressBar.textContent = `${percent}%`;
    }
    if (dom.progressText) {
        dom.progressText.textContent = `Analyzing move ${current} of ${total}...`;
    }
    // Update the "Move by Move" analysis text with the percentage
    if (dom.analysisOutput && document.body.classList.contains('analysis-active')) {
        dom.analysisOutput.innerHTML = `Analyzing... ${percent}%`;
    }
}
function updateEvalBar(evaluation) {
    if (!dom.evalBarWhite) return;
    if (!evaluation) { dom.evalBarWhite.style.height = '50%'; return; }
    if (evaluation.mate !== null) { dom.evalBarWhite.style.height = (evaluation.mate > 0) ? '100%' : '0%'; return; }
    const centipawns = evaluation.score / 100;
    const normalizedScore = Math.atan(centipawns / 3) / (Math.PI / 2);
    const percentage = (normalizedScore + 1) / 2 * 100;
    dom.evalBarWhite.style.height = `${percentage}%`;
}

// --- CORE ANALYSIS LOGIC ---
async function handleAnalysis() {
    if (!dom.pgnInput) return;
    const pgn = dom.pgnInput.value;
    if (!pgn.trim()) return alert("Please paste a PGN.");
    if (!game.load_pgn(pgn)) return alert("Invalid PGN.");
    
    // Show loader
    if (dom.loader) dom.loader.style.display = 'flex';

    document.body.classList.add('analysis-active');
    if (dom.analyzeBtn) dom.analyzeBtn.style.display = 'none';
    if (dom.resetBtn) dom.resetBtn.style.display = 'inline-block';
    if (dom.progressContainer) dom.progressContainer.style.display = 'block';
    moveHistory = game.history({ verbose: true });
    updateProgress(0, moveHistory.length);
    if (dom.analysisOutput) dom.analysisOutput.innerHTML = "Analyzing... 0%"; // Start with 0%
    if (dom.analyzeBtn) dom.analyzeBtn.disabled = true;
    evaluations = await fetchAllEvaluations();
    
    // Hide loader
    if (dom.loader) dom.loader.style.display = 'none';

    if (!evaluations) return;

    // Play completion sound
    const completionSound = new Audio('Audio.mp3'); // Assumes Audio.mp3 is in the same folder
    completionSound.play();

    classifyMoves();
    calculateAccuracy();
    drawEvaluationChart();
    if (dom.progressContainer) dom.progressContainer.style.display = 'none';
    if (dom.analyzeBtn) dom.analyzeBtn.disabled = false;
    if (dom.generateReportBtn) dom.generateReportBtn.style.display = 'inline-block';
    if (dom.analysisOutput) dom.analysisOutput.innerHTML = "";
    currentMoveIndex = -1;
    updateBoardToMove(currentMoveIndex);
    updateNavButtons();
}

function resetAnalysis() {
    document.body.classList.remove('analysis-active');
    if (dom.analyzeBtn) dom.analyzeBtn.style.display = 'inline-block';
    if (dom.resetBtn) dom.resetBtn.style.display = 'none';
    if (dom.generateReportBtn) dom.generateReportBtn.style.display = 'none';
    if (dom.prevBtn) dom.prevBtn.disabled = true;
    if (dom.nextBtn) dom.nextBtn.disabled = true;
    if (dom.loader) dom.loader.style.display = 'none'; // Hide loader on reset
    moveHistory = [];
    evaluations = [];
    currentMoveIndex = -1;
    game.reset();
    if (board) board.start();
    clearVisuals();
    if (dom.pgnInput) dom.pgnInput.value = '';
    if (dom.analysisOutput) dom.analysisOutput.innerHTML = "Please paste a PGN and click Analyze.";
    if (dom.coachExplanation) dom.coachExplanation.innerHTML = "Analyze a game to get coaching advice.";
    if (dom.whiteAccuracy) dom.whiteAccuracy.textContent = "White: -%";
    if (dom.blackAccuracy) dom.blackAccuracy.textContent = "Black: -%";
    if (evalChart) evalChart.destroy();
    evalChart = null;
    updateEvalBar(null);
    updateBoardToMove(-1);
}


async function fetchAllEvaluations() {
    const tempGame = new Chess();
    const resolvedEvals = [{ score: 0, mate: null }];
    const serverUrl = "https://chess-game-anaylizer.onrender.com/analyze-position";

    for (let i = 0; i < moveHistory.length; i++) {
        const move = moveHistory[i];
        tempGame.move(move.san);
        
        try {
            const response = await fetch(serverUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fen: tempGame.fen(), depth: 14 })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Server Error: ${errorData.error}`);
            }
            const analysisResult = await response.json();
            moveHistory[i].analysis = analysisResult;
            resolvedEvals.push(analysisResult.analysis);
            updateProgress(i + 1, moveHistory.length);
        } catch (error) {
            alert(`Analysis failed: ${error.message}`);
            resetAnalysis();
            return null;
        }
    }
    return resolvedEvals;
}

function classifyMoves() {
    let isBook = true;
    for (let i = 0; i < moveHistory.length; i++) {
        const move = moveHistory[i];
        const prevEval = evaluations[i];
        const currentEval = evaluations[i + 1];

        if (!prevEval || !currentEval) continue;

        const currentScore = (currentEval.mate !== null) ? 10000 * Math.sign(currentEval.mate) : currentEval.score;
        const prevBestScore = (prevEval.mate !== null) ? -10000 * Math.sign(prevEval.mate) : prevEval.score;
        
        const scoreAfterMyMove = (move.color === 'w') ? currentScore : -currentScore;
        const scoreBeforeMyMove = (move.color === 'w') ? prevBestScore : -prevBestScore;
        const prevScoreForPlayer = (move.color === 'w') ? prevEval.score : -prevEval.score;
        
        const cpl = scoreBeforeMyMove - scoreAfterMyMove;
        move.cpl = cpl;

        const playerMoveUCI = `${move.from}${move.to}`;
        const engineBestMoveUCI = move.analysis.bestmove || '';
        const isBestMove = playerMoveUCI === engineBestMoveUCI.substring(0, 4);
        const isSacrifice = move.captured && Chess.SQUARE_MASKS[move.to] & game.pieces(move.captured.toLowerCase(), move.color === 'w' ? 'b' : 'w');

        if (isBook && cpl < 50) {
            move.classification = { text: "Book", symbol: "📖", class: "book-move" };
            if (i > 16) isBook = false;
        } else {
            isBook = false;
            if (isBestMove) {
                move.classification = { text: "Best Move", symbol: "★", class: "best-move" };
            } else if (cpl <= 10 && isSacrifice && prevScoreForPlayer < 100) {
                move.classification = { text: "Brilliant", symbol: "!!", class: "brilliant-move" };
            } else if (cpl <= 15) {
                move.classification = { text: "Great Move", symbol: "!", class: "good-move" };
            } else if (cpl <= 50) {
                move.classification = { text: "Good", symbol: "✓", class: "good-move" };
            } else if (cpl <= 120) {
                move.classification = { text: "Inaccuracy", symbol: "?!", class: "inaccuracy" };
            } else if (cpl <= 220) {
                move.classification = { text: "Mistake", symbol: "?", class: "mistake" };
            } else {
                move.classification = { text: "Blunder", symbol: "??", class: "blunder" };
            }
        }
        
        move.classification.explanation = generateCoachExplanation(move);
    }
}

function calculateAccuracy() {
    let whiteCplTotal = 0, blackCplTotal = 0, whiteMoves = 0, blackMoves = 0;
    for (const move of moveHistory) {
        if (move.cpl > 0) {
            if (move.color === 'w') { whiteCplTotal += move.cpl; whiteMoves++; } 
            else { blackCplTotal += move.cpl; blackMoves++; }
        }
    }
    const avgWhiteCpl = whiteCplTotal / whiteMoves || 0;
    const avgBlackCpl = blackCplTotal / blackMoves || 0;
    const getAccuracy = (cpl) => Math.max(0, 103 * Math.exp(-0.04 * cpl / 100) - 3).toFixed(1);
    if (dom.whiteAccuracy) dom.whiteAccuracy.textContent = `White: ${getAccuracy(avgWhiteCpl)}%`;
    if (dom.blackAccuracy) dom.blackAccuracy.textContent = `Black: ${getAccuracy(avgBlackCpl)}%`;
}

function drawEvaluationChart() {
    const ctx = document.getElementById('eval-chart').getContext('2d');
    if (!ctx) return;
    if (evalChart) evalChart.destroy();
    const labels = Array.from({ length: moveHistory.length + 1 }, (_, i) => i);
    const data = evaluations.map(e => {
        if (e.mate !== null) return e.mate > 0 ? 12 : -12;
        return Math.max(-12, Math.min(12, e.score / 100));
    });
    evalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Evaluation (Pawns)', data: data,
                backgroundColor: data.map(v => v >= 0 ? 'rgba(240, 217, 181, 0.7)' : 'rgba(74, 74, 74, 0.7)'),
                borderColor: data.map(v => v >= 0 ? '#f0d9b5' : '#4a4a4a'), borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: 'white' }, suggestedMin: -5, suggestedMax: 5, title: { display: true, text: 'Advantage', color: 'white' } },
                x: { ticks: { color: 'white' }, title: { display: true, text: 'Move Number', color: 'white' } }
            },
            plugins: { legend: { display: false }, tooltip: { enabled: true } }
        }
    });
}

function generateCoachExplanation(move) {
    const classification = move.classification;
    const playedMove = move.san;
    const player = move.color === 'w' ? 'You' : 'Your opponent';
    const opponent = move.color === 'w' ? 'Your opponent' : 'You';
    const bestMove = convertUCIToSAN(move.analysis.bestmove, move.before);

    const intro = `On this move, ${player} played <strong>${playedMove}</strong>.`;

    switch (classification.text) {
        case "Brilliant": return `${intro} This was a brilliant sacrifice that turns the tables!`;
        case "Best Move": return `${intro} Excellent! This is the best move in the position.`;
        case "Great Move": return `${intro} A great move! Almost perfect. The engine's top choice was ${bestMove}.`;
        case "Good": return `${intro} A solid, good move. The engine slightly preferred ${bestMove}.`;
        case "Book": return `${intro} This is a standard opening move (book move).`;
        case "Inaccuracy": return `${intro} This is an inaccuracy. ${player} missed a better opportunity. The engine suggests <strong>${bestMove}</strong>.`;
        case "Mistake": return `${intro} A mistake. This move allows ${opponent} to gain a significant advantage. The best move was <strong>${bestMove}</strong>.`;
        case "Blunder": return `${intro} A blunder! This is a critical error. ${player} should have played <strong>${bestMove}</strong>.`;
        default: return "No explanation available.";
    }
}


function updateAnalysisDisplay() {
    if (!dom.analysisOutput) return;
    dom.analysisOutput.innerHTML = '';
    for (let i = 0; i < moveHistory.length; i++) {
        const move = moveHistory[i];
        const moveNumber = Math.floor(i / 2) + 1;
        const turn = (i % 2 === 0) ? 'w' : 'b';
        let html = `<div class="move-info" id="move-${i}" onclick="jumpToMove(${i})">`;
        html += `<div class="move-info-main">`;
        if (turn === 'w') html += `<strong>${moveNumber}.</strong>`;
        html += `<span>${move.san}</span>`;
        if (move.classification) {
            const c = move.classification;
            html += `<span class="classification-tag ${c.class}">${c.text} ${c.symbol}</span>`;
        }
        html += `</div>`;
        if (move.classification && !['Best Move', 'Book'].includes(move.classification.text)) {
            const bestMoveSAN = convertUCIToSAN(move.analysis.bestmove, move.before);
            html += `<div class="best-move-suggestion">Best: ${bestMoveSAN}</div>`;
        }
        html += `</div>`;
        dom.analysisOutput.innerHTML += html;
    }
    if (currentMoveIndex > -1) {
        const activeMoveElement = document.getElementById(`move-${currentMoveIndex}`);
        if (activeMoveElement) {
            activeMoveElement.classList.add('active');
            if (window.innerWidth > 1200) {
                activeMoveElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }
}

function convertUCIToSAN(uci, fen) {
    if (!uci || uci === 'N/A') return 'N/A';
    const tempGame = new Chess(fen);
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promotion = uci.length > 4 ? uci.substring(4) : undefined;
    const moveObject = tempGame.move({ from: from, to: to, promotion: promotion });
    return moveObject ? moveObject.san : uci;
}

// --- NAVIGATION LOGIC ---
function navigatePrev() {
    if (currentMoveIndex <= 0) { currentMoveIndex = -1; updateBoardToMove(currentMoveIndex); return; }
    currentMoveIndex--;
    updateBoardToMove(currentMoveIndex);
}
function navigateNext() {
    if (currentMoveIndex >= moveHistory.length - 1) return;
    currentMoveIndex++;
    updateBoardToMove(currentMoveIndex);
}
function jumpToMove(index) {
    currentMoveIndex = index;
    updateBoardToMove(currentMoveIndex);
}

function updateBoardToMove(index) {
    const tempGame = new Chess();
    for (let i = 0; i <= index; i++) {
        if (moveHistory[i]) tempGame.move(moveHistory[i].san);
    }
    if (board) {
      board.position(tempGame.fen());
    }
    updateNavButtons();
    updateAnalysisDisplay();
    clearVisuals();
    updateEvalBar(evaluations ? evaluations[index + 1] : null);
    if (evalChart && evaluations) {
        const borderColors = evaluations.map((_, i) => (i === index + 1) ? '#5865f2' : '#40444b');
        evalChart.data.datasets[0].borderColor = borderColors;
        evalChart.update('none');
    }
    if (index > -1 && moveHistory[index]) {
        const move = moveHistory[index];
        const classification = move.classification;
        if (classification && dom.headerText && dom.coachExplanation) {
            const displayTitle = `${classification.text} ${classification.symbol}`;
            dom.headerText.innerHTML = displayTitle;
            dom.headerText.className = `header-text ${classification.class}`;
            dom.coachExplanation.innerHTML = classification.explanation;
        }
        const bestMoveUCI = move.analysis.bestmove;
        const playedMoveFrom = move.from;
        const playedMoveTo = move.to;
        if (classification && ['mistake', 'blunder', 'inaccuracy'].includes(classification.class)) {
            highlightSquare(playedMoveFrom, 'red');
            highlightSquare(playedMoveTo, 'red');
            drawArrow(playedMoveFrom, playedMoveTo, 'red');
        }
        if (bestMoveUCI && bestMoveUCI !== 'N/A') {
            const bestMoveFrom = bestMoveUCI.substring(0, 2);
            const bestMoveTo = bestMoveUCI.substring(2, 4);
            if (playedMoveFrom !== bestMoveFrom || playedMoveTo !== bestMoveTo) {
                highlightSquare(bestMoveFrom, 'green');
                highlightSquare(bestMoveTo, 'green');
                drawArrow(bestMoveFrom, bestMoveTo, 'green');
            }
        }
    } else {
        if (dom.headerText) dom.headerText.innerHTML = '-';
        if (dom.headerText) dom.headerText.className = 'header-text';
        if (dom.coachExplanation) dom.coachExplanation.innerHTML = "Analyze a game to get coaching advice.";
    }
}

function updateNavButtons() {
    if (dom.prevBtn) dom.prevBtn.disabled = currentMoveIndex < 0;
    if (dom.nextBtn) dom.nextBtn.disabled = currentMoveIndex >= moveHistory.length - 1;
}

// --- NEW FEATURE: ANALYSIS REPORT ---
function generateAnalysisReport() {
    if (!dom.reportContent || !dom.reportModal) return;
    let reportHTML = '<h1>Game Analysis Report</h1>';
    
    reportHTML += '<h2>Summary</h2>';
    const whiteMistakes = moveHistory.filter(m => m.color === 'w' && m.classification && (m.classification.text === 'Mistake' || m.classification.text === 'Blunder')).length;
    const blackMistakes = moveHistory.filter(m => m.color === 'b' && m.classification && (m.classification.text === 'Mistake' || m.classification.text === 'Blunder')).length;
    if (dom.whiteAccuracy && dom.blackAccuracy) {
        reportHTML += `<p><strong>White Accuracy:</strong> ${dom.whiteAccuracy.textContent.split(': ')[1]}</p>`;
        reportHTML += `<p><strong>Black Accuracy:</strong> ${dom.blackAccuracy.textContent.split(': ')[1]}</p>`;
    }
    reportHTML += `<p>White made ${whiteMistakes} major mistakes.</p>`;
    reportHTML += `<p>Black made ${blackMistakes} major mistakes.</p>`;

    reportHTML += '<h2>Key Moments</h2>';
    const keyMoves = moveHistory.filter(m => m.classification && ['Brilliant', 'Blunder', 'Mistake'].includes(m.classification.text));
    if (keyMoves.length > 0) {
        keyMoves.forEach(move => {
            const moveNumber = Math.floor(moveHistory.indexOf(move) / 2) + 1;
            reportHTML += `<p><strong>Move ${moveNumber} (${move.color === 'w' ? 'White' : 'Black'}):</strong> ${move.san} was a ${move.classification.text}. The best move was ${convertUCIToSAN(move.analysis.bestmove, move.before)}.</p>`;
        });
    } else {
        reportHTML += '<p>No critical blunders or brilliant moves found.</p>';
    }

    reportHTML += '<h2>Suggestions for Improvement</h2>';
    if (whiteMistakes > blackMistakes) {
        reportHTML += "<p>White had more critical errors. Focus on calculating your opponent's responses before moving. Try to spot simple tactics you might have missed.</p>";
    } else if (blackMistakes > whiteMistakes) {
        reportHTML += "<p>Black had more critical errors. Review the game to see where you could have defended better or found stronger attacking moves.</p>";
    } else {
        reportHTML += "<p>Both players played a relatively balanced game. Look for small inaccuracies to improve your positional understanding.</p>";
    }
    reportHTML += "<p>General advice: Practice tactical puzzles daily to improve your pattern recognition. Analyze your games (like you're doing now!) to understand your weaknesses.</p>";


    dom.reportContent.innerHTML = reportHTML;
    dom.reportModal.style.display = 'block';
}


// --- UTILITY FUNCTIONS ---
function copyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        alert('Copied to clipboard!');
    } catch (err) {
        alert('Failed to copy.');
    }
    document.body.removeChild(textArea);
}
function copyFen() {
    const tempGame = new Chess();
    for (let i = 0; i <= currentMoveIndex; i++) {
        if (moveHistory[i]) tempGame.move(moveHistory[i].san);
    }
    copyToClipboard(tempGame.fen());
}
function copyPgn() {
    if (dom.pgnInput) copyToClipboard(dom.pgnInput.value);
}
