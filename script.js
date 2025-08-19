// All JavaScript is here
// Use jQuery's ready function for more reliable DOM loading
$(function () {
    // --- Interactive Aura Effect ---
    const body = document.body;
    const updateAura = (x, y) => {
        body.style.setProperty('--mouse-x', `${x}px`);
        body.style.setProperty('--mouse-y', `${y}px`);
    };
    document.addEventListener('mousemove', e => updateAura(e.clientX, e.clientY));
    document.addEventListener('touchmove', e => e.touches.length > 0 && updateAura(e.touches[0].clientX, e.touches[0].clientY));
    document.addEventListener('touchstart', e => e.touches.length > 0 && updateAura(e.touches[0].clientX, e.touches[0].clientY));

    // --- Chess Logic ---
    if (typeof window.jQuery === 'undefined') {
        console.error("Error: jQuery library failed to load. Please check your internet connection and refresh.");
        $('#status-move').html('<span style="color: red;">Error: Required libraries failed to load. Please refresh.</span>');
        return;
    }

    const $ = window.jQuery;

    // Game state variables
    let board = null;
    let game = new Chess();
    let currentOpeningMoves = [];
    let currentMoveIndex = 0;
    const playerColor = 'w'; // Player is always White
    let twoPlayerModeActive = false;
    let thinkingProcess = null;

    // DOM Elements
    const $statusOpening = $('#status-opening');
    const $statusMove = $('#status-move');
    const $boardElement = $('#myBoard');
    const $categorySelect = $('#category-select');
    const $openingSelect = $('#opening-select');
    const $variationSelect = $('#variation-select');
    const $startBtn = $('#start-btn');
    const $resetBtn = $('#reset-btn');
    const $startTwoPlayerBtn = $('#start-bot-btn');
    const $evaluationDisplay = $('#evaluation-display');
    const $selectionInfo = $('#selection-info');
    const $eloSlider = $('#elo-slider');
    const $eloValue = $('#elo-value');

    $boardElement.css('position', 'relative');

    // --- Opening Book Data ---
    const openingBook = {
        "King's Pawn (1. e4)": {
            "Ruy Lopez": {
                "Morphy Defense (Main Line)": ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3'],
                "Berlin Defense (Main Line)": ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8'],
                "Exchange Variation": ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4', 'exd4', 'Nxd4', 'c5']
            },
            "Italian Game": {
                "Giuoco Piano (Modern Main Line)": ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'O-O', 'O-O', 'd6', 'h3', 'a6'],
                "Evans Gambit Accepted": ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'Nf6'],
                "Two Knights (Fried Liver Attack)": ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6']
            },
            "Sicilian Defense": {
                "Najdorf Variation (English Attack)": ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3'],
                "Dragon Variation (Yugoslav Attack)": ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4'],
                "Classical Variation": ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Nc6', 'Bg5', 'e6', 'Qd2', 'Be7', 'O-O-O'],
                "Sveshnikov Variation": ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5']
            },
            "French Defense": {
                "Winawer Variation": ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'Qg4'],
                "Tarrasch Variation": ['e4', 'e6', 'd4', 'd5', 'Nd2', 'Nf6', 'e5', 'Nfd7', 'Bd3', 'c5', 'c3', 'Nc6', 'Ne2'],
                "Classical Variation": ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'e5', 'Nfd7', 'f4', 'c5', 'Nf3', 'Nc6', 'Be3']
            },
            "Caro-Kann Defense": {
                "Classical Variation": ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3'],
                "Advance Variation": ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3']
            },
            "Other e4 Openings": {
                "Scotch Game (Modern Main Line)": ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5', 'Qe7', 'Qe2', 'Nd5'],
                "Petrov's Defense (Classical Attack)": ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5', 'Bd3', 'Be7', 'O-O'],
                "King's Gambit Accepted (Classical)": ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'd4'],
                "Scandinavian Defense (Main Line)": ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'c6']
            }
        },
        "Queen's Pawn (1. d4)": {
            "Queen's Gambit": {
                "Declined (Main Line)": ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6'],
                "Accepted (Main Line)": ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'a4'],
                "Slav Defense (Main Line)": ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6'],
                "Semi-Slav (Meran Variation)": ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5']
            },
            "Indian Defenses": {
                "King's Indian (Classical)": ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'],
                "Nimzo-Indian (Classical)": ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'O-O', 'a3', 'Bxc3+', 'Qxc3', 'b6'],
                "Queen's Indian (Classical)": ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Be7', 'O-O', 'O-O'],
                "Grünfeld Defense (Exchange)": ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Bc4'],
                "Benoni Defense (Modern)": ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'e4', 'g6']
            },
            "Other d4 Openings": {
                "London System (Modern Main Line)": ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'Nf3', 'Nc6', 'c3', 'e6', 'Nbd2', 'Bd6', 'Bg3'],
                "Dutch Defense (Stonewall)": ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'e6', 'Nf3', 'd5', 'O-O', 'Bd6', 'c4', 'c6']
            }
        },
        "Flank & Other Openings": {
            "English Opening": {
                "Symmetrical (Four Knights)": ['c4', 'c5', 'Nc3', 'Nc6', 'Nf3', 'Nf6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2', 'e5'],
                "Reversed Sicilian": ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2', 'Nb6', 'Nf3', 'Nc6']
            },
            "Réti Opening": {
                "Main Line": ['Nf3', 'd5', 'c4', 'd4', 'b4', 'g6', 'g3', 'Bg7', 'Bb2', 'e5', 'd3']
            },
            "King's Indian Attack": {
                "Main Line vs French Setup": ['Nf3', 'Nf6', 'g3', 'd5', 'Bg2', 'e6', 'O-O', 'Be7', 'd3', 'O-O', 'Nbd2', 'c5', 'e4']
            }
        }
    };

    /**
     * Functions to populate the dropdowns.
     */
    function populateCategories() {
        $categorySelect.empty();
        for (const categoryName in openingBook) {
            $categorySelect.append($('<option>', {
                value: categoryName,
                text: categoryName
            }));
        }
    }

    function populateOpenings(category) {
        $openingSelect.empty();
        if (openingBook[category]) {
            for (const openingName in openingBook[category]) {
                $openingSelect.append($('<option>', {
                    value: openingName,
                    text: openingName
                }));
            }
        }
    }

    function populateVariations(category, opening) {
        $variationSelect.empty();
        if (openingBook[category] && openingBook[category][opening]) {
            for (const variationName in openingBook[category][opening]) {
                $variationSelect.append($('<option>', {
                    value: variationName,
                    text: variationName
                }));
            }
        }
    }

    // --- Highlighting and UI Functions ---
    let squareSelected = null;
    let legalMovesForSelectedPiece = [];
    let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function updateSelectionInfo(message = null) {
        if (message) {
            $selectionInfo.text(message).show();
        } else {
            $selectionInfo.hide();
        }
    }

    function clearHighlights() {
        $('#myBoard .square-55d63').removeClass('highlight-selected highlight-check highlight-checkmate-winner highlight-checkmate-loser');
        legalMovesForSelectedPiece.forEach(move => {
            $('#myBoard .square-' + move.to).removeClass('highlight-legal-move');
        });
        updateSelectionInfo(null);
    }

    function clearArrow() {
        $('.arrow').remove();
        $('defs').find('[id^="arrowhead-"]').remove();
    }

    function drawArrow(from, to) {
        clearArrow();
        const boardElement = $('#myBoard');
        const boardRect = boardElement[0].getBoundingClientRect();
        const squareWidth = boardRect.width / 8;

        const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
        const fromRank = 8 - parseInt(from.charAt(1));
        const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
        const toRank = 8 - parseInt(to.charAt(1));

        const fromX = (fromFile + 0.5) * squareWidth;
        const fromY = (fromRank + 0.5) * squareWidth;
        const toX = (toFile + 0.5) * squareWidth;
        const toY = (toRank + 0.5) * squareWidth;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'arrow');
        svg.setAttribute('width', boardRect.width);
        svg.setAttribute('height', boardRect.height);
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';

        const markerId = 'arrowhead-' + Date.now();
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', markerId);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '7');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('marker-end', 'url(#' + markerId + ')');
        svg.appendChild(line);

        boardElement.append(svg);
    }

    function updateHighlights() {
        clearHighlights();
        if (game.in_check()) {
            const kingSquare = findKing(game.turn());
            $('#myBoard .square-' + kingSquare).addClass('highlight-check');
        }
    }

    function findKing(color) {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const square = 'abcdefgh' [j] + (i + 1);
                const piece = game.get(square);
                if (piece && piece.type === 'k' && piece.color === color) {
                    return square;
                }
            }
        }
        return null;
    }

    // --- Core Chessboard.js Callbacks ---

    function onDragStart(source, piece) {
        if (game.game_over()) return false;

        // Do not allow dragging if it is not the player's turn
        if (game.turn() !== playerColor) {
            return false;
        }

        // Only allow the player to drag their own (white) pieces
        if (piece.search(/^b/) !== -1) {
            return false;
        }

        clearArrow();
        clearHighlights();
    }

    function tryMoveAndHandleOutcome(source, target) {
        clearArrow();
        if (game.game_over()) {
            updateStatus("Game over!", false);
            return 'snapback';
        }

        let moveResult = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (moveResult === null) {
            updateStatus("Illegal move! Try again.", false);
            return 'snapback';
        }

        if (currentMoveIndex < currentOpeningMoves.length) {
            const correctMoveSAN = currentOpeningMoves[currentMoveIndex];
            if (moveResult.san === correctMoveSAN) {
                currentMoveIndex++;
                updateStatus(`Correct! Move: ${moveResult.san} <span class="highlight-correct">(Book Move)</span>`, true);
            } else {
                updateStatus(`Incorrect. The book move is ${correctMoveSAN}. Try again.`, false);
                game.undo();
                board.position(game.fen());
                const tempGame = new Chess(game.fen());
                const correctMove = tempGame.move(correctMoveSAN);
                if (correctMove) {
                    drawArrow(correctMove.from, correctMove.to);
                }
                return 'snapback';
            }
        } else {
            updateStatus(`Your move: ${moveResult.san}`);
        }

        updateHighlights();

        if (game.game_over()) {
            handleGameOver();
        } else {
            if (currentMoveIndex < currentOpeningMoves.length) {
                if (game.turn() !== playerColor) {
                    setTimeout(makeComputerMoveInBookMode, 500);
                }
            } else {
                 if (!twoPlayerModeActive) {
                    twoPlayerModeActive = true;
                    updateStatus("Opening complete! Now play against the bot...", true);
                }
                if (game.turn() !== playerColor) {
                    setTimeout(makeComputerMove, 250);
                }
            }
        }
        return true;
    }


    function onDrop(source, target) {
        const result = tryMoveAndHandleOutcome(source, target);
        if (result === 'snapback') {
            return 'snapback';
        }
    }

    function onSnapEnd() {
        board.position(game.fen());
    }
    
    function onSquareClick(square) {
        clearArrow();
        if (game.game_over() || (twoPlayerModeActive && game.turn() !== playerColor)) {
            return;
        }

        if (squareSelected === null) {
            let piece = game.get(square);
            if (piece && piece.color === game.turn() && game.turn() === playerColor) {
                squareSelected = square;
                $('#myBoard .square-' + square).addClass('highlight-selected');
                legalMovesForSelectedPiece = game.moves({ square: square, verbose: true });
                legalMovesForSelectedPiece.forEach(move => {
                    $('#myBoard .square-' + move.to).addClass('highlight-legal-move');
                });
                updateSelectionInfo(`Selected ${piece.type.toUpperCase()} on ${square}.`);
            }
        } else {
            const source = squareSelected;
            const target = square;

            if (source === target) {
                clearHighlights();
                squareSelected = null;
                return;
            }

            const moveResult = tryMoveAndHandleOutcome(source, target);
            clearHighlights();
            squareSelected = null;

            if (moveResult !== 'snapback') {
                 // Tell chessboard.js to make the move
                 board.move(`${source}-${target}`);
            }
        }
    }


    function makeComputerMoveInBookMode() {
        if (game.game_over()) {
            handleGameOver();
            return;
        }
        if (game.turn() !== playerColor && currentMoveIndex < currentOpeningMoves.length) {
            const moveSAN = currentOpeningMoves[currentMoveIndex];
            const moveResult = game.move(moveSAN, { sloppy: true });
            
            if (moveResult === null) {
                console.error("Computer tried to make an illegal move (from book):", moveSAN);
                updateStatus("Error in opening data!", false);
                return;
            }

            board.position(game.fen());
            updateHighlights();
            currentMoveIndex++;
            updateStatus(`Computer plays: ${moveSAN} <span class="feedback-book">(Book Move)</span>`);

            if (currentMoveIndex >= currentOpeningMoves.length) {
                twoPlayerModeActive = true;
                updateStatus("Opening complete! Now play against the bot...", true);
                // If it's the bot's turn after the opening, make a move.
                if(game.turn() !== playerColor) {
                    setTimeout(makeComputerMove, 500);
                }
            }
        }
    }

    // --- SERVER-SIDE BOT LOGIC ---

    /**
     * Fetches the best move from the server.
     */
    async function getBestMoveFromServer(fen, elo) {
        updateStatus('Bot is thinking...', null);
        try {
            const response = await fetch('http://localhost:3000/best-move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fen: fen,
                    elo: elo, // Send the Elo rating
                    movetime: 1000 // 1 second thinking time
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server responded with status: ${response.status}`);
            }

            const data = await response.json();
            return data.bestmove;

        } catch (error) {
            console.error('Error fetching best move:', error);
            updateStatus('Error: Could not connect to the bot. Please check the server.', false);
            return null;
        }
    }

    /**
     * Makes the computer's move by getting it from the server.
     */
    async function makeComputerMove() {
        if (game.game_over() || game.turn() === playerColor) {
            return;
        }
        
        const currentElo = $eloSlider.val(); // Get current Elo value from the slider
        const bestMove = await getBestMoveFromServer(game.fen(), currentElo);

        if (bestMove) {
            const moveResult = game.move(bestMove, { sloppy: true });
            if (moveResult) {
                board.position(game.fen());
                updateHighlights();
                updateStatus(`Bot plays: ${moveResult.san}`);
            } else {
                 console.error("Server returned an illegal move:", bestMove, "for FEN:", game.fen());
                 updateStatus('Bot returned an illegal move. Continuing game.', false);
            }
        }
        
        if (game.game_over()) {
            handleGameOver();
        }
    }

    // --- Game Over and Status Updates ---

    function handleGameOver() {
        let message = "Game Over!";
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            message = `Checkmate! ${winner} wins!`;
            const loserKingSquare = findKing(game.turn());
            $('#myBoard .square-' + loserKingSquare).addClass('highlight-checkmate-loser');

        } else if (game.in_stalemate()) {
            message = "Stalemate! Game is a draw.";
        } else if (game.in_draw()) {
            message = "Game is a draw.";
        }
        updateStatus(message, false);
        twoPlayerModeActive = false;
    }

    function updateStatus(text, isCorrect) {
        $statusMove.html(text);
        $boardElement.removeClass('highlight-correct highlight-incorrect');
        if (isCorrect === true) {
            $boardElement.addClass('highlight-correct');
        } else if (isCorrect === false) {
            $boardElement.addClass('highlight-incorrect');
        }

        if (thinkingProcess) clearTimeout(thinkingProcess);
        thinkingProcess = setTimeout(() => $boardElement.removeClass('highlight-correct highlight-incorrect'), 1500);
    }

    // --- Event Handlers and Initialization ---

    function startPractice() {
        clearArrow();
        clearHighlights();
        game = new Chess();
        currentMoveIndex = 0;
        twoPlayerModeActive = false;
        $startTwoPlayerBtn.hide();

        const selectedCategory = $categorySelect.val();
        const selectedOpening = $openingSelect.val();
        const selectedVariation = $variationSelect.val();

        if (!selectedCategory || !selectedOpening || !selectedVariation) {
            updateStatus("Error: Please select an opening.", false);
            return;
        }

        currentOpeningMoves = openingBook[selectedCategory][selectedOpening][selectedVariation];
        $statusOpening.text(`${selectedOpening}: ${selectedVariation}`);

        const boardConfig = {
            draggable: true,
            position: 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            onSquareClick: onSquareClick,
            pieceTheme: 'chesspieces/wikipedia/{piece}.png'
        };
        
        if (board) {
            board.destroy();
        }
        board = Chessboard('myBoard', boardConfig);
        $(window).off('resize').on('resize', board.resize);

        updateStatus('Practice started. Your turn (White).');
    }

    $startBtn.on('click', startPractice);
    $resetBtn.on('click', () => {
        startPractice();
        $statusOpening.text("Board Reset");
        $statusMove.text("Select an opening and start.");
    });

    $categorySelect.on('change', function () {
        populateOpenings($(this).val());
        $openingSelect.trigger('change');
    });

    $openingSelect.on('change', function () {
        populateVariations($categorySelect.val(), $(this).val());
    });
    
    // Event listener for the Elo slider
    $eloSlider.on('input', function() {
        $eloValue.text($(this).val());
    });

    $(document).keydown(function (e) {
        if (e.key === 'Escape') {
            clearHighlights();
            clearArrow();
            squareSelected = null;
        }
    });

    // --- Initial Setup ---
    const initialConfig = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        onSquareClick: onSquareClick,
        pieceTheme: 'chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('myBoard', initialConfig);
    $(window).resize(board.resize);

    populateCategories();
    $categorySelect.trigger('change');

    setTimeout(() => {
        startPractice();
    }, 100);
});
