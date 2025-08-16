 
        // All JavaScript is here
        // Use jQuery's ready function for more reliable DOM loading
        $(function() { 
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
                alert("Error: jQuery library failed to load. Please check your internet connection and refresh.");
                return;
            }

            const $ = window.jQuery;

            // MODIFICATION: Game state variables
            let board = null;
            let game = new Chess();
            let currentOpeningMoves = [];
            let currentMoveIndex = 0;
            const playerColor = 'w'; // Player is always White
            let twoPlayerModeActive = false;
            let thinkingProcess = null;
            // END MODIFICATION

            // MODIFICATION: DOM Elements updated for the new UI
            const $statusOpening = $('#status-opening');
            const $statusMove = $('#status-move');
            const $boardElement = $('#myBoard');
            const $categorySelect = $('#category-select'); 
            const $openingSelect = $('#opening-select');
            const $variationSelect = $('#variation-select'); // NEW: Variation dropdown
            const $startBtn = $('#start-btn');
            const $resetBtn = $('#reset-btn');
            const $undoBtn = $('#undo-btn'); 
            const $startTwoPlayerBtn = $('#start-bot-btn');
            const $evaluationDisplay = $('#evaluation-display');
            const $selectionInfo = $('#selection-info');
            // END MODIFICATION
            
            // Ensure board has relative positioning for proper arrow alignment
            $boardElement.css('position', 'relative');

            // --- NEW, DEEPLY CATEGORIZED OPENING BOOK ---
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
            // END MODIFICATION

            // --- NEW DYNAMIC DROPDOWN POPULATION LOGIC ---
            /**
             * Populates the category dropdown.
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

            /**
             * Populates the openings dropdown based on the selected category.
             * @param {string} category - The name of the selected category.
             */
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
            
            /**
             * Populates the variations dropdown based on the selected category and opening.
             * @param {string} category - The name of the selected category.
             * @param {string} opening - The name of the selected opening.
             */
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
            // END NEW LOGIC

            /**
             * Displays a status message in the evaluation display area.
             * @param {string} [statusMessage=null] - The message to display.
             */
            function displayEvaluation(statusMessage = null) {
                $evaluationDisplay.empty().removeClass('eval-white eval-black eval-even');

                if (statusMessage) { 
                    $evaluationDisplay.text(statusMessage);
                } else {
                    $evaluationDisplay.text('Game In Progress'); 
                }
            }

            // --- Click-to-Move and Highlighting Variables ---
            let squareSelected = null; 
            let legalMovesForSelectedPiece = [];
            let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0; // Better touch detection

            /**
             * Updates the selection info display.
             * @param {string} [message=null] - The message to display, or null to hide the display.
             */
            function updateSelectionInfo(message = null) {
                if (message) {
                    $selectionInfo.text(message).show();
                } else {
                    $selectionInfo.hide();
                }
            }

            /**
             * Clears all visual highlights from the board (selection, legal moves, check, etc.).
             */
            function clearHighlights() {
                $('#myBoard .square-55d63').removeClass('highlight-selected highlight-check highlight-checkmate-winner highlight-checkmate-loser');
                legalMovesForSelectedPiece.forEach(move => {
                    $('#myBoard .square-' + move.to).removeClass('highlight-legal-move');
                });
                updateSelectionInfo(null);
            }

            /**
             * Clears any arrows from the board.
             */
            function clearArrow() {
                $('.arrow').remove();
                // Also clean up any arrowhead markers that might be left in defs
                $('defs').find('[id^="arrowhead-"]').remove();
            }

            /**
             * Draws an arrow on the board from a starting square to an ending square.
             * @param {string} from - The starting square in algebraic notation (e.g., 'e2').
             * @param {string} to - The ending square in algebraic notation (e.g., 'e4').
             */
            function drawArrow(from, to) {
                clearArrow();
                const boardElement = $('#myBoard');
                const boardPosition = boardElement.position();
                const boardRect = boardElement[0].getBoundingClientRect();
                const squareWidth = boardRect.width / 8;
                const squareHeight = boardRect.height / 8;
                
                // Convert algebraic notation to coordinates
                const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
                const fromRank = 8 - parseInt(from.charAt(1));
                const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
                const toRank = 8 - parseInt(to.charAt(1));
                
                // Calculate centers based on square position within the board
                const fromX = (fromFile + 0.5) * squareWidth;
                const fromY = (fromRank + 0.5) * squareHeight;
                const toX = (toFile + 0.5) * squareWidth;
                const toY = (toRank + 0.5) * squareHeight;

                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'arrow');
                svg.setAttribute('width', boardRect.width);
                svg.setAttribute('height', boardRect.height);
                svg.style.position = 'absolute';
                svg.style.top = '0';
                svg.style.left = '0';
                
                // Create unique ID for this arrow's marker to avoid conflicts
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

            /**
             * Updates the board to highlight the king if it is in check.
             */
            function updateHighlights() {
                clearHighlights();
                if (game.in_check()) {
                    const kingSquare = findKing(game.turn());
                    $('#myBoard .square-' + kingSquare).addClass('highlight-check');
                }
            }

            /**
             * Finds the square of the king for a given color.
             * @param {string} color - The color of the king to find ('w' or 'b').
             * @returns {string|null} The square of the king or null if not found.
             */
            function findKing(color) {
                for (let i = 0; i < 8; i++) {
                    for (let j = 0; j < 8; j++) {
                        const square = 'abcdefgh'[j] + (i + 1);
                        const piece = game.get(square);
                        if (piece && piece.type === 'k' && piece.color === color) {
                            return square;
                        }
                    }
                }
                return null;
            }

            /**
             * Handles the logic for when a square is clicked on the board.
             * This function is now called for both mouse clicks and touch taps.
             * @param {string} square - The square that was clicked/tapped.
             */
            function onSquareClick(square) {
                clearArrow(); // Clear any previous arrows
                if (game.game_over()) {
                    updateStatus("Game is over!", false);
                    return;
                }

                if (currentMoveIndex < currentOpeningMoves.length) {
                    if (game.turn() !== playerColor) {
                        updateStatus("It's not your turn to play book moves! You are White.", false);
                        return;
                    }
                    handlePlayerMoveInBookMode(square);
                    return;
                }

                // Standard game mode (after opening or two-player)
                if (squareSelected === null) {
                    // No piece selected, try to select one
                    let piece = game.get(square);
                    if (piece && piece.color === game.turn()) {
                        squareSelected = square;
                        $('#myBoard .square-' + square).addClass('highlight-selected');
                        legalMovesForSelectedPiece = game.moves({ square: square, verbose: true });
                        legalMovesForSelectedPiece.forEach(move => {
                            $('#myBoard .square-' + move.to).addClass('highlight-legal-move');
                        });
                        updateSelectionInfo(`Selected ${piece.type.toUpperCase()} on ${square}. Click destination square or press ESC to deselect.`);
                        updateStatus(`Piece selected.`);
                    }
                } else {
                    // A piece is already selected, try to move it to the new square
                    let move = game.move({
                        from: squareSelected,
                        to: square,
                        promotion: 'q' // Always promote to queen for simplicity in this trainer
                    });

                    clearHighlights(); // Clear highlights regardless of move validity

                    if (move === null) {
                        // Illegal move or clicking on empty square / opponent piece
                        if (game.get(square) && game.get(square).color === game.turn() && squareSelected !== square) {
                            // If re-selecting own piece, handle it
                             squareSelected = square;
                             clearHighlights(); // Clear old selection
                             $('#myBoard .square-' + square).addClass('highlight-selected');
                             legalMovesForSelectedPiece = game.moves({ square: square, verbose: true });
                             legalMovesForSelectedPiece.forEach(move => {
                                 $('#myBoard .square-' + move.to).addClass('highlight-legal-move');
                             });
                             updateSelectionInfo(`Re-selected piece on ${square}.`);
                             updateStatus('Piece re-selected.');
                        } else {
                            // Truly illegal move or click on opponent piece/empty square (after selection)
                            squareSelected = null; // Deselect on illegal move
                            legalMovesForSelectedPiece = [];
                            updateStatus("Illegal move! Try again.", false);
                        }
                        board.position(game.fen()); // Reset board position visually in case of drag issues
                        return;
                    } else {
                        // Valid move made
                        squareSelected = null; // Clear selection
                        legalMovesForSelectedPiece = [];
                        board.position(game.fen()); // Update board visual
                        updateStatus(`Move: ${move.san}`);
                        updateHighlights(); // Update check highlights
                        
                        if (!game.game_over()) {
                            if (game.turn() === playerColor) {
                                $statusMove.text(`Player ${game.turn() === 'w' ? 'White' : 'Black'}'s turn.`);
                            } else if (twoPlayerModeActive) {
                                // Computer's turn after opening if in two-player mode
                                setTimeout(makeComputerMove, 500);
                            } else {
                                $statusMove.text(`Player ${game.turn() === 'w' ? 'White' : 'Black'}'s turn.`);
                            }
                        } else {
                            handleGameOver(); // Game ended
                        }
                    }
                }
            }

            /**
             * Handles player moves during the opening practice phase.
             * @param {string} source - The source square of the move.
             * @param {string} [target=null] - The target square of the move (for drag-and-drop).
             */
            function handlePlayerMoveInBookMode(source, target = null) {
                clearArrow();
                let moveResult;
                const currentFenBeforeMove = game.fen();

                // If target is null, it's a click-to-move scenario
                if (target === null) {
                    let square = source;
                    if (squareSelected === null) {
                        // First click: select piece
                        let piece = game.get(square);
                        if (piece && piece.color === game.turn()) {
                            squareSelected = square;
                            $('#myBoard .square-' + square).addClass('highlight-selected');
                            legalMovesForSelectedPiece = game.moves({ square: square, verbose: true });
                            legalMovesForSelectedPiece.forEach(move => {
                                $('#myBoard .square-' + move.to).addClass('highlight-legal-move');
                            });
                            updateSelectionInfo(`Selected ${piece.type.toUpperCase()} on ${square}. Click destination square or press ESC to deselect.`);
                            updateStatus(`Piece selected.`);
                        }
                        return; // Wait for the second click
                    } else if (squareSelected === square) {
                        // Clicking on the same piece deselects it
                        clearHighlights();
                        squareSelected = null;
                        legalMovesForSelectedPiece = [];
                        updateStatus('Piece deselected. Click on a piece to select it.');
                        return;
                    }

                    // Second click: attempt to move
                    moveResult = game.move({ from: squareSelected, to: square, promotion: 'q' });
                    clearHighlights();
                    squareSelected = null; // Clear selection after attempted move
                } else {
                    // Drag-and-drop scenario
                    moveResult = game.move({ from: source, to: target, promotion: 'q' });
                }

                if (moveResult === null) {
                    // Invalid move
                    updateStatus("Illegal move! Try again.", false);
                    board.position(game.fen()); // Revert board state if invalid
                    return 'snapback'; // For chessboard.js onDrop
                }
                
                // Valid move
                board.position(game.fen());
                updateHighlights();

                const correctMoveSAN = currentOpeningMoves[currentMoveIndex];
                
                if (moveResult.san === correctMoveSAN) {
                    // Correct book move
                    currentMoveIndex++;
                    updateStatus(`Correct! Move: ${moveResult.san} <span class="highlight-correct">(Book Move)</span>`, true);

                    if (currentMoveIndex < currentOpeningMoves.length) {
                        setTimeout(makeComputerMoveInBookMode, 500); // Computer's turn for next book move
                    } else {
                        // Opening complete
                        updateStatus("Opening complete! Now playing against computer...", true);
                        twoPlayerModeActive = true;
                        $startTwoPlayerBtn.hide(); // Hide button as it's now computer play
                        if (game.turn() !== playerColor) {
                            setTimeout(makeComputerMove, 500); // Computer's first move in free play
                        } else {
                            updateStatus('Your turn.');
                        }
                    }
                    return true; // For chessboard.js onDrop
                } else {
                    // Incorrect book move
                    updateStatus(`Incorrect. The book move is ${correctMoveSAN}. Try again.`, false);
                    const tempGame = new Chess(currentFenBeforeMove); // Create temp game to get correct move details
                    const correctMove = tempGame.move(correctMoveSAN);
                    drawArrow(correctMove.from, correctMove.to); // Show correct move with arrow
                    game.undo(); // Revert player's incorrect move
                    board.position(game.fen()); // Update board visually
                    return 'snapback'; // For chessboard.js onDrop
                }
            }

            /**
             * Handles the drop event for drag-and-drop moves.
             * This will only be called if `draggable: true` is enabled in Chessboard.js config.
             * @param {string} source - The source square.
             * @param {string} target - The target square.
             * @returns {string|boolean} 'snapback' to revert the piece, true for success.
             */
            function onDrop(source, target) {
                clearArrow();
                if (game.game_over()) {
                    updateStatus("Game is over!", false);
                    return 'snapback';
                }
                
                // If in opening book mode
                if (currentMoveIndex < currentOpeningMoves.length) {
                    if (game.turn() !== playerColor) {
                        updateStatus("It's not your turn to play book moves! You are White.", false);
                        return 'snapback';
                    }
                    return handlePlayerMoveInBookMode(source, target); // Call book mode handler for drop
                } 
                
                // If not in opening book mode, or after opening completed
                if (game.get(source) && game.get(source).color !== game.turn()) {
                    updateStatus(`It's not ${game.turn() === 'w' ? 'White' : 'Black'}'s turn!`, false);
                    return 'snapback';
                }

                let move = game.move({ from: source, to: target, promotion: 'q' });

                if (move === null) {
                    updateStatus("Illegal move! Try again.", false);
                    return 'snapback';
                }
                
                updateStatus(`Move: ${move.san}`);
                updateHighlights();
                if (!game.game_over()) {
                    if (game.turn() === playerColor) {
                        $statusMove.text(`Player ${game.turn() === 'w' ? 'White' : 'Black'}'s turn.`);
                    } else if (twoPlayerModeActive) {
                        setTimeout(makeComputerMove, 500);
                    } else {
                        $statusMove.text(`Player ${game.turn() === 'w' ? 'White' : 'Black'}'s turn.`);
                    }
                } else {
                    handleGameOver();
                }
                return true; 
            }

            /**
             * Makes the next move for the computer during the opening practice.
             */
            function makeComputerMoveInBookMode() {
                if (game.game_over()) {
                    handleGameOver();
                    return;
                }
                if (game.turn() !== playerColor && currentMoveIndex < currentOpeningMoves.length) {
                    const moveSAN = currentOpeningMoves[currentMoveIndex];
                    const moveResult = game.move(moveSAN, { sloppy: true });
                    if (moveResult === null) {
                        console.error("Computer tried to make an illegal move (from book):", moveSAN, "from FEN:", game.fen());
                        updateStatus("Error in opening data! Computer tried an illegal move. Reset board.", false);
                        return;
                    }
                    board.position(game.fen());
                    updateHighlights();
                    currentMoveIndex++;
                    updateStatus(`Computer plays: ${moveSAN} <span class="feedback-book">(Book Move)</span>`);
                    
                    if (currentMoveIndex >= currentOpeningMoves.length) {
                        updateStatus("Opening complete! Now playing against computer...", true);
                        twoPlayerModeActive = true; 
                        $startTwoPlayerBtn.hide();
                        // Continue with computer moves after opening
                        if (game.turn() !== playerColor) {
                            setTimeout(makeComputerMove, 500);
                        } else {
                            updateStatus('Your turn.');
                        }
                    } else if (game.turn() === playerColor) {
                        updateStatus('Your turn.');
                    } else {
                        setTimeout(makeComputerMoveInBookMode, 500);
                    }
                } else {
                    console.log("Not computer's book move turn. Skipping makeComputerMoveInBookMode.");
                }
            }

            // --- Chess Master Engine: Advanced Opening Book + Strong Search ---
            const ENGINE_CONFIG = {
                maxDepth: 6,
                maxThinkTimeMs: 1000,
                quiescenceMaxDepth: 10,
                enableQuiescence: true,
                useOpeningBook: true,
                useEndgameTablebase: true
            };
            
            // Opening book for common positions
            const openingBookMoves = {
                // Starting position
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": ["e4", "d4", "Nf3"],
                // After 1.e4
                "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3": ["c5", "e5", "e6", "c6"],
                // After 1.d4
                "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3": ["Nf6", "d5", "e6"],
                // Common Sicilian
                "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6": ["Nf3", "Nc3"],
                // Common e5 response
                "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6": ["Nf3", "Bc4"]
            };
            
            // Endgame tablebase for common positions
            const endgameTablebase = {
                // King and queen vs king
                "K and Q vs K": (fen) => {
                    // Logic to find optimal moves in KQ vs K endgames
                    return null; // Will use search if no tablebase move found
                },
                // King and rook vs king
                "K and R vs K": (fen) => {
                    // Logic for KR vs K endgames
                    return null;
                }
            };
            
            let tt = new Map(); // Transposition table keyed by FEN
            let killerMoves = {}; // ply -> [{from,to,promotion}, {..}]
            let historyHeuristic = {}; // key "from_to" -> score
            let searchAbortTime = 0;
            let searchAborted = false;
            let nodesVisited = 0;
            
            // Store best moves found to avoid repeating search
            let cachedBestMoves = new Map();

            function resetSearchState() {
                tt.clear();
                killerMoves = {};
                historyHeuristic = {};
                searchAborted = false;
                nodesVisited = 0;
            }

            const INF = 1e9;
            const MATE_SCORE = 1000000;
            const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

            function pieceSquareScore(piece, fileIdx, rankIdx, isEndgame) {
                // Simple piece-square tables (center preference); values are modest
                const centerBonus = ([3,4].includes(fileIdx) && [3,4].includes(rankIdx)) ? 10 : 0;
                if (piece.type === 'p') return 5 * (piece.color === 'w' ? rankIdx : (7 - rankIdx)) + centerBonus;
                if (piece.type === 'n') return 5 + centerBonus * 2;
                if (piece.type === 'b') return 5 + centerBonus * 2;
                if (piece.type === 'r') return 2 + centerBonus;
                if (piece.type === 'q') return centerBonus;
                if (piece.type === 'k') return isEndgame ? centerBonus * 2 : 0;
                return 0;
            }

            function isEndgameLike() {
                // Rough heuristic: endgame if queens are off or total material < threshold
                let total = 0;
                for (let r = 1; r <= 8; r++) {
                    for (let f = 0; f < 8; f++) {
                        const sq = 'abcdefgh'[f] + r;
                        const pc = game.get(sq);
                        if (!pc) continue;
                        total += (PIECE_VALUES[pc.type] || 0);
                    }
                }
                return total < 2000 || !game.fen().includes('q');
            }

            function staticEvaluate() {
                // Material, piece-square tables, mobility, king safety, pawn structure
                let score = 0;
                const endgame = isEndgameLike();
                
                // Piece values and positioning
                for (let rank = 1; rank <= 8; rank++) {
                    for (let file = 0; file < 8; file++) {
                        const square = 'abcdefgh'[file] + rank;
                        const piece = game.get(square);
                        if (!piece) continue;
                        const sign = piece.color === 'w' ? 1 : -1;
                        score += sign * ((PIECE_VALUES[piece.type] || 0) + pieceSquareScore(piece, file, rank - 1, endgame));
                    }
                }
                
                // Mobility - more moves is better
                const mobilityWhite = countMovesFor('w');
                const mobilityBlack = countMovesFor('b');
                score += 2 * (mobilityWhite - mobilityBlack);
                
                // King safety - penalize exposed king
                const whiteKingSquare = findKing('w');
                const blackKingSquare = findKing('b');
                if (whiteKingSquare && blackKingSquare) {
                    const whiteKingSafety = evaluateKingSafety(whiteKingSquare, 'w', endgame);
                    const blackKingSafety = evaluateKingSafety(blackKingSquare, 'b', endgame);
                    score += whiteKingSafety - blackKingSafety;
                }
                
                // Pawn structure - doubled, isolated, passed pawns
                const whitePawnStructure = evaluatePawnStructure('w');
                const blackPawnStructure = evaluatePawnStructure('b');
                score += whitePawnStructure - blackPawnStructure;
                
                // Control of center
                const whiteCenterControl = evaluateCenterControl('w');
                const blackCenterControl = evaluateCenterControl('b');
                score += whiteCenterControl - blackCenterControl;
                
                // Check status - being in check is bad
                if (game.in_check()) {
                    score += (game.turn() === 'w' ? -20 : 20);
                }
                
                // Convert to side-to-move perspective for negamax
                const sideSign = (game.turn() === 'w') ? 1 : -1;
                return sideSign * score;
            }
            
            function evaluateKingSafety(kingSquare, color, isEndgame) {
                if (!kingSquare) return 0;
                
                const file = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
                const rank = parseInt(kingSquare.charAt(1)) - 1;
                
                let safety = 0;
                
                // In the opening/middlegame, king should stay back
                if (!isEndgame) {
                    // Penalize king in the center
                    if (file > 1 && file < 6) safety -= 30;
                    
                    // Reward king in the corner
                    if ((file <= 1 || file >= 6) && (rank <= 1 || rank >= 6)) safety += 20;
                    
                    // Reward king behind pawn shield
                    const pawnShield = countPawnShield(kingSquare, color);
                    safety += pawnShield * 15;
                } else {
                    // In endgame, king should move to center
                    if (file > 1 && file < 6 && rank > 1 && rank < 6) safety += 20;
                }
                
                return color === 'w' ? safety : -safety;
            }
            
            function countPawnShield(kingSquare, color) {
                const file = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
                const rank = parseInt(kingSquare.charAt(1));
                
                let count = 0;
                const rankOffset = color === 'w' ? 1 : -1;
                const baseRank = color === 'w' ? rank + 1 : rank - 1;
                
                // Check pawns in front of king
                for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
                    const pawnSquare = 'abcdefgh'[f] + baseRank;
                    const piece = game.get(pawnSquare);
                    if (piece && piece.type === 'p' && piece.color === color) {
                        count++;
                    }
                }
                
                return count;
            }
            
            function evaluatePawnStructure(color) {
                let score = 0;
                const pawnPositions = [];
                const files = [0, 0, 0, 0, 0, 0, 0, 0]; // Count of pawns on each file
                
                // Find all pawns
                for (let rank = 1; rank <= 8; rank++) {
                    for (let file = 0; file < 8; file++) {
                        const square = 'abcdefgh'[file] + rank;
                        const piece = game.get(square);
                        if (piece && piece.type === 'p' && piece.color === color) {
                            pawnPositions.push({ file, rank });
                            files[file]++;
                        }
                    }
                }
                
                // Doubled pawns (bad)
                for (let i = 0; i < 8; i++) {
                    if (files[i] > 1) {
                        score -= 10 * (files[i] - 1);
                    }
                }
                
                // Isolated pawns (bad)
                for (let i = 0; i < 8; i++) {
                    if (files[i] > 0) {
                        const leftSupport = i > 0 ? files[i - 1] > 0 : false;
                        const rightSupport = i < 7 ? files[i + 1] > 0 : false;
                        if (!leftSupport && !rightSupport) {
                            score -= 15;
                        }
                    }
                }
                
                // Passed pawns (good)
                for (const pawn of pawnPositions) {
                    if (isPassed(pawn.file, pawn.rank, color)) {
                        const advancementBonus = color === 'w' ? pawn.rank : (9 - pawn.rank);
                        score += 10 + 5 * advancementBonus;
                    }
                }
                
                return color === 'w' ? score : -score;
            }
            
            function isPassed(file, rank, color) {
                const enemyColor = color === 'w' ? 'b' : 'w';
                const direction = color === 'w' ? 1 : -1;
                const startRank = color === 'w' ? rank + 1 : rank - 1;
                const endRank = color === 'w' ? 8 : 1;
                
                // Check if there are enemy pawns ahead or diagonally ahead
                for (let r = startRank; color === 'w' ? r <= endRank : r >= endRank; r += direction) {
                    // Check file and adjacent files
                    for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
                        const square = 'abcdefgh'[f] + r;
                        const piece = game.get(square);
                        if (piece && piece.type === 'p' && piece.color === enemyColor) {
                            return false;
                        }
                    }
                }
                
                return true;
            }
            
            function evaluateCenterControl(color) {
                const centerSquares = ['d4', 'e4', 'd5', 'e5'];
                let score = 0;
                
                // Count attacks on center squares
                for (const square of centerSquares) {
                    if (isSquareAttackedBy(square, color)) {
                        score += 5;
                    }
                }
                
                // Bonus for occupying center with pieces
                for (const square of centerSquares) {
                    const piece = game.get(square);
                    if (piece && piece.color === color) {
                        score += piece.type === 'p' ? 10 : 15;
                    }
                }
                
                return color === 'w' ? score : -score;
            }
            
            function isSquareAttackedBy(square, color) {
                // Use chess.js's built-in method if available
                if (typeof game.isAttacked === 'function') {
                    return game.isAttacked(square, color);
                }
                
                // Fallback: manually check if any piece of given color can move to the square
                const originalFen = game.fen();
                const parts = originalFen.split(' ');
                parts[1] = color;
                const fenForColor = parts.join(' ');
                const tempGame = new Chess(fenForColor);
                
                const moves = tempGame.moves({ verbose: true });
                return moves.some(m => m.to === square);
            }

            function countMovesFor(color) {
                // Quick mobility estimate by switching turn via FEN hack
                const originalFen = game.fen();
                const parts = originalFen.split(' ');
                parts[1] = color;
                const fenForColor = parts.join(' ');
                const tmp = new Chess(fenForColor);
                return tmp.moves().length;
            }

            function orderMoves(moves, ply) {
                // MVV-LVA + killer + history + checks ordering
                const scored = moves.map((m) => {
                    const isCapture = !!m.captured;
                    let score = 0;
                    if (isCapture) {
                        score += 10000 + (PIECE_VALUES[m.captured] || 0) - (PIECE_VALUES[m.piece] || 0);
                    }
                    // Killer
                    const killers = killerMoves[ply] || [];
                    if (killers.some(k => k.from === m.from && k.to === m.to && (k.promotion || 'q') === (m.promotion || 'q'))) {
                        score += 5000;
                    }
                    // History
                    const key = m.from + '_' + m.to;
                    score += (historyHeuristic[key] || 0);

                    // Quick check bonus: make and unmake
                    game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                    if (game.in_check()) score += 3000;
                    game.undo();

                    return { move: m, score };
                });
                scored.sort((a, b) => b.score - a.score);
                return scored.map(s => s.move);
            }

            function estimateComplexity() {
                const moves = game.moves({ verbose: true });
                const hasTactical = moves.some(m => m.captured || m.promotion || (m.san && (m.san.includes('+') || m.san.includes('#'))));
                return { movesCount: moves.length, hasTactical };
            }

            function computeAllocatedTimeMs() {
                let t = ENGINE_CONFIG.maxThinkTimeMs;
                const info = estimateComplexity();
                if (game.in_check() || info.hasTactical || info.movesCount > 30) t += 400;
                if (info.movesCount > 40) t += 200;
                if (isTouchDevice) { // Consider touch devices might need shorter think times for responsiveness
                    t = Math.min(t, 800); // Reduce max think time on touch devices
                }
                return t;
            }

            function qSearch(alpha, beta, qDepth) {
                if (Date.now() > searchAbortTime) { searchAborted = true; return alpha; }
                nodesVisited++;
                const standPat = staticEvaluate();
                if (standPat >= beta) return beta;
                if (alpha < standPat) alpha = standPat;
                if (!ENGINE_CONFIG.enableQuiescence || qDepth <= 0) return alpha;
                const moves = game.moves({ verbose: true }).filter(m => m.captured || m.promotion);
                if (moves.length === 0) return alpha;
                for (const m of orderMoves(moves, 0)) {
                    game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                    const score = -qSearch(-beta, -alpha, qDepth - 1);
                    game.undo();
                    if (score >= beta) return beta;
                    if (score > alpha) alpha = score;
                }
                return alpha;
            }

            function negamax(depth, alpha, beta, ply) {
                if (Date.now() > searchAbortTime) { searchAborted = true; return 0; }
                nodesVisited++;

                // Terminal states
                if (game.in_checkmate()) return -(MATE_SCORE - ply);
                if (game.in_stalemate() || game.in_draw() || game.insufficient_material()) return 0;

                const ttKey = game.fen();
                const ttEntry = tt.get(ttKey);
                if (ttEntry && ttEntry.depth >= depth) {
                    if (ttEntry.flag === 'EXACT') return ttEntry.score;
                    if (ttEntry.flag === 'LOWER' && ttEntry.score > alpha) alpha = ttEntry.score;
                    else if (ttEntry.flag === 'UPPER' && ttEntry.score < beta) beta = ttEntry.score;
                    if (alpha >= beta) return ttEntry.score;
                }

                if (depth === 0) {
                    return qSearch(alpha, beta, ENGINE_CONFIG.quiescenceMaxDepth);
                }

                let bestScore = -INF;
                let bestLocalMove = null;
                let flag = 'UPPER';

                const moves = orderMoves(game.moves({ verbose: true }), ply);
                if (moves.length === 0) {
                    // No legal moves: already handled by checkmate/stalemate above
                    return staticEvaluate();
                }

                for (const m of moves) {
                    game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                    const score = -negamax(depth - 1, -beta, -alpha, ply + 1);
                        game.undo();

                    if (searchAborted) return 0;

                    if (score > bestScore) {
                        bestScore = score;
                        bestLocalMove = m;
                    }
                    if (score > alpha) {
                        alpha = score;
                        flag = 'EXACT';
                        // History heuristic update
                        const key = m.from + '_' + m.to;
                        historyHeuristic[key] = (historyHeuristic[key] || 0) + depth * depth;
                    }
                    if (alpha >= beta) {
                        // Beta cutoff: store killer move
                        killerMoves[ply] = killerMoves[ply] || [];
                        killerMoves[ply].unshift({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                        if (killerMoves[ply].length > 2) killerMoves[ply].length = 2;
                        flag = 'LOWER';
                        break;
                    }
                }

                tt.set(ttKey, { depth, score: bestScore, flag });
                return bestScore;
            }

            // Check opening book for the current position
            function checkOpeningBook() {
                if (!ENGINE_CONFIG.useOpeningBook) return null;
                
                // Get a simplified FEN (just the position and side to move)
                const fen = game.fen();
                const simpleFen = fen.split(' ').slice(0, 3).join(' ');
                
                // Check if we have this position in our opening book
                for (const bookFen in openingBookMoves) {
                    if (fen.startsWith(bookFen) || simpleFen.startsWith(bookFen)) {
                        const bookMoves = openingBookMoves[bookFen];
                        // Try each book move in order
                        for (const moveStr of bookMoves) {
                            try {
                                // Validate move is legal in current position
                                const moveObj = game.move(moveStr);
                                game.undo(); // Don't actually make the move yet
                                if (moveObj) {
                                    console.log("Using opening book move:", moveStr);
                                    return moveObj;
                                }
                            } catch (e) {
                                // Move wasn't valid, try next one
                                console.log("Book move not valid:", moveStr);
                            }
                        }
                    }
                }
                return null;
            }
            
            // Check endgame tablebase
            function checkEndgameTablebase() {
                if (!ENGINE_CONFIG.useEndgameTablebase) return null;
                
                // Count pieces to see if we're in an endgame
                const fen = game.fen();
                const pieceCount = (fen.match(/[pnbrqkPNBRQK]/g) || []).length;
                
                if (pieceCount <= 5) {
                    // We're in an endgame with 5 or fewer pieces
                    // Check our tablebase
                    for (const endgameType in endgameTablebase) {
                        const tablebaseMove = endgameTablebase[endgameType](fen);
                        if (tablebaseMove) return tablebaseMove;
                    }
                }
                return null;
            }

            function findBestMoveIterative(thinkTimeMs) {
                // First check cache
                const fen = game.fen();
                if (cachedBestMoves.has(fen)) {
                    console.log("Using cached best move");
                    return cachedBestMoves.get(fen);
                }
                
                // Check opening book
                const bookMove = checkOpeningBook();
                if (bookMove) {
                    cachedBestMoves.set(fen, bookMove);
                    return bookMove;
                }
                
                // Check endgame tablebase
                const tablebaseMove = checkEndgameTablebase();
                if (tablebaseMove) {
                    cachedBestMoves.set(fen, tablebaseMove);
                    return tablebaseMove;
                }
                
                // Fall back to search
                resetSearchState();
                searchAbortTime = Date.now() + thinkTimeMs;
                let bestMove = null;
                let bestScore = -INF;
                
                // Get all legal moves
                const rootMoves = orderMoves(game.moves({ verbose: true }), 0);
                if (rootMoves.length === 0) return null;
                
                // If only one legal move, play it immediately
                if (rootMoves.length === 1) {
                    console.log("Only one legal move available");
                    return rootMoves[0];
                }
                
                // Iterative deepening search
                for (let depth = 1; depth <= ENGINE_CONFIG.maxDepth; depth++) {
                    let localBest = null;
                    let localBestScore = -INF;

                    for (const m of rootMoves) {
                        game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                        const score = -negamax(depth - 1, -INF, INF, 1);
                        game.undo();
                        if (searchAborted) break;
                        if (score > localBestScore) {
                            localBestScore = score;
                            localBest = m;
                        }
                    }

                    if (!searchAborted && localBest) {
                        bestMove = localBest;
                        bestScore = localBestScore;
                        console.log(`Completed depth ${depth}, best move: ${bestMove.san}, score: ${bestScore}`);
                    } else {
                        break; // time ran out during this depth
                    }
                }
                
                // Cache the result
                if (bestMove) {
                    cachedBestMoves.set(fen, bestMove);
                }
                
                return bestMove;
            }

            function applyMoveSpec(m) {
                return game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
            }

            // Advanced move selection with fallback strategies
            function makeComputerMove() {
                if (game.game_over()) { handleGameOver(); return; }
                if (game.turn() === playerColor) { return; }
                
                updateStatus('Chess Master is thinking...');
                
                setTimeout(() => {
                    // Get all legal moves
                    const legalMoves = game.moves({ verbose: true });
                    if (legalMoves.length === 0) {
                        handleGameOver();
                        return;
                    }
                    
                    // Allocate thinking time based on position complexity
                    const thinkMs = computeAllocatedTimeMs();
                    
                    // Find best move with our advanced engine
                    let best = findBestMoveIterative(thinkMs);
                    
                    // Fallback strategy if no move was found
                    if (!best) {
                        console.log("Primary search failed, using fallback strategy");
                        
                        // First try: pick a move that gives check
                        const checkingMoves = legalMoves.filter(m => {
                            game.move(m);
                            const givesCheck = game.in_check();
                            game.undo();
                            return givesCheck;
                        });
                        
                        if (checkingMoves.length > 0) {
                            best = checkingMoves[Math.floor(Math.random() * checkingMoves.length)];
                        } else {
                            // Second try: pick a capturing move
                            const capturingMoves = legalMoves.filter(m => m.captured);
                            if (capturingMoves.length > 0) {
                                best = capturingMoves[Math.floor(Math.random() * capturingMoves.length)];
                            } else {
                                // Last resort: pick any legal move
                                best = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                            }
                        }
                    }
                    
                    // Apply the selected move
                    const result = applyMoveSpec(best);
                    
                    // Update the board and status
                    board.position(game.fen());
                    updateHighlights();
                    
                    // Display appropriate message based on move type
                    if (result.san.includes('#')) {
                        updateStatus(`Chess Master plays: ${result.san} - Checkmate!`, true);
                    } else if (result.san.includes('+')) {
                        updateStatus(`Chess Master plays: ${result.san} - Check!`);
                    } else if (result.captured) {
                        updateStatus(`Chess Master plays: ${result.san} - Captures ${result.captured.toUpperCase()}`);
                    } else {
                        updateStatus(`Chess Master plays: ${result.san}`);
                    }
                    
                    // Handle game continuation
                    if (!game.game_over()) {
                        if (game.turn() === playerColor) {
                            updateStatus('Your turn.');
                        } else {
                            setTimeout(makeComputerMove, 400);
                        }
                    } else {
                        handleGameOver();
                    }
                }, 10);
            }

            /**
             * Handles the end of the game, displaying the result and animations.
             */
            function handleGameOver() {
                if (game.in_checkmate()) {
                    const loserColor = game.turn();
                    const winnerColor = loserColor === 'w' ? 'b' : 'w';
                    const loserKingSquare = findKing(loserColor);
                    const winnerKingSquare = findKing(winnerColor);

                    $('#myBoard .square-' + loserKingSquare).addClass('highlight-checkmate-loser');
                    $('#myBoard .square-' + winnerKingSquare).addClass('highlight-checkmate-winner');
                    
                    const loserKingPiece = $('#myBoard .square-' + loserKingSquare).find('img');
                    loserKingPiece.addClass('king-capture-animation');

                    updateStatus(`Game Over! Checkmate. ${winnerColor === 'w' ? 'White' : 'Black'} wins!`, true);

                } else if (game.in_stalemate()) {
                    updateStatus("Game Over! Stalemate. It's a draw.", false);
                } else if (game.in_draw()) {
                    updateStatus("Game Over! Draw.", false);
                } else if (game.in_threefold_repetition()) {
                    updateStatus("Game Over! Draw by threefold repetition.", false);
                } else if (game.insufficient_material()) {
                    updateStatus("Game Over! Draw by insufficient material.", false);
                }
                twoPlayerModeActive = false;
                $startTwoPlayerBtn.hide();
                $evaluationDisplay.empty(); 
                console.log('Game Over. All states cleared.');
            }

            /**
             * Updates the status message and board highlight.
             * @param {string} text - The message to display.
             * @param {boolean} isCorrect - Whether the move was correct or not.
             */
            function updateStatus(text, isCorrect) {
                $statusMove.html(text);
                $boardElement.removeClass('highlight-correct highlight-incorrect');
                if (isCorrect === true) { $boardElement.addClass('highlight-correct'); }
                else if (isCorrect === false) { $boardElement.addClass('highlight-incorrect'); }
                
                if (text.includes("Opening complete") || text.includes("Game Over") || text.includes("Computer is thinking") || text.includes("Analyzing...")) {
                    // Do not remove highlight
                } else {
                    if (thinkingProcess) clearTimeout(thinkingProcess);
                    thinkingProcess = setTimeout(() => $boardElement.removeClass('highlight-correct highlight-incorrect'), 1200);
                }
            }

            // MODIFICATION: Updated startPractice to work with the new 3-tier system
            /**
             * Starts the opening practice.
             */
            function startPractice() {
                clearArrow();
                clearHighlights();
                game = new Chess();
                currentMoveIndex = 0;
                twoPlayerModeActive = false;
                $startTwoPlayerBtn.hide();
                $evaluationDisplay.empty();

                const selectedCategory = $categorySelect.val();
                const selectedOpening = $openingSelect.val();
                const selectedVariation = $variationSelect.val();

                if (!selectedCategory || !selectedOpening || !selectedVariation ||
                    !openingBook[selectedCategory] ||
                    !openingBook[selectedCategory][selectedOpening] ||
                    !openingBook[selectedCategory][selectedOpening][selectedVariation]) {
                    console.error("No valid opening selected. Please check dropdowns.");
                    updateStatus("Error: Could not load the selected opening.", false);
                    return;
                }

                currentOpeningMoves = openingBook[selectedCategory][selectedOpening][selectedVariation];
                $statusOpening.text(`${selectedOpening}: ${selectedVariation}`);

                const boardConfig = {
                    draggable: true,
                    position: 'start',
                    onDrop: onDrop,
                    onSquareClick: onSquareClick,
                    orientation: 'white',
                    pieceTheme: 'chesspieces/wikipedia/{piece}.png'
                };
                $('#myBoard').empty();
                board = Chessboard('myBoard', boardConfig);
                $(window).off('resize').on('resize', board.resize);

                displayEvaluation(null, null, null);
                updateStatus('Practice started. Your turn (White).');
            }
            // END MODIFICATION

            /**
             * Undoes the last move.
             */
            function undoLastMove() {
                clearArrow();
                if (game.history().length === 0) {
                    updateStatus("No moves to undo!", false);
                    return;
                }

                if (currentMoveIndex < currentOpeningMoves.length) {
                    game.undo();
                    if (currentMoveIndex > 0) currentMoveIndex--;
                    updateStatus(`1 move undone.`, true);
                } else {
                    let lastMove = game.history()[game.history().length - 1];
                    game.undo();
                    updateStatus(`1 move undone.`, true);
                }
                
                board.position(game.fen());
                updateHighlights();
                if (currentMoveIndex >= currentOpeningMoves.length) {
                    $statusMove.text(`Player ${game.turn() === 'w' ? 'White' : 'Black'}'s turn.`);
                }
                displayEvaluation(null, null, null);
            }

            $undoBtn.on('click', undoLastMove);
            $startBtn.on('click', startPractice);
            $resetBtn.on('click', () => {
                clearArrow();
                clearHighlights();
                board.start();
                game.reset();
                currentMoveIndex = 0; 
                twoPlayerModeActive = false;
                $startTwoPlayerBtn.hide();
                $statusOpening.text("Board Reset");
                $statusMove.text("Select an opening and start.");
                $evaluationDisplay.empty();
                console.log('Board reset. All states cleared.');
            });

            // --- NEW: Event listeners for dynamic dropdowns ---
            $categorySelect.on('change', function() {
                const selectedCategory = $(this).val();
                populateOpenings(selectedCategory);
                // After populating openings, automatically trigger the change on the opening dropdown
                // to populate the variations for the first item in the new list.
                $openingSelect.trigger('change');
            });

            $openingSelect.on('change', function() {
                const selectedCategory = $categorySelect.val();
                const selectedOpening = $(this).val();
                populateVariations(selectedCategory, selectedOpening);
            });
            // END NEW LISTENERS

            $(window).resize(() => {
                // No-op
            });

            // Keyboard shortcuts
            $(document).keydown(function(e) {
                if (e.key === 'Escape') {
                    clearHighlights();
                    clearArrow();
                    squareSelected = null;
                    legalMovesForSelectedPiece = [];
                    updateStatus('Selection cleared. Click on a piece to select it.');
                }
            });


            // --- *** CRITICAL TOUCH FIXES BELOW *** ---

            // Remove ALL previous event listeners for squares to ensure clean slate
            $(document).off('click', '#myBoard .square-55d63');
            $(document).off('touchstart', '#myBoard .square-55d63');
            $(document).off('touchend', '#myBoard .square-55d63');

            // Global variable to track if a touch-drag is in progress
            let isDraggingTouch = false;
            let touchStartTime = 0;
            const TAP_THRESHOLD_MS = 200; // Max time for a tap to be considered a click

            // Handle touchstart for piece selection and start of drag
            $(document).on('touchstart', '#myBoard .square-55d63', function(e) {
                // IMPORTANT: Prevent default browser actions immediately for board squares
                e.preventDefault(); 
                e.stopPropagation(); // Stop propagation to avoid other listeners

                touchStartTime = Date.now();
                isDraggingTouch = false; // Assume it's a tap until proven otherwise

                const square = $(this).attr('class').match(/square-([a-h][1-8])/)?.[1];
                if (!square) return;

                // Call onSquareClick directly to handle selection
                // We'll let touchend confirm if it was a tap or drag
                onSquareClick(square); 
            });

            // Handle touchend to confirm tap or complete drag
            $(document).on('touchend', '#myBoard .square-55d63', function(e) {
                e.preventDefault(); // Prevent click event from firing after touchend
                e.stopPropagation();

                const touchDuration = Date.now() - touchStartTime;

                if (touchDuration < TAP_THRESHOLD_MS && !isDraggingTouch) {
                    // This was likely a tap, and onSquareClick already handled the selection.
                    // If it was a second tap to move, onSquareClick also handled it.
                    // No further action needed here for a simple tap.
                } else if (isDraggingTouch) {
                    // This was a drag-and-drop, chessboard.js's onDrop would have handled it.
                    // Reset dragging state.
                    isDraggingTouch = false;
                }
            });

            // Handle touchmove to detect if it's a drag
            $(document).on('touchmove', '#myBoard .square-55d63', function(e) {
                // If there's significant movement, consider it a drag
                // (More sophisticated drag detection could track initial touch point)
                isDraggingTouch = true;
                e.preventDefault(); // Prevent scrolling while dragging
            });


            // Handle click for piece selection (for desktop/mouse) - untouched from previous
            $(document).on('click', '#myBoard .square-55d63', function(e) {
                e.preventDefault();
                const square = $(this).attr('class').match(/square-([a-h][1-8])/)?.[1];
                if (square) {
                    onSquareClick(square);
                }
            });


            // Add haptic feedback for mobile (if supported) - adjusted
            if (navigator.vibrate) {
                $('.btn').on('click touchstart', function() {
                    navigator.vibrate(50);
                });
                // Vibrate specifically on piece interaction on the board
                $(document).on('touchstart', '#myBoard .square-55d63', function() {
                     navigator.vibrate(20); // Shorter vibration for board taps
                });
            }

            // Mobile-specific improvements (already in place)
            if (isTouchDevice) { // Using the refined isTouchDevice variable
                $('.btn').css('min-height', '56px');
                $('.form-select').css('min-height', '52px');
                
                $('.btn').on('touchend', function(e) {
                    e.preventDefault(); // Prevent ghost clicks
                    $(this).trigger('click');
                });

                // Prevent pinch zoom on the board container itself
                $('#myBoard').on('touchstart', function(e) {
                    if (e.touches.length > 1) {
                        e.preventDefault(); 
                    }
                });

                // Prevent text selection on mobile
                $('body').css('-webkit-touch-callout', 'none');
                $('body').css('-webkit-user-select', 'none');
                $('body').css('-khtml-user-select', 'none');
                $('body').css('-moz-user-select', 'none');
                $('body').css('-ms-user-select', 'none');
                $('body').css('user-select', 'none');
            }

            // Responsive board sizing
            function resizeBoard() {
                const container = $('.board-container');
                const containerWidth = container.width();
                const maxBoardSize = Math.min(containerWidth - 32, 500); 
                
                if (board && board.resize) {
                    board.resize();
                }
            }

            // Handle window resize
            $(window).on('resize', resizeBoard);
            resizeBoard();

            // Prevent zoom on mobile (redundant with touch-action: none and other preventDefaults, but good to have)
            document.addEventListener('gesturestart', function(e) {
                e.preventDefault();
            });

            document.addEventListener('gesturechange', function(e) {
                e.preventDefault();
            });

            document.addEventListener('gestureend', function(e) {
                e.preventDefault();
            });

            // MODIFICATION: Updated initial setup logic for the 3-tier system
            const initialConfig = {
                draggable: true,
                position: 'start',
                onDrop: onDrop,
                onSquareClick: onSquareClick,
                orientation: 'white',
                pieceTheme: 'chesspieces/wikipedia/{piece}.png'
            };
            board = Chessboard('myBoard', initialConfig);
            $(window).resize(board.resize);

            // Initial setup sequence
            populateCategories(); // First, populate the categories
            $categorySelect.trigger('change'); // This will cascade and populate the other two dropdowns
            
            // A small delay to ensure dropdowns are populated before starting
            setTimeout(() => {
                startPractice(); // Auto-start the practice with the default selected opening
            }, 100); 
            // END MODIFICATION
            

            // script.js mein add karein
            
            // update the board position after the piece snap
            // for castling, en passant, pawn promotion
        }); // End of $(function() { ... });
