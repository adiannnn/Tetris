// 游戏常量
const COLS = 16;  // 增加列数使游戏框更宽
const ROWS = 18;  // 增加行数使纵向更长
const BLOCK_SIZE = 28;  // 保持方块大小
const CANVAS_WIDTH = COLS * BLOCK_SIZE;
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE;

// 颜色定义
const COLORS = [
    '#000000',  // 空
    '#FF0D72',  // 红色
    '#0DC2FF',  // 蓝色
    '#0DFF72',  // 绿色
    '#F538FF',  // 紫色
    '#FF8E0D',  // 橙色
    '#FFE138',  // 黄色
    '#3877FF'   // 青色
];

// 方块形状定义
const SHAPES = [
    [],  // 空形状
    [[1, 1, 1, 1]],  // I型
    [[1, 1], [1, 1]],  // O型
    [[0, 1, 0], [1, 1, 1]],  // T型
    [[0, 1, 1], [1, 1, 0]],  // S型
    [[1, 1, 0], [0, 1, 1]],  // Z型
    [[1, 0, 0], [1, 1, 1]],  // L型
    [[0, 0, 1], [1, 1, 1]]   // J型
];

// 游戏变量
let canvas, ctx;
let nextCanvas, nextCtx;
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameInterval = null;
let gameSpeed = 1000;
let isPaused = false;

// 方块类
class Piece {
    constructor(type) {
        this.type = type;
        this.shape = SHAPES[type];
        this.color = COLORS[type];
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    // 旋转方块
    rotate() {
        // 转置矩阵
        const rotated = this.shape[0].map((_, index) => 
            this.shape.map(row => row[index]).reverse()
        );
        
        // 检查旋转后的位置是否合法
        const originalShape = this.shape;
        this.shape = rotated;
        
        if (this.isColliding()) {
            this.shape = originalShape;
            return false;
        }
        
        return true;
    }

    // 移动方块
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        
        if (this.isColliding()) {
            this.x -= dx;
            this.y -= dy;
            return false;
        }
        
        return true;
    }

    // 检查碰撞
    isColliding() {
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col]) {
                    const newX = this.x + col;
                    const newY = this.y + row;
                    
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 绘制方块
    draw() {
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col]) {
                    drawBlock(this.x + col, this.y + row, this.color);
                }
            }
        }
    }

    // 在预览画布上绘制方块
    drawNext() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        const offsetX = Math.floor((nextCanvas.width / BLOCK_SIZE - this.shape[0].length) / 2);
        const offsetY = Math.floor((nextCanvas.height / BLOCK_SIZE - this.shape.length) / 2);
        
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col]) {
                    nextCtx.fillStyle = this.color;
                    nextCtx.fillRect(
                        (offsetX + col) * BLOCK_SIZE,
                        (offsetY + row) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            }
        }
    }
}

// 初始化游戏板
function initBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
        }
    }
}

// 初始化画布
function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas.getContext('2d');
}

// 绘制方块
function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
}

// 绘制游戏板
function drawBoard() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(col, row, COLORS[board[row][col]]);
            }
        }
    }
}

// 生成随机方块
function getRandomPiece() {
    return new Piece(Math.floor(Math.random() * 7) + 1);
}

// 放置当前方块到游戏板
function placePiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const newY = currentPiece.y + row;
                const newX = currentPiece.x + col;
                
                if (newY >= 0) {
                    board[newY][newX] = currentPiece.type;
                }
            }
        }
    }
}

// 消除满行
function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            // 移除满行
            board.splice(row, 1);
            // 在顶部添加新行
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            row++;  // 检查同一位置的新行
        }
    }
    
    if (linesCleared > 0) {
        updateScore(linesCleared);
    }
}

// 更新分数
function updateScore(linesCleared) {
    const lineScores = [0, 40, 100, 300, 1200];
    score += lineScores[linesCleared] * level;
    lines += linesCleared;
    
    // 升级
    if (lines >= level * 10) {
        level++;
        gameSpeed = Math.max(100, 1000 - (level - 1) * 100);
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, gameSpeed);
        }
    }
    
    updateDisplay();
}

// 更新显示
function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

// 检查游戏是否结束
function checkGameOver() {
    return currentPiece && !currentPiece.move(0, 1);
}

// 游戏主循环
function gameLoop() {
    if (isPaused) return;
    
    if (!currentPiece) {
        currentPiece = nextPiece || getRandomPiece();
        nextPiece = getRandomPiece();
        nextPiece.drawNext();
        
        if (checkGameOver()) {
            endGame();
            return;
        }
    }
    
    if (!currentPiece.move(0, 1)) {
        placePiece();
        clearLines();
        currentPiece = null;
    }
    
    drawBoard();
    if (currentPiece) {
        currentPiece.draw();
    }
}

// 开始游戏
function startGame() {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameSpeed = 1000;
    isPaused = false;
    currentPiece = null;
    nextPiece = null;
    
    updateDisplay();
    drawBoard();
    
    gameInterval = setInterval(gameLoop, gameSpeed);
}

// 暂停游戏
function pauseGame() {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '继续' : '暂停';
}

// 重置游戏
function resetGame() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    
    isPaused = false;
    document.getElementById('pauseBtn').textContent = '暂停';
    startGame();
}

// 结束游戏
function endGame() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    
    alert(`游戏结束！\n分数：${score}\n等级：${level}\n消除行数：${lines}`);
}

// 移动控制函数
function moveLeft() {
    if (currentPiece && !isPaused) {
        currentPiece.move(-1, 0);
        drawBoard();
        currentPiece.draw();
    }
}

function moveRight() {
    if (currentPiece && !isPaused) {
        currentPiece.move(1, 0);
        drawBoard();
        currentPiece.draw();
    }
}

function moveDown() {
    if (currentPiece && !isPaused) {
        currentPiece.move(0, 1);
        drawBoard();
        currentPiece.draw();
    }
}

function moveUp() {
    if (currentPiece && !isPaused) {
        currentPiece.rotate();
        drawBoard();
        currentPiece.draw();
    }
}

function drop() {
    if (currentPiece && !isPaused) {
        while (currentPiece.move(0, 1)) {
            // 持续下落直到碰撞
        }
        placePiece();
        clearLines();
        currentPiece = null;
        drawBoard();
    }
}

// 键盘控制
function initControls() {
    document.addEventListener('keydown', (e) => {
        if (isPaused) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                moveLeft();
                break;
            case 'ArrowRight':
                moveRight();
                break;
            case 'ArrowDown':
                moveDown();
                break;
            case 'ArrowUp':
                moveUp();
                break;
            case ' ':
                e.preventDefault();
                drop();
                break;
        }
    });
}

// 初始化游戏
function init() {
    initCanvas();
    initBoard();
    initControls();
    updateDisplay();
    drawBoard();
}

// 页面加载完成后初始化游戏
window.addEventListener('load', init);
