/**
 * Xylozoid Multiplayer Minigames System
 * Features: Trivia, Tic-Tac-Toe, Rock-Paper-Scissors, Connect Four
 */

const { EmbedBuilder } = require('discord.js');

class MinigamesSystem {
    constructor() {
        this.activeGames = new Map();
        this.triviaQuestions = [
            { question: '¿Cuál es el planeta más grande del sistema solar?', options: ['Tierra', 'Marte', 'Júpiter', 'Saturno'], answer: 2 },
            { question: '¿Quién pintó la Mona Lisa?', options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Michelangelo'], answer: 1 },
            { question: '¿Cuál es el elemento químico con símbolo O?', options: ['Oro', 'Osmio', 'Oxígeno', 'Olivo'], answer: 2 },
            { question: '¿En qué año llegó el hombre a la luna?', options: ['1965', '1969', '1972', '1980'], answer: 1 },
            { question: '¿Cuál es el río más largo del mundo?', options: ['Nilo', 'Amazonas', 'Yangtsé', 'Misisipi'], answer: 1 },
            { question: '¿Qué país tiene forma de bota?', options: ['España', 'Grecia', 'Italia', 'Portugal'], answer: 2 },
            { question: '¿Cuántos lados tiene un hexágono?', options: ['5', '6', '7', '8'], answer: 1 },
            { question: '¿Cuál es el animal terrestre más rápido?', options: ['León', 'Guepardo', 'Tigre', 'Águila'], answer: 1 },
            { question: '¿Qué gas respiramos principalmente?', options: ['Oxígeno', 'Dióxido de carbono', 'Nitrógeno', 'Hidrógeno'], answer: 2 },
            { question: '¿Cuál es la capital de Japón?', options: ['Seúl', 'Beijing', 'Tokio', 'Bangkok'], answer: 2 }
        ];
    }

    // === TRIVIA GAME ===
    async startTrivia(interaction) {
        const guildId = interaction.guild.id;
        
        if (this.activeGames.has(`trivia-${guildId}`)) {
            return { success: false, error: 'Ya hay una partida de trivia en curso' };
        }

        const gameData = {
            type: 'trivia',
            channel: interaction.channel,
            participants: new Set([interaction.user.id]),
            currentQuestion: 0,
            scores: new Map(),
            maxQuestions: 5
        };

        gameData.scores.set(interaction.user.id, 0);

        this.activeGames.set(`trivia-${guildId}`, gameData);

        await this.sendTriviaQuestion(interaction, gameData);

        return { success: true, message: '¡Trivia iniciada!' };
    }

    async sendTriviaQuestion(interaction, gameData) {
        if (gameData.currentQuestion >= gameData.maxQuestions) {
            return this.endTrivia(interaction, gameData);
        }

        const question = this.triviaQuestions[gameData.currentQuestion % this.triviaQuestions.length];
        
        const embed = new EmbedBuilder()
            .setTitle(`🧠 Pregunta ${gameData.currentQuestion + 1}/${gameData.maxQuestions}`)
            .setDescription(question.question)
            .addFields(
                question.options.map((opt, i) => ({ name: `${i + 1}.`, value: opt, inline: true }))
            )
            .setColor('#FFD700')
            .setFooter({ text: 'Responde con el número de la opción (1-4)' })
            .setTimestamp();

        await interaction.channel.send({ embeds: [embed] });

        gameData.currentQuestion++;

        // Esperar respuesta por 30 segundos
        const filter = m => 
            gameData.participants.has(m.author.id) && 
            ['1', '2', '3', '4'].includes(m.content.trim());

        try {
            const collected = await interaction.channel.awaitMessages({ 
                filter, 
                time: 30000, 
                max: 1 
            });

            if (collected.size > 0) {
                const answer = parseInt(collected.first().content.trim()) - 1;
                const user = collected.first().author;

                if (answer === question.answer) {
                    gameData.scores.set(user.id, (gameData.scores.get(user.id) || 0) + 100);
                    await interaction.channel.send(`✅ ¡Correcto! +100 puntos para ${user.username}`);
                } else {
                    await interaction.channel.send(`❌ Incorrecto. La respuesta era: ${question.options[question.answer]}`);
                }
            } else {
                await interaction.channel.send('⏰ Tiempo agotado. Pasando a la siguiente pregunta...');
            }

            setTimeout(() => this.sendTriviaQuestion(interaction, gameData), 2000);
        } catch (error) {
            console.error('Trivia error:', error);
        }
    }

    endTrivia(interaction, gameData) {
        let winner = null;
        let maxScore = 0;

        gameData.scores.forEach((score, userId) => {
            if (score > maxScore) {
                maxScore = score;
                winner = userId;
            }
        });

        const embed = new EmbedBuilder()
            .setTitle('🏆 ¡Trivia Terminada!')
            .setDescription(winner ? `¡Felicidades <@${winner}> por ganar con ${maxScore} puntos!` : '¡Empate!')
            .addFields(
                Array.from(gameData.scores.entries()).map(([userId, score]) => ({
                    name: `<@${userId}>`,
                    value: `${score} puntos`,
                    inline: true
                }))
            )
            .setColor('#FFD700')
            .setTimestamp();

        interaction.channel.send({ embeds: [embed] });
        this.activeGames.delete(`trivia-${interaction.guild.id}`);
    }

    // === TIC-TAC-TOE ===
    async startTicTacToe(interaction, opponent) {
        const gameId = `tictactoe-${interaction.guild.id}-${Date.now()}`;
        
        if (opponent.bot) {
            return { success: false, error: 'No puedes jugar contra bots' };
        }

        const gameData = {
            type: 'tictactoe',
            channel: interaction.channel,
            players: [interaction.user.id, opponent.id],
            currentPlayer: interaction.user.id,
            board: Array(9).fill(null),
            gameActive: true
        };

        this.activeGames.set(gameId, gameData);

        await this.sendTicTacToeBoard(interaction, gameData, gameId);

        return { success: true, gameId, message: `¡Desafío enviado a ${opponent.username}!` };
    }

    async sendTicTacToeBoard(interaction, gameData, gameId) {
        const symbols = gameData.board.map(cell => cell || '⬜');
        const boardString = `
${symbols[0]} ${symbols[1]} ${symbols[2]}
${symbols[3]} ${symbols[4]} ${symbols[5]}
${symbols[6]} ${symbols[7]} ${symbols[8]}
        `.trim();

        const currentPlayer = gameData.players.find(p => p === gameData.currentPlayer);
        
        const embed = new EmbedBuilder()
            .setTitle('⭕ Tic-Tac-Toe ❌')
            .setDescription(boardString)
            .addFields({ name: 'Turno de:', value: `<@${currentPlayer}>`, inline: false })
            .setColor(currentPlayer === gameData.players[0] ? '#FF6B6B' : '#4ECDC4')
            .setFooter({ text: 'Usa /tictactoe move <posición 1-9>' });

        await interaction.channel.send({ embeds: [embed] });
    }

    makeTicTacToeMove(gameId, position, userId) {
        const gameData = this.activeGames.get(gameId);
        if (!gameData || !gameData.gameActive) {
            return { success: false, error: 'Partida no encontrada o finalizada' };
        }

        if (userId !== gameData.currentPlayer) {
            return { success: false, error: 'No es tu turno' };
        }

        if (position < 1 || position > 9 || gameData.board[position - 1] !== null) {
            return { success: false, error: 'Movimiento inválido' };
        }

        const symbol = userId === gameData.players[0] ? '⭕' : '❌';
        gameData.board[position - 1] = symbol;

        // Verificar victoria
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
            [0, 4, 8], [2, 4, 6] // diagonales
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (gameData.board[a] && gameData.board[a] === gameData.board[b] && gameData.board[a] === gameData.board[c]) {
                gameData.gameActive = false;
                return { success: true, winner: userId, gameOver: true };
            }
        }

        // Verificar empate
        if (!gameData.board.includes(null)) {
            gameData.gameActive = false;
            return { success: true, draw: true, gameOver: true };
        }

        // Cambiar turno
        gameData.currentPlayer = gameData.players.find(p => p !== userId);
        return { success: true };
    }

    // === ROCK PAPER SCISSORS ===
    async startRockPaperScissors(interaction, opponent) {
        const gameId = `rps-${interaction.guild.id}-${Date.now()}`;
        
        if (opponent.bot) {
            return { success: false, error: 'No puedes jugar contra bots' };
        }

        const gameData = {
            type: 'rps',
            channel: interaction.channel,
            players: [interaction.user.id, opponent.id],
            choices: new Map(),
            gameActive: true
        };

        this.activeGames.set(gameId, gameData);

        const embed = new EmbedBuilder()
            .setTitle('✊ Piedra, 📄 Papel, ✌️ Tijeras')
            .setDescription(`${interaction.user.username} vs ${opponent.username}`)
            .addFields(
                { name: 'Jugador 1', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Jugador 2', value: `<@${opponent.id}>`, inline: true }
            )
            .setColor('#FF6B6B')
            .setFooter({ text: 'Usa /rps play <piedra|papel|tijeras>' });

        await interaction.channel.send({ embeds: [embed] });

        return { success: true, gameId, message: '¡Juego iniciado!' };
    }

    makeRPSChoice(gameId, userId, choice) {
        const gameData = this.activeGames.get(gameId);
        if (!gameData || !gameData.gameActive) {
            return { success: false, error: 'Partida no encontrada o finalizada' };
        }

        const validChoices = ['piedra', 'papel', 'tijeras'];
        if (!validChoices.includes(choice.toLowerCase())) {
            return { success: false, error: 'Elección inválida. Usa: piedra, papel o tijeras' };
        }

        if (!gameData.players.includes(userId)) {
            return { success: false, error: 'No eres parte de esta partida' };
        }

        if (gameData.choices.has(userId)) {
            return { success: false, error: 'Ya has elegido' };
        }

        gameData.choices.set(userId, choice.toLowerCase());

        // Si ambos han elegido, determinar ganador
        if (gameData.choices.size === 2) {
            return this.determineRPSWinner(gameData);
        }

        return { success: true, message: 'Elección registrada. Esperando al otro jugador...' };
    }

    determineRPSWinner(gameData) {
        const [player1, player2] = gameData.players;
        const choice1 = gameData.choices.get(player1);
        const choice2 = gameData.choices.get(player2);

        let winner = null;
        let resultText = '';

        if (choice1 === choice2) {
            resultText = '¡Empate!';
        } else if (
            (choice1 === 'piedra' && choice2 === 'tijeras') ||
            (choice1 === 'papel' && choice2 === 'piedra') ||
            (choice1 === 'tijeras' && choice2 === 'papel')
        ) {
            winner = player1;
            resultText = `¡<@${player1}> gana!`;
        } else {
            winner = player2;
            resultText = `¡<@${player2}> gana!`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎮 Resultado')
            .setDescription(resultText)
            .addFields(
                { name: '<@' + player1 + '>', value: choice1.toUpperCase(), inline: true },
                { name: '<@' + player2 + '>', value: choice2.toUpperCase(), inline: true }
            )
            .setColor(winner ? '#FFD700' : '#808080')
            .setTimestamp();

        gameData.channel.send({ embeds: [embed] });
        gameData.gameActive = false;
        this.activeGames.delete(`rps-${gameData.channel.guild.id}-${Date.now()}`);

        return { success: true, winner, gameOver: true };
    }

    // === CONNECT FOUR ===
    async startConnectFour(interaction, opponent) {
        const gameId = `connect4-${interaction.guild.id}-${Date.now()}`;
        
        if (opponent.bot) {
            return { success: false, error: 'No puedes jugar contra bots' };
        }

        const gameData = {
            type: 'connect4',
            channel: interaction.channel,
            players: [interaction.user.id, opponent.id],
            currentPlayer: interaction.user.id,
            board: Array(6).fill(null).map(() => Array(7).fill(null)),
            gameActive: true
        };

        this.activeGames.set(gameId, gameData);

        await this.sendConnectFourBoard(interaction, gameData, gameId);

        return { success: true, gameId, message: `¡Desafío enviado a ${opponent.username}!` };
    }

    async sendConnectFourBoard(interaction, gameData, gameId) {
        const symbols = gameData.board.map(row => 
            row.map(cell => cell ? (cell === 'red' ? '🔴' : '🔵') : '⚪').join(' ')
        ).join('\n');

        const currentPlayer = gameData.players.find(p => p === gameData.currentPlayer);
        const playerColor = currentPlayer === gameData.players[0] ? '🔴' : '🔵';
        
        const embed = new EmbedBuilder()
            .setTitle('🔴 Conecta 4 🔵')
            .setDescription(symbols)
            .addFields({ name: 'Turno de:', value: `${playerColor} <@${currentPlayer}>`, inline: false })
            .setColor(currentPlayer === gameData.players[0] ? '#FF6B6B' : '#4ECDC4')
            .setFooter({ text: 'Usa /connect4 drop <columna 1-7>' });

        await interaction.channel.send({ embeds: [embed] });
    }

    dropConnectFourPiece(gameId, column, userId) {
        const gameData = this.activeGames.get(gameId);
        if (!gameData || !gameData.gameActive) {
            return { success: false, error: 'Partida no encontrada o finalizada' };
        }

        if (userId !== gameData.currentPlayer) {
            return { success: false, error: 'No es tu turno' };
        }

        if (column < 1 || column > 7) {
            return { success: false, error: 'Columna inválida (1-7)' };
        }

        const piece = userId === gameData.players[0] ? 'red' : 'blue';
        const colIndex = column - 1;

        // Encontrar la fila más baja disponible
        let rowIndex = -1;
        for (let row = 5; row >= 0; row--) {
            if (!gameData.board[row][colIndex]) {
                rowIndex = row;
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, error: 'Columna llena' };
        }

        gameData.board[rowIndex][colIndex] = piece;

        // Verificar victoria
        if (this.checkConnectFourWin(gameData.board, rowIndex, colIndex, piece)) {
            gameData.gameActive = false;
            return { success: true, winner: userId, gameOver: true };
        }

        // Verificar empate
        if (gameData.board[0].every(cell => cell !== null)) {
            gameData.gameActive = false;
            return { success: true, draw: true, gameOver: true };
        }

        // Cambiar turno
        gameData.currentPlayer = gameData.players.find(p => p !== userId);
        return { success: true };
    }

    checkConnectFourWin(board, row, col, piece) {
        // Direcciones: horizontal, vertical, diagonal \, diagonal /
        const directions = [
            [[0, -1], [0, 1]],   // horizontal
            [[-1, 0], [1, 0]],   // vertical
            [[-1, -1], [1, 1]],  // diagonal \
            [[-1, 1], [1, -1]]   // diagonal /
        ];

        for (const [dir1, dir2] of directions) {
            let count = 1;

            // Contar en una dirección
            for (let i = 1; i < 4; i++) {
                const newRow = row + dir1[0] * i;
                const newCol = col + dir1[1] * i;
                if (newRow < 0 || newRow > 5 || newCol < 0 || newCol > 6 || board[newRow][newCol] !== piece) break;
                count++;
            }

            // Contar en la otra dirección
            for (let i = 1; i < 4; i++) {
                const newRow = row + dir2[0] * i;
                const newCol = col + dir2[1] * i;
                if (newRow < 0 || newRow > 5 || newCol < 0 || newCol > 6 || board[newRow][newCol] !== piece) break;
                count++;
            }

            if (count >= 4) return true;
        }

        return false;
    }

    getActiveGame(guildId, type) {
        return this.activeGames.get(`${type}-${guildId}`);
    }

    deleteGame(gameId) {
        return this.activeGames.delete(gameId);
    }
}

module.exports = MinigamesSystem;
